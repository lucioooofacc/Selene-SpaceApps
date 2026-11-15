/** Viabilidad por requisitos de misión (VIAB-01, DEC-071). */
import test from "node:test";
import assert from "node:assert/strict";

import { REQUIREMENTS, requirementLevel, viabilityFrom, viabilityRank, withSlope } from "../src/lib/analysis.js";

test("luz continua: sin noche cumple, hasta 24 h al límite, más no cumple", () => {
  assert.equal(requirementLevel("light", 0), "high");
  assert.equal(requirementLevel("light", 0.17), "mid");
  assert.equal(requirementLevel("light", 24), "mid");
  assert.equal(requirementLevel("light", 24.2), "low");
});

test("comunicación: desde 80 % cumple; por debajo, al límite con relevo (nunca no cumple)", () => {
  assert.equal(requirementLevel("communication", 80), "high");
  assert.equal(requirementLevel("communication", 79.9), "mid");
  assert.equal(requirementLevel("communication", 0), "mid");
});

test("pendiente: menos de 8° cumple, menos de 10° al límite (límites estrictos)", () => {
  assert.equal(requirementLevel("slope", 7.99), "high");
  assert.equal(requirementLevel("slope", 8), "mid");
  assert.equal(requirementLevel("slope", 9.99), "mid");
  assert.equal(requirementLevel("slope", 10), "low");
});

test("la viabilidad global es la del peor requisito y cuenta los cumplidos", () => {
  const ok = viabilityFrom({ light: 0, communication: 95 });
  assert.deepEqual([ok.overall, ok.met, ok.total], ["high", 2, 2]);
  const relay = viabilityFrom({ light: 0, communication: 10 });
  assert.deepEqual([relay.overall, relay.met], ["mid", 1]);
  const night = viabilityFrom({ light: 300, communication: 100 });
  assert.deepEqual([night.overall, night.met], ["low", 1]);
  assert.ok(viabilityRank(ok) > viabilityRank(relay) && viabilityRank(relay) > viabilityRank(night));
  assert.equal(viabilityFrom({ light: NaN, communication: 90 }).total, 1, "un valor no finito no se evalúa");
});

test("withSlope suma la pendiente como tercer requisito, solo si es un número", () => {
  const base = viabilityFrom({ light: 0, communication: 90 });
  assert.equal(withSlope(base, null), base);
  const steep = withSlope(base, 12);
  assert.deepEqual([steep.overall, steep.met, steep.total], ["low", 2, 3]);
  assert.equal(steep.criteria.slope.value, 12);
  assert.equal(withSlope(base, 3).overall, "high");
});

test("los requisitos declaran su fuente", () => {
  assert.deepEqual(Object.keys(REQUIREMENTS), ["light", "communication", "slope"]);
  for (const r of Object.values(REQUIREMENTS)) assert.ok(r.source && r.unit);
});
