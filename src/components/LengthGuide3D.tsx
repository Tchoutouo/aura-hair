"use client";

import { useEffect, useRef, useState } from "react";
import { getDict, type Lang } from "@/i18n";
import { LENGTHS } from "@/lib/types";

type Color = "noir" | "brun" | "bordeaux" | "blond";
const HAIR: Record<Color, number> = { noir: 0x1b1412, brun: 0x4a2c1d, bordeaux: 0x5e1828, blond: 0xc9a066 };

// Mannequin in inches, for a figure of about 1.65 m: crown at 65", hips around 34".
const CROWN = 65.2;
/** Where the hair ends: calibrated so 12" falls on the shoulders and 24" at the waist. */
const tipY = (length: number) => 65.5 - length;
/** Half-width of the dress form at height y (front view). */
const BODY: [number, number][] = [
  [29, 0.01], [29.3, 3.4], [29.8, 5.0], [31, 6.0], [34, 6.6], [35.5, 6.4], [38, 5.2], [40.5, 4.6], [42.5, 5.0], [45, 5.6], [47, 6.2],
  [49, 6.4], [51.5, 6.9], [52.8, 6.6], [53.6, 4.2], [54.3, 2.15], [55, 2.0], [57.5, 2.0],
];
const linearRx = (y: number) => {
  if (y <= BODY[0][0]) return BODY[0][1];
  for (let i = 1; i < BODY.length; i++) {
    const [y1, r1] = BODY[i];
    const [y0, r0] = BODY[i - 1];
    if (y <= y1) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
  }
  return BODY[BODY.length - 1][1];
};
/** Smoothed profile, so the form has no visible steps. */
const bodyRx = (y: number) => {
  if (y < 29.8) return linearRx(y);
  let sum = 0;
  for (let k = -2; k <= 2; k++) sum += linearRx(y + k * 0.35);
  return sum / 5;
};
/** Depth: the torso is flatter than wide, the neck is round. */
const bodyRz = (y: number) => bodyRx(y) * (y > 53.8 ? 0.95 : 0.6);

const HEAD = { y: 60.8, z: 0.25, rx: 3.2, ry: 4.3, rz: 3.7 };

/** Cross-section of the hair at height y: hugging the head, then falling straight from it and over the back. */
function hairRow(y: number) {
  const t = (y - HEAD.y) / HEAD.ry;
  const base = Math.sqrt(Math.max(0, 1 - t * t));
  const head = { rx: HEAD.rx * base + 0.3, rz: HEAD.rz * base + 0.3, z: HEAD.z };
  if (y >= HEAD.y) return head;
  // Below the widest part of the head the hair no longer follows the skull: it hangs.
  const lin = Math.min(1, Math.max(0, (57 - y) / 8));
  const spread = lin * lin * (3 - 2 * lin);
  return {
    rx: HEAD.rx + 0.3 + spread * 1.9,
    rz: Math.max(HEAD.rz + 0.3, HEAD.rz + 0.3 + (bodyRz(y) + 0.45 - HEAD.rz - 0.3) * spread),
    z: HEAD.z * Math.min(1, Math.max(0, (y - 52) / 8)),
  };
}

/** Phase of strand j: a cheap stable pseudo-random number in [0, 1). */
const rnd = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Curly hair is fuller, most of all halfway down, and narrower at the very end. */
const volume = (y: number, end: number, curly: boolean) => {
  if (!curly || y >= HEAD.y) return 1;
  const f = (HEAD.y - y) / Math.max(1, HEAD.y - end);
  return 1 + 0.22 * Math.sin(Math.PI * Math.min(1, f * 0.9 + 0.1));
};

/** Sides end a little higher than the middle of the back: rounded ends. */
const endFor = (phi: number, end: number) => end + ((1 - (1 + Math.cos(phi - Math.PI * 1.5)) / 2) * Math.min(2.6, (CROWN - end) * 0.11));

export default function LengthGuide3D({ lang }: { lang: Lang }) {
  const t = getDict(lang).guide;
  const mount = useRef<HTMLDivElement>(null);
  const [length, setLength] = useState(18);
  const [curly, setCurly] = useState(false);
  const [color, setColor] = useState<Color>("noir");
  const [noWebgl, setNoWebgl] = useState(false);
  // The scene lives outside React; this updates its hair.
  const setHair = useRef<((l: number, curly: boolean, color: Color) => void) | null>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const el = mount.current;
      if (disposed || !el) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        setNoWebgl(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 1, 400);
      camera.position.set(-58, 53, -48);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 45, 0);
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.minDistance = 55;
      controls.maxDistance = 110;
      controls.minPolarAngle = Math.PI * 0.25;
      controls.maxPolarAngle = Math.PI * 0.62;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      controls.autoRotate = !reduced;
      controls.autoRotateSpeed = 0.8;
      controls.addEventListener("start", () => (controls.autoRotate = false));

      scene.add(new THREE.HemisphereLight(0xfff6ea, 0x3b2230, 1.1));
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(30, 90, 40);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xf6e7c8, 1.1);
      rim.position.set(-40, 60, -60);
      scene.add(rim);

      /** Surface made of horizontal rings: x = rx·cos φ, z = z0 + rz·sin φ. */
      const rings = (rows: { y: number; rx: number; rz: number; z: number }[], phi0: number, phiLen: number, segs: number, wobble = 0) => {
        const pos: number[] = [];
        const idx: number[] = [];
        rows.forEach((r, i) => {
          for (let j = 0; j <= segs; j++) {
            const phi = phi0 + (j / segs) * phiLen;
            const w = wobble ? 1 + wobble * Math.sin(phi * 9 + r.y * 2.1) * Math.min(1, (CROWN - r.y) / 3) : 1;
            pos.push(r.rx * w * Math.cos(phi), r.y, r.z + r.rz * w * Math.sin(phi));
            if (i && j) {
              const a = (i - 1) * (segs + 1) + j - 1;
              const b = i * (segs + 1) + j - 1;
              idx.push(a, b, a + 1, b, b + 1, a + 1);
            }
          }
        });
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        return g;
      };

      const skin = new THREE.MeshStandardMaterial({ color: 0xe6d6c2, roughness: 0.8 });
      const bodyRows = [];
      for (let y = 57.5; y >= 29; y -= 0.15) bodyRows.push({ y, rx: bodyRx(y), rz: bodyRz(y), z: 0 });
      scene.add(new THREE.Mesh(rings(bodyRows, 0, Math.PI * 2, 64), skin));
      const head = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), skin);
      head.scale.set(HEAD.rx, HEAD.ry, HEAD.rz);
      head.position.set(0, HEAD.y, HEAD.z);
      scene.add(head);
      // Dress-form stand.
      const gold = new THREE.MeshStandardMaterial({ color: 0xb8893e, roughness: 0.35, metalness: 0.6 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 17, 16), gold);
      pole.position.y = 21;
      scene.add(pole);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 1, 32), gold);
      foot.position.y = 12.5;
      scene.add(foot);

      // Hair = a dark inner mass (no gaps) + strands on top for texture.
      const PHI0 = Math.PI * 0.72;
      const PHI_LEN = Math.PI * 1.56;
      const massMat = new THREE.MeshStandardMaterial({ color: HAIR.noir, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide });
      const strandMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 });
      const mass = new THREE.Mesh(new THREE.BufferGeometry(), massMat);
      const strands = new THREE.LineSegments(new THREE.BufferGeometry(), strandMat);
      scene.add(mass, strands);

      /** Inner mass: rings from the crown down, each column to its own (rounded) end. */
      const massGeometry = (end: number, isCurly: boolean) => {
        const segs = 96;
        const rowsN = Math.ceil((CROWN - end) / 0.25);
        const pos: number[] = [];
        const idx: number[] = [];
        for (let i = 0; i <= rowsN; i++)
          for (let j = 0; j <= segs; j++) {
            const phi = PHI0 + (j / segs) * PHI_LEN;
            const y = CROWN - (i / rowsN) * (CROWN - endFor(phi, end) - 0.6);
            const r = hairRow(y);
            const k = volume(y, end, isCurly);
            pos.push(r.rx * k * 0.97 * Math.cos(phi), y, r.z + r.rz * k * 0.97 * Math.sin(phi));
            if (i && j) {
              const a = (i - 1) * (segs + 1) + j - 1;
              const b = i * (segs + 1) + j - 1;
              idx.push(a, b, a + 1, b, b + 1, a + 1);
            }
          }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        return g;
      };

      /** Strands from the crown to just past the mass, each with its own shade, length and curl phase. */
      const strandGeometry = (end: number, isCurly: boolean, c: number) => {
        const base = new THREE.Color(c);
        const pos: number[] = [];
        const col: number[] = [];
        const N = 1300;
        for (let n = 0; n < N; n++) {
          const phi = PHI0 + rnd(n) * PHI_LEN;
          const lift = (isCurly ? 0.3 : 0.15) + rnd(n + 1) * (isCurly ? 0.9 : 0.5);
          const stop = endFor(phi, end) + (rnd(n + 2) - 0.6) * 1.2;
          const shade = 0.65 + rnd(n + 3) * 0.75;
          const curlA = 0.35 + rnd(n + 4) * 0.3;
          const curlF = 2.4 + rnd(n + 5) * 1.2;
          const ph = rnd(n + 6) * Math.PI * 2;
          const drift = (rnd(n + 7) - 0.5) * 0.06;
          let prev: number[] | null = null;
          for (let y = CROWN - rnd(n + 8) * 0.8; y >= stop; y -= 0.35) {
            const r = hairRow(y);
            const p = phi + drift * (CROWN - y) * 0.1;
            const k = volume(y, end, isCurly);
            let x = (r.rx * k + lift) * Math.cos(p);
            let z = r.z + (r.rz * k + lift) * Math.sin(p);
            if (isCurly) {
              // Curl in the plane tangent to the hair surface, growing below the scalp.
              const amount = curlA * Math.min(1, (CROWN - y) / 4);
              const a = y * curlF + ph;
              x += (-Math.sin(p) * Math.sin(a) + Math.cos(p) * 0.6 * Math.cos(a)) * amount;
              z += (Math.cos(p) * Math.sin(a) + Math.sin(p) * 0.6 * Math.cos(a)) * amount;
            }
            const point = [x, y, z];
            if (prev) {
              pos.push(...prev, ...point);
              const tone = Math.min(1, shade * (y > HEAD.y ? 0.85 : 1));
              col.push(base.r * tone, base.g * tone, base.b * tone, base.r * tone, base.g * tone, base.b * tone);
            }
            prev = point;
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
        return g;
      };

      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 96), gold);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);

      setHair.current = (l, isCurly, c) => {
        const end = tipY(l);
        mass.geometry.dispose();
        strands.geometry.dispose();
        mass.geometry = massGeometry(end, isCurly);
        // The mass is a shade darker than the strands, like the hair underneath.
        massMat.color.setHex(HAIR[c]).multiplyScalar(0.7);
        strands.geometry = strandGeometry(end, isCurly, HAIR[c]);
        ring.position.y = end;
        ring.scale.set(Math.max(hairRow(end).rx, bodyRx(end)) + 0.6, Math.max(hairRow(end).rz, bodyRz(end)) + 0.6, 1);
      };
      setHair.current(18, false, "noir");

      const resize = () => {
        const w = el.clientWidth;
        const h = Math.min(680, Math.round(w * 1.25));
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      let frame = 0;
      const loop = () => {
        controls.update();
        renderer.render(scene, camera);
        frame = requestAnimationFrame(loop);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(frame);
        ro.disconnect();
        controls.dispose();
        scene.traverse((o) => {
          const m = o as InstanceType<typeof THREE.Mesh>;
          m.geometry?.dispose();
        });
        renderer.dispose();
        renderer.domElement.remove();
        setHair.current = null;
      };
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    setHair.current?.(length, curly, color);
  }, [length, curly, color]);

  const pill = (active: boolean) =>
    `rounded-lg border px-3 py-2 text-sm font-semibold ${active ? "border-plum bg-plum text-gold-soft" : "border-line bg-white text-plum hover:border-plum"}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
      <div>
        {noWebgl ? (
          <div className="rounded-2xl border border-line bg-white p-5 text-sm">
            <p>{t.noWebgl}</p>
            <ul className="mt-3 space-y-1">
              {LENGTHS.map((l) => (
                <li key={l}>
                  <strong className="text-plum">{l}&quot;</strong> : {t.landmarks[l]}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div ref={mount} role="img" aria-label={t.canvas(length, t.landmarks[length])} className="overflow-hidden rounded-2xl bg-gradient-to-b from-sand to-ivory" />
            <p className="mt-2 text-center text-xs text-muted">{t.hint}</p>
          </>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="guide-length" className="text-sm font-semibold text-rust">
            {t.length}
          </label>
          <p className="font-display text-5xl font-bold text-plum">{length}&quot;</p>
          <p className="mt-1 text-lg text-ink" aria-live="polite">
            {t.landmarks[length]}
          </p>
          <input
            id="guide-length"
            type="range"
            min={LENGTHS[0]}
            max={LENGTHS[LENGTHS.length - 1]}
            step={2}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            aria-valuetext={`${length} pouces, ${t.landmarks[length]}`}
            className="mt-4 w-full accent-[#3b2230]"
          />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>{LENGTHS[0]}&quot;</span>
            <span>{LENGTHS[LENGTHS.length - 1]}&quot;</span>
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-rust">{t.texture}</legend>
          <div className="mt-2 flex gap-2">
            <button type="button" aria-pressed={!curly} onClick={() => setCurly(false)} className={pill(!curly)}>
              {t.straight}
            </button>
            <button type="button" aria-pressed={curly} onClick={() => setCurly(true)} className={pill(curly)}>
              {t.curly}
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-rust">{t.color}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(HAIR) as Color[]).map((c) => (
              <button key={c} type="button" aria-pressed={color === c} onClick={() => setColor(c)} className={`${pill(color === c)} flex items-center gap-2`}>
                <span className="h-4 w-4 rounded-full ring-1 ring-black/20" style={{ background: `#${HAIR[c].toString(16).padStart(6, "0")}` }} />
                {t.colors[c]}
              </button>
            ))}
          </div>
        </fieldset>

        <p className="text-sm text-muted">{t.note}</p>
      </div>
    </div>
  );
}
