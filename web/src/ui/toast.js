/**
 * Aviso breve abajo de la pantalla para confirmar acciones (DEC-043): "sitio
 * agregado", "enlace copiado", etc. Un solo aviso a la vez, anunciado por
 * lectores de pantalla (aria-live). Sin animación si se pidió menos
 * movimiento (lo resuelve el CSS con `data-motion`).
 */
let el = null;
let timer = 0;

export function toast(message, { ms = 3500 } = {}) {
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove("is-visible"), ms);
}
