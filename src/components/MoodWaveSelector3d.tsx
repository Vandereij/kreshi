"use client";
import React, {
  useRef,
  useMemo,
  Suspense,
  useEffect,
  useCallback,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import vertexShader from "../shaders/vertexShader.glsl";
import fragmentShader from "../shaders/fragmentShader.glsl";

// --- Helper Functions ---
const getCoordsOnCircle = (angle: number, radius: number) => {
  const radians = (angle - 90) * (Math.PI / 180);
  return { x: radius * Math.cos(radians), y: radius * Math.sin(radians) };
};

const angleToMood = (angle: number, moods: string[]): string => {
  const clampedAngle = Math.max(0, Math.min(angle, 360));
  const normalized = clampedAngle / 360;
  const index = Math.round(normalized * (moods.length - 1));
  return moods[index] || moods[0];
};

const moodToAngle = (mood: string | null, moods: string[]): number => {
  if (!mood) return 0;
  const index = moods.indexOf(mood);
  if (index === -1) return 0;
  return (index / (moods.length - 1)) * 360;
};

const shortestAngleDelta = (fromDeg: number, toDeg: number) =>
  ((toDeg - fromDeg + 540) % 360) - 180;

interface SceneProps {
  moods: string[];
  targetAngle: React.RefObject<number>;
}

// sRGB -> linear helper
const srgb = (hex: string) => new THREE.Color(hex).convertSRGBToLinear();
const lerped = (a: THREE.Color, b: THREE.Color, t: number) =>
  a.clone().lerp(b, t);

const paletteAtAngle = (
  angleDeg: number,
  moods: string[],
  palettes: Record<
    string,
    { color1: THREE.Color; color2: THREE.Color; color3: THREE.Color; color4: THREE.Color }
  >
) => {
  const n = moods.length;
  if (n === 0) {
    const p = palettes.okay;
    return { color1: p.color1, color2: p.color2, color3: p.color3, color4: p.color4 };
  }
  const u = (Math.max(0, Math.min(angleDeg, 360)) / 360) * (n - 1);
  const i0 = Math.floor(u);
  const i1 = (i0 + 1) % n;
  const t = u - i0;

  const p0 = palettes[(moods[i0] ?? "okay").toLowerCase()] ?? palettes.okay;
  const p1 = palettes[(moods[i1] ?? "okay").toLowerCase()] ?? palettes.okay;

  return {
    color1: lerped(p0.color1, p1.color1, t),
    color2: lerped(p0.color2, p1.color2, t),
    color3: lerped(p0.color3, p1.color3, t),
    color4: lerped(p0.color4, p1.color4, t),
  };
};

// --- Contact shadow shaders (fast, soft, tinted) ---
const contactShadowVS = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const contactShadowFS = `
  varying vec2 vUv;
  uniform vec3  uColor;
  uniform float uOpacity;
  uniform float uSoftness; // higher = blurrier
  uniform float uRadius;   // normalized (0..0.8 good range)
  uniform float uAspect;   // handle non-square plane (keeps circle round)

  void main() {
    // center at 0.5,0.5; compensate for aspect so circle stays round
    vec2 p = (vUv - 0.5) * 2.0;
    p.x *= uAspect;

    float r = length(p);
    float q = r / max(uRadius, 1e-4);

    // Gaussian-like falloff
    float alpha = exp(-q*q * max(uSoftness, 1e-4));

    gl_FragColor = vec4(uColor, uOpacity * alpha);
  }
`;

const Scene: React.FC<SceneProps> = ({ moods, targetAngle }) => {
  const { gl } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const handleGroupRef = useRef<THREE.Group>(null!);

  const SPHERE_RADIUS = 1.5;
  const GROUND_Y = -SPHERE_RADIUS - 0.02; // just below sphere

  // visual angle that eases to target
  const visualAngle = useRef<number>(targetAngle.current ?? 0);

  const moodColorPalettes = useMemo(
    () => ({
      awful: { color1: srgb("#6c63ff"), color2: srgb("#8c7bff"), color3: srgb("#b8aaff"), color4: srgb("#e0d7ff") },
      bad:   { color1: srgb("#5dade2"), color2: srgb("#85c1e9"), color3: srgb("#aed6f1"), color4: srgb("#d6eaf8") },
      okay:  { color1: srgb("#48c9b0"), color2: srgb("#73d7be"), color3: srgb("#a2e3cb"), color4: srgb("#d1f2eb") },
      good:  { color1: srgb("#f5b041"), color2: srgb("#f8c471"), color3: srgb("#fad7a0"), color4: srgb("#fdebd0") },
      great: { color1: srgb("#f1948a"), color2: srgb("#f5b7b1"), color3: srgb("#fadbd8"), color4: srgb("#fde2e0") },
    }),
    []
  );

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      color1: { value: srgb("#40666f") },
      color2: { value: srgb("#cc7a73") },
      color3: { value: srgb("#e6bf59") },
      color4: { value: srgb("#334d80") },
      shadowStrength: { value: 0.7 },
      shadowSoftness: { value: 0.45 },
    }),
    []
  );

  // Contact shadow uniforms
  const contactU = useMemo(
    () => ({
      uColor:   { value: new THREE.Color(0x000000) },
      uOpacity: { value: 0.4 },
      uSoftness:{ value: 12.0 },   // 6–12 = nice blur
      uRadius:  { value: 0.4 },  // soft spot size
      uAspect:  { value: 4.0 },
    }),
    []
  );

  // renderer config (no shadow maps needed)
  useEffect(() => {
    const renderer = gl as THREE.WebGLRenderer;
    renderer.shadowMap.enabled = false;

    const canvas = renderer.domElement;
    const onRestore = () => {
      if (materialRef.current) materialRef.current.needsUpdate = true;
    };
    canvas.addEventListener("webglcontextrestored", onRestore as EventListener);
    return () => canvas.removeEventListener("webglcontextrestored", onRestore as EventListener);
  }, [gl]);

  const LERP_SPEED = 8;

  useFrame(({ clock, size }, delta) => {
    const t = clock.getElapsedTime();
    const dt = Math.min(delta ?? 0.016, 0.05);
    const alpha = 1 - Math.exp(-LERP_SPEED * dt);

    uniforms.time.value = t;

    const angleNow = targetAngle.current ?? 0;
    const targetPalette = paletteAtAngle(angleNow, moods, moodColorPalettes);

    (uniforms.color1.value as THREE.Color).lerp(targetPalette.color1, alpha);
    (uniforms.color2.value as THREE.Color).lerp(targetPalette.color2, alpha);
    (uniforms.color3.value as THREE.Color).lerp(targetPalette.color3, alpha);
    (uniforms.color4.value as THREE.Color).lerp(targetPalette.color4, alpha);

    const deltaDeg = shortestAngleDelta(visualAngle.current, angleNow);
    visualAngle.current =
      Math.abs(deltaDeg) > 0.001 ? (visualAngle.current + deltaDeg * alpha + 360) % 360 : angleNow;

    if (handleGroupRef.current) {
      const { x, y } = getCoordsOnCircle(visualAngle.current, SPHERE_RADIUS);
      handleGroupRef.current.position.set(x, y, 0.01);
    }

    // Update contact shadow tint (blend color2 & color3, then desaturate/darken a bit)
    const c2 = uniforms.color2.value as THREE.Color;
    const c3 = uniforms.color3.value as THREE.Color;
    const tint = c2.clone().lerp(c3, 0.5);
    const hsl = { h: 0, s: 0, l: 0 } as any;
    tint.getHSL(hsl);
    tint.setHSL(hsl.h, hsl.s * 0.55, hsl.l * 0.45);

    (contactU.uColor.value as THREE.Color).lerp(tint, 0.25);

    // Keep the shadow circle round regardless of canvas aspect
    contactU.uAspect.value = size.width / size.height;
  });

  return (
    <>
      {/* Optional subtle background to better see the shadow */}
      {/* <color attach="background" args={["#0c1016"]} /> */}

      {/* Simple lights (no shadow maps) */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[0, 5, 2]} intensity={0.9} />

      {/* Sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[SPHERE_RADIUS, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>

      {/* Ring */}
      <mesh>
        <torusGeometry args={[SPHERE_RADIUS, 0.012, 16, 100]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.25} depthTest={false} />
      </mesh>

      {/* Handle */}
      <group ref={handleGroupRef}>
        <mesh position={[0, 0, -0.02]}>
          <circleGeometry args={[0.15, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.2} depthTest={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.12, 32]} />
          <meshBasicMaterial color="#ffffff" depthTest={false} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <circleGeometry args={[0.06, 32]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.3} depthTest={false} />
        </mesh>
      </group>

      {/* --- FAKE CONTACT SHADOW (always visible, super soft, tinted) --- */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]} // flat on XZ
        position={[0, GROUND_Y, 0]}     // just under the sphere
        renderOrder={-1}                // draw early for stable blending
      >
        {/* Bigger than the canvas so it never clips */}
        <planeGeometry args={[12, 12]} />
        <shaderMaterial
          vertexShader={contactShadowVS}
          fragmentShader={contactShadowFS}
          uniforms={contactU as any}
          transparent
          depthWrite={false}
        />
      </mesh>
    </>
  );
};

// --- Main Component (unchanged except Canvas flags) ---
interface MoodWaveSelectorProps {
  moods: string[];
  moodLabels: { [key: string]: string };
  value: string | null;
  onChange: (mood: string) => void;
}

export const MoodWaveSelector3D: React.FC<MoodWaveSelectorProps> = ({
  moods,
  moodLabels,
  value,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null!);
  const isDraggingRef = useRef(false);
  const targetAngle = useRef(moodToAngle(value, moods));

  useEffect(() => {
    targetAngle.current = moodToAngle(value, moods);
  }, [value, moods]);

  const updateAngleFromEvent = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = e.clientX - centerX;
    const y = -(e.clientY - centerY);
    let newAngle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (newAngle < 0) newAngle += 360;
    targetAngle.current = newAngle;
    const newMood = angleToMood(newAngle, moods);
    if (value !== newMood) onChange(newMood);
  }, [moods, onChange, value]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateAngleFromEvent(e);
  }, [updateAngleFromEvent]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    updateAngleFromEvent(e);
  }, [updateAngleFromEvent]);

  const selectedMoodLabel = moodLabels[value || ""] || "Select Mood";

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-[26px] font-extrabold text-dark-text mb-4">
        Today I'm feeling <span className="lowercase">{selectedMoodLabel}</span>
      </h2>
      <div
        ref={containerRef}
        className="w-[300px] h-[300px] relative cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <div className="absolute" style={{ inset: "-50px" }} />
        <Suspense fallback={<div className="w-full h-full bg-gray-200 rounded-full animate-pulse" />}>
          <Canvas
            // No shadow maps needed
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            camera={{ fov: 20, position: [0, 0, 10] }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
            onCreated={({ gl }) => {
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.toneMappingExposure = 1.25;
            }}
          >
            <Scene moods={moods} targetAngle={targetAngle} />
          </Canvas>
        </Suspense>
      </div>
    </div>
  );
};
