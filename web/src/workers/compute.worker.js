/**
 * Worker de cálculo (PERF-01, DEC-047). Corre fuera del hilo principal los
 * cálculos que tardan 0,2–1 s: capas del mapa de calor (`computePolarHeatmap`)
 * y candidatas de "Mejores fechas" (`dateScenarios`).
 *
 * Usa los mismos módulos de lib/ que la página. Como el registro de datos de
 * la página no se comparte con el worker, este baja los mismos archivos (el
 * navegador los sirve desde su caché) según lo que la página ya tiene
 * cargado (`need`), para que los resultados coincidan con los de la página.
 */
import { loadEphemerides } from "../lib/ephemeris.js";
import { decodeHeatAtlas, registerHeatAtlas } from "../lib/heat-map.js";
import { decodePolarDem, registerPolarDem } from "../lib/polar-dem.js";
import { computePolarHeatmap } from "../lib/analysis.js";
import { dateScenarios } from "../lib/dates.js";
import { SITES } from "../data/sites.js";

const loaded = { ephemerides: null, heatAtlas: null, polarDem: null }; // promesas

async function fetchOk(url, kind) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return kind === "json" ? res.json() : res.arrayBuffer();
}

function ensure(base, need) {
  const jobs = [];
  if (need.ephemerides) {
    loaded.ephemerides ??= loadEphemerides(
      SITES.map((s) => s.id),
      (id) => fetchOk(`${base}data/ephemerides/${id}.json`, "json"),
    );
    jobs.push(loaded.ephemerides);
  }
  if (need.heatAtlas) {
    loaded.heatAtlas ??= (async () => {
      const b = `${base}data/terrain/heat-atlas-96`;
      const [meta, bin] = await Promise.all([fetchOk(`${b}.json`, "json"), fetchOk(`${b}.bin`)]);
      registerHeatAtlas(decodeHeatAtlas(bin, meta));
    })();
    jobs.push(loaded.heatAtlas);
  }
  if (need.polarDem) {
    loaded.polarDem ??= (async () => {
      const levels = await Promise.all(
        ["lola-polar-480m", "lola-polar-960m"].map(async (name) => {
          const b = `${base}data/terrain/${name}`;
          const [meta, bin] = await Promise.all([fetchOk(`${b}.json`, "json"), fetchOk(`${b}.bin`)]);
          return decodePolarDem(bin, meta);
        }),
      );
      registerPolarDem(levels);
    })();
    jobs.push(loaded.polarDem);
  }
  return Promise.all(jobs);
}

/** Campos del resumen que usan el ranking (lib/ranking.js) y las tarjetas de fechas. */
const slimSummary = ({ communication, illumination, sunMinutes, power, peakEarth }) => ({ communication, illumination, sunMinutes, power, peakEarth });

const TASKS = {
  heat(args) {
    const map = computePolarHeatmap(args);
    return { result: { size: map.size, values: map.values, source: map.source }, transfer: [map.values.buffer] };
  },
  dates({ site, windowDays }) {
    const res = dateScenarios(site, windowDays);
    // Solo lo que usan el ranking y las tarjetas: sin las series completas.
    const result = res && {
      coverage: res.coverage,
      items: res.items.map(({ startMs, scenario }) => ({
        startMs,
        scenario: { summary: slimSummary(scenario.summary), viability: scenario.viability },
      })),
    };
    return { result, transfer: [] };
  },
};

self.onmessage = async ({ data }) => {
  const { id, type, base, need, args } = data;
  try {
    await ensure(base, need);
    const { result, transfer } = TASKS[type](args);
    self.postMessage({ id, result }, transfer);
  } catch (error) {
    self.postMessage({ id, error: String(error?.message ?? error) });
  }
};
