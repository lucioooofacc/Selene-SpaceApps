import { resolve } from "node:path";
import { defineConfig } from "vite";

// base "./" permite publicar el build en cualquier subcarpeta (GitHub Pages, Netlify, Drive).
// Dos páginas: misión (index.html) y comparación detallada (compare.html, UI-05).
export default defineConfig({
  base: "./",
  // Identificador del build: invalida la caché persistente de resultados en cada despliegue (PERF-01, DEC-047).
  define: { __SELENE_BUILD__: JSON.stringify(String(Date.now())) },
  worker: { format: "es" },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        compare: resolve(import.meta.dirname, "compare.html"),
      },
    },
  },
});
