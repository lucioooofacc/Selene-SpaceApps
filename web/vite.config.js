import { resolve } from "node:path";
import { defineConfig } from "vite";

// base "./" permite publicar el build en cualquier subcarpeta (GitHub Pages, Netlify, Drive).
// Dos páginas: misión (index.html) y comparación detallada (compare.html, UI-05).
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        compare: resolve(import.meta.dirname, "compare.html"),
      },
    },
  },
});
