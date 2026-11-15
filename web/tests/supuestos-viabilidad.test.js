/** Supuestos de viabilidad editables: baterías y comunicación mínima (DEC-083). */
import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_LIMITS,
  REQUIREMENTS,
  cleanLimit,
  currentRequirements,
  limitsAreDefault,
  limitsVersion,
  missionLimits,
  realDataVersion,
  requirementLevel,
  setMissionLimits,
  viabilityFrom,
} from "../src/lib/analysis.js";
import { missionQuery, parseLimitsQuery, parseMissionQuery } from "../src/ui/links.js";
import { t } from "../src/i18n/index.js";

const reset = () => setMissionLimits(DEFAULT_LIMITS);

test("por defecto: 24 h de baterías y 80 % de comunicación (DEC-071)", () => {
  reset();
  assert.deepEqual(missionLimits(), { batteryHours: 24, commsMinPct: 80 });
  assert.equal(limitsAreDefault(), true);
  assert.equal(currentRequirements(), REQUIREMENTS);
});

test("las baterías cambian el límite de la luz y la comunicación mínima el umbral de cumple", () => {
  reset();
  assert.equal(setMissionLimits({ batteryHours: 360, commsMinPct: 50 }), true);
  assert.equal(requirementLevel("light", 340), "mid");
  assert.equal(requirementLevel("light", 360), "mid");
  assert.equal(requirementLevel("light", 360.2), "low");
  assert.equal(requirementLevel("light", 0), "high");
  assert.equal(requirementLevel("communication", 50), "high");
  assert.equal(requirementLevel("communication", 49.9), "mid");
  // La pendiente sale de la NASA y no cambia.
  assert.equal(requirementLevel("slope", 7.9), "high");
  assert.equal(viabilityFrom({ light: 340, communication: 100 }).overall, "mid");
  reset();
  assert.equal(viabilityFrom({ light: 340, communication: 100 }).overall, "low");
  assert.equal(REQUIREMENTS.light.limit, 24, "los requisitos de referencia no se modifican");
});

test("valores inválidos o fuera de rango: se ignoran o se acotan a enteros", () => {
  reset();
  assert.equal(cleanLimit("batteryHours", "abc"), null);
  assert.equal(cleanLimit("batteryHours", ""), null);
  assert.equal(cleanLimit("batteryHours", 999), 360);
  assert.equal(cleanLimit("batteryHours", -5), 0);
  assert.equal(cleanLimit("commsMinPct", 150), 100);
  assert.equal(cleanLimit("commsMinPct", 79.6), 80);
  assert.equal(setMissionLimits({ batteryHours: "x" }), false);
  assert.equal(setMissionLimits({}), false);
  assert.deepEqual(missionLimits(), DEFAULT_LIMITS);
});

test("la versión de caché cambia con los supuestos (los cachés se recalculan)", () => {
  reset();
  const v = realDataVersion();
  setMissionLimits({ batteryHours: 48 });
  assert.notEqual(realDataVersion(), v);
  assert.equal(limitsVersion(), "b48c80");
  reset();
  assert.equal(realDataVersion(), v);
});

test("URL: solo se escriben si no son los de por defecto y se leen validados", () => {
  reset();
  const site = { id: "shackleton", lat: -89.45, lon: 129.78 };
  assert.ok(!missionQuery({ site, startMs: 0, windowDays: 2, dateChosen: false }).includes("bat="));
  setMissionLimits({ batteryHours: 360, commsMinPct: 50 });
  const q = missionQuery({ site, startMs: Date.UTC(2026, 10, 14), windowDays: 30, dateChosen: true });
  assert.deepEqual(parseLimitsQuery(q), { batteryHours: 360, commsMinPct: 50 });
  assert.equal(parseMissionQuery(q).windowDays, 30, "no altera el resto de la selección");
  reset();
  assert.deepEqual(parseLimitsQuery("?bat=abc&com=500"), { commsMinPct: 100 });
  assert.deepEqual(parseLimitsQuery("?site=x"), {});
});

test("los textos muestran los supuestos vigentes", () => {
  setMissionLimits({ batteryHours: 72, commsMinPct: 60 });
  assert.match(t("compare.thresholdText.light"), /72 h/);
  assert.match(t("compare.thresholdText.communication"), /60/);
  reset();
  assert.match(t("compare.thresholdText.light"), /24 h/);
});
