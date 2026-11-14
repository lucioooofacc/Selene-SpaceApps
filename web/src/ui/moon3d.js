/**
 * Luna en 3D para las pestañas GLOBAL y POLO SUR (UI-07, DEC-021).
 *
 * - Esfera con la textura de color LROC y el relieve LOLA (desplazamiento con
 *   escala vertical exagerada, solo ilustrativa) del CGI Moon Kit de NASA SVS.
 * - Iluminación uniforme de presentación: NO representa la luz solar real.
 * - Se renderiza a demanda (no hay bucle continuo ni rotación automática).
 * - Arrastrar = girar, rueda = acercar, flechas/+/− con el foco en el mapa.
 * - Los marcadores son los mismos elementos HTML de map.js: acá solo se
 *   reposicionan proyectando lat/lon y se ocultan si quedan del lado de atrás.
 *
 * Convención (igual que la textura equirectangular, centrada en 0°):
 *   lon 0 → +X, lon +90° E → −Z, norte → +Y.
 */
const TEXTURES = {
  color: "./nasa/lroc_color_4k.jpg",
  colorPreview: "./nasa/lroc_color_1k.jpg",
  relief: "./nasa/ldem_3_8bit.jpg",
};
const RELIEF_SCALE = 0.03; // exageración vertical ilustrativa (relieve real ≈ 0,012 del radio)
const DEG = Math.PI / 180;
// Con FOV 30° y el lienzo de toda la tarjeta (848 px, DEC-053): la Luna mide
// ~610 px a 5,3 (entre las pestañas y la caja de coordenadas) y llena la
// tarjeta a ~2,9; al máximo se ve entera y chica.
const DIST = { min: 2.1, max: 6.5 };

/** Vistas iniciales de cada pestaña: centro de la vista y distancia de la cámara. */
const VIEWS = {
  global: { lat: 0, lon: 0, dist: 5.3 },
  polar: { lat: -90, lon: 0, dist: 5.25 },
  heat: { lat: -90, lon: 0, dist: 5.25 }, // mapa físico (elevación LOLA), centrado en el polo sur
  heatCalc: { lat: -90, lon: 0, dist: 2.1 }, // capas calculadas hasta −80° (DEC-050): más cerca para que el casquete llene la vista
};

let threePromise = null;
const loadThree = () => (threePromise ??= import("three"));

export function latLonToVector(lat, lon, r = 1) {
  const la = lat * DEG;
  const lo = lon * DEG;
  return [r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo)];
}

export function vectorToLatLon(x, y, z) {
  const r = Math.hypot(x, y, z);
  return { lat: Math.asin(y / r) / DEG, lon: Math.atan2(-z, x) / DEG };
}

/**
 * Crea la vista 3D dentro de `container`.
 * @param {HTMLElement} container  elemento posicionado; recibe el canvas.
 * @param {{onPick:(lat:number, lon:number)=>void, onMove?:()=>void, onReady?:()=>void}} hooks
 */
export async function createMoon3D(container, { onPick, onMove, onReady }) {
  const THREE = await loadThree();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "moon3d-canvas";
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);

  const loader = new THREE.TextureLoader();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    displacementScale: RELIEF_SCALE,
    displacementBias: -RELIEF_SCALE / 2,
    bumpScale: 4,
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 384, 192), material);
  scene.add(moon);

  // Luz de presentación (no es el Sol real): ambiente + una luz rasante que
  // acompaña a la cámara desde arriba a la izquierda para que se lea el relieve.
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const headlight = new THREE.DirectionalLight(0xffffff, 2.6);
  const right = new THREE.Vector3();
  scene.add(headlight);

  const view = { ...VIEWS.global };
  let frame = 0;
  let width = 0;
  let height = 0;

  function placeCamera() {
    const [x, y, z] = latLonToVector(view.lat, view.lon, view.dist);
    camera.position.set(x, y, z);
    // "Arriba" = dirección al norte en el centro de la vista (en el polo, la del meridiano view.lon).
    const la = view.lat * DEG;
    const lo = view.lon * DEG;
    camera.up.set(-Math.sin(la) * Math.cos(lo), Math.cos(la), Math.sin(la) * Math.sin(lo));
    camera.lookAt(0, 0, 0);
    right.crossVectors(camera.up, camera.position).normalize(); // hacia la izquierda de la vista
    headlight.position.copy(camera.position).addScaledVector(camera.up, 2.5).addScaledVector(right, 2.5);
  }

  const projected = new THREE.Vector3();
  const toCamera = new THREE.Vector3();

  /** Reubica los marcadores HTML (data-lat / data-lon) sobre la esfera. */
  function placePins() {
    container.querySelectorAll(".pin[data-lat]").forEach((pin) => {
      const [x, y, z] = latLonToVector(Number(pin.dataset.lat), Number(pin.dataset.lon), 1.005);
      projected.set(x, y, z);
      toCamera.copy(camera.position).sub(projected);
      const facing = projected.dot(toCamera) > 0.05;
      projected.project(camera);
      pin.style.left = `${((projected.x + 1) / 2) * 100}%`;
      pin.style.top = `${((1 - projected.y) / 2) * 100}%`;
      pin.hidden = !facing;
    });
  }

  function render() {
    frame = 0;
    // En 2D (map.js pone data-mode) no se dibuja ni se tocan los marcadores.
    if (container.dataset.mode !== "3d") return;
    placeCamera();
    renderer.render(scene, camera);
    placePins();
  }

  const requestRender = () => {
    frame ||= requestAnimationFrame(render);
  };

  function resize() {
    const box = container.getBoundingClientRect();
    // offsetWidth no depende del zoom del escenario; el canvas usa ese tamaño de diseño.
    width = container.offsetWidth;
    height = container.offsetHeight;
    if (!width || !height) return;
    const scale = box.width / width || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio * scale, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  }

  // Superficies: "color" (mosaico LROC) o "physical" (elevación LOLA coloreada, UI-11).
  let surface = "color";
  let colorTex = null;
  let physicalTex = null;
  const prepare = (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  };
  const applySurface = () => {
    material.map = surface === "physical" && physicalTex ? physicalTex : colorTex;
    material.needsUpdate = true;
    requestRender();
  };

  // Texturas: primero la de 1k (rápida) y después la de 4k.
  const setColor = (tex) => {
    if (colorTex && colorTex !== tex) colorTex.dispose();
    colorTex = prepare(tex);
    applySurface();
  };
  loader.load(TEXTURES.colorPreview, (tex) => {
    if (!colorTex) setColor(tex);
    onReady?.();
  });
  loader.load(TEXTURES.color, setColor);
  loader.load(TEXTURES.relief, (tex) => {
    material.displacementMap = tex;
    material.bumpMap = tex;
    material.needsUpdate = true;
    requestRender();
  });

  // ---- Interacción ----
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let drag = null;

  function pick(clientX, clientY) {
    const box = renderer.domElement.getBoundingClientRect();
    pointer.set(((clientX - box.left) / box.width) * 2 - 1, -((clientY - box.top) / box.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(moon)[0];
    return hit ? vectorToLatLon(hit.point.x, hit.point.y, hit.point.z) : null;
  }

  function rotate(dLon, dLat) {
    view.lon = ((((view.lon + dLon + 180) % 360) + 360) % 360) - 180;
    view.lat = Math.max(-90, Math.min(90, view.lat + dLat));
    requestRender();
    onMove?.();
  }

  function zoom(factor) {
    view.dist = Math.max(DIST.min, Math.min(DIST.max, view.dist * factor));
    requestRender();
    onMove?.();
  }

  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", (event) => {
    drag = { x: event.clientX, y: event.clientY, moved: 0 };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const box = canvas.getBoundingClientRect();
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = event.clientX;
    drag.y = event.clientY;
    // Velocidad proporcional al acercamiento: arrastrar todo el ancho ≈ media vuelta.
    const k = (180 / box.width) * (view.dist / 4.3);
    rotate(-dx * k, dy * k);
  });
  canvas.addEventListener("pointerup", (event) => {
    const wasClick = drag && drag.moved < 5;
    drag = null;
    if (!wasClick) return;
    const p = pick(event.clientX, event.clientY);
    if (p) onPick(p.lat, p.lon);
  });
  canvas.addEventListener("pointercancel", () => (drag = null));
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoom(event.deltaY > 0 ? 1.08 : 1 / 1.08);
    },
    { passive: false },
  );
  canvas.addEventListener("click", (event) => event.stopPropagation());

  /** Teclado (el contenedor tiene tabindex): flechas giran, +/− acercan, Enter elige el centro. */
  function onKey(event) {
    const step = event.shiftKey ? 15 : 5;
    const keys = {
      ArrowLeft: () => rotate(-step, 0),
      ArrowRight: () => rotate(step, 0),
      ArrowUp: () => rotate(0, step),
      ArrowDown: () => rotate(0, -step),
      "+": () => zoom(1 / 1.15),
      "=": () => zoom(1 / 1.15),
      "-": () => zoom(1.15),
      Enter: () => onPick(view.lat, view.lon),
    };
    if (!keys[event.key] || event.target !== container) return;
    event.preventDefault();
    keys[event.key]();
  }
  container.addEventListener("keydown", onKey);

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  return {
    /** Cambia a la vista inicial de una pestaña ("global" o "polar"). */
    setView(name) {
      Object.assign(view, VIEWS[name] ?? VIEWS.global);
      requestRender();
    },
    /** Centra la vista en un punto sin cambiar el acercamiento. */
    centerOn(lat, lon) {
      view.lat = lat;
      view.lon = lon;
      requestRender();
    },
    /**
     * Cambia la superficie: "color" (LROC) o "physical" con el canvas de
     * elevación coloreada (equirectangular, centrado en 0°).
     */
    setSurface(name, canvas = null) {
      if (name === "physical" && canvas && physicalTex?.image !== canvas) {
        physicalTex?.dispose();
        physicalTex = prepare(new THREE.CanvasTexture(canvas));
      }
      surface = name;
      applySurface();
    },
    refreshPins: requestRender,
    resize,
    dispose() {
      observer.disconnect();
      container.removeEventListener("keydown", onKey);
      cancelAnimationFrame(frame);
      renderer.dispose();
      canvas.remove();
    },
  };
}
