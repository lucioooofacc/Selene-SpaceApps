import test from "node:test";
import assert from "node:assert/strict";

import { lolaForScenario, lolaHorizonFor } from "../src/ui/lola.js";

const synthetic = Object.assign(() => 1, {});

test("con horizonte sintético y LOLA disponible, la UI muestra vista previa", () => {
  const r = lolaForScenario({ site: { id: "chandrayaan3" }, horizon: synthetic });
  assert.equal(r.mode, "preview");
  assert.equal(r.horizon.source, "lola");
  assert.equal(r.horizon, lolaHorizonFor("chandrayaan3")); // cacheado
});

test("cuando el cálculo ya usa LOLA (CORE-01), se usa ese horizonte", () => {
  const active = Object.assign(() => 2, { source: "lola" });
  const r = lolaForScenario({ site: { id: "shackleton" }, horizon: active });
  assert.deepEqual(r, { horizon: active, mode: "active" });
});

test("sin cobertura LOLA o con un punto propio, no hay horizonte real", () => {
  for (const id of ["custom", "custom-1", undefined]) {
    assert.deepEqual(lolaForScenario({ site: { id }, horizon: synthetic }), { horizon: null, mode: "none" }, String(id));
  }
});
