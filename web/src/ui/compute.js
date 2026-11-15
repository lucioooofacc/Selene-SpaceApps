/**
 * Cliente del worker de cálculo y caché persistente (PERF-01, DEC-047).
 *
 * - `runInWorker(type, args)`: promesa con el resultado del worker, o null
 *   si no hay worker (navegador sin soporte o error al crearlo). Quien llama
 *   calcula entonces en el hilo principal, como antes.
 * - `persisted(key)` / `persist(key, value)`: caché en localStorage solo
 *   para resultados calculados con todos los datos reales cargados. La clave
 *   incluye el identificador del build (`__SELENE_BUILD__`), así que cada
 *   despliegue la invalida. Máximo de entradas y recuperación ante errores
 *   de cuota o almacenamiento bloqueado.
 */
import { dataStatus } from "./data-status.js";

let worker = null;
let broken = false;
let seq = 0;
const pending = new Map();

function failAll(message) {
  broken = true;
  for (const { reject } of pending.values()) reject(new Error(message));
  pending.clear();
  worker?.terminate();
  worker = null;
}

function getWorker() {
  if (broken || typeof Worker === "undefined") return null;
  if (!worker) {
    try {
      worker = new Worker(new URL("../workers/compute.worker.js", import.meta.url), { type: "module" });
    } catch {
      broken = true;
      return null;
    }
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id);
      if (!job) return;
      pending.delete(data.id);
      if (data.error) job.reject(new Error(data.error));
      else job.resolve(data.result);
    };
    worker.onerror = (event) => failAll(event.message || "error en el worker");
  }
  return worker;
}

/** Qué datos reales tiene cargados la página (el worker carga los mismos). */
export function loadedData() {
  const st = dataStatus();
  const ok = (s) => s === "ready" || s === "partial";
  return {
    ephemerides: ok(st.ephemerides.state),
    heatAtlas: st.heatAtlas.state === "ready",
    globalHeatAtlas: st.globalHeatAtlas.state === "ready",
    polarDem: st.polarDem.state === "ready",
    globalDem: st.globalDem.state === "ready",
  };
}

/** @returns {Promise<any> | null} */
export function runInWorker(type, args) {
  const w = getWorker();
  if (!w) return null;
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, type, args, need: loadedData(), base: new URL(import.meta.env.BASE_URL, location.href).href });
  });
}

// ---------------------------------------------------------------------------
// Caché persistente
// ---------------------------------------------------------------------------

const STORE_KEY = "selene-cache-v1";
const MAX_ENTRIES = 40;
/* global __SELENE_BUILD__ */
const BUILD = typeof __SELENE_BUILD__ === "string" ? __SELENE_BUILD__ : "dev";

function readStore() {
  try {
    const store = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
    return store?.build === BUILD && store.entries ? store : { build: BUILD, entries: {} };
  } catch {
    return { build: BUILD, entries: {} };
  }
}

export function persisted(key) {
  return readStore().entries[key]?.value ?? null;
}

export function persist(key, value) {
  const store = readStore();
  store.entries[key] = { at: Date.now(), value };
  const keys = Object.keys(store.entries);
  if (keys.length > MAX_ENTRIES) {
    keys.sort((a, b) => store.entries[a].at - store.entries[b].at);
    for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete store.entries[k];
  }
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Cuota llena o almacenamiento bloqueado: se vacía y se sigue sin caché.
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* sin almacenamiento */
    }
  }
}
