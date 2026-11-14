import { test } from "node:test";
import assert from "node:assert/strict";
import { windowStats } from "../src/lib/stats.js";

const scenario = (sunEl, sunVis, earthVis) => {
  const n = sunEl.length;
  return {
    windowSteps: n - 1, // la última muestra es "día extra" y no cuenta
    series: {
      sunEl: Float32Array.from(sunEl),
      sunHz: new Float32Array(n).fill(1),
      sunVis: Uint8Array.from(sunVis),
      earthEl: new Float32Array(n).fill(5),
      earthHz: new Float32Array(n).fill(2),
      earthVis: Uint8Array.from(earthVis),
    },
  };
};

test("windowStats resume solo la ventana y mide las rachas", () => {
  const st = windowStats(scenario([0, 2, 4, 6, 99], [0, 1, 1, 0, 1], [1, 0, 0, 0, 1]), 10);
  assert.equal(st.sun.elevation.mean, 3);
  assert.equal(st.sun.elevation.min, 0);
  assert.equal(st.sun.elevation.max, 6);
  assert.equal(st.sun.relief, 1);
  assert.equal(st.sun.visibleFraction, 0.5);
  assert.equal(st.longestLightMin, 20);
  assert.equal(st.longestNightMin, 10);
  assert.equal(st.longestBlackoutMin, 30);
  assert.equal(st.earth.elevation.mean, 5);
});
