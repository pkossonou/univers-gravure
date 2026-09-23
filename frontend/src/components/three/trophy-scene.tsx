"use client";

import { ContactShadows, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BASES, FINISHES, FONTS, METALS, type TrophyConfig } from "@/lib/trophy";

/* ------------------------------------------------------------------ */
/* Texture de gravure : texte + logo dessinés en direct sur un canvas  */
/* ------------------------------------------------------------------ */

function useEngravingTexture(config: TrophyConfig, width = 1024, height = 512, background?: string) {
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [width, height]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- état initialisé après montage (API navigateur ou données serveur)
    if (!config.logoUrl) return setLogo(null);
    const img = new Image();
    img.onload = () => setLogo(img);
    img.src = config.logoUrl;
  }, [config.logoUrl]);

  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (background) {
      const g = ctx.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, "#F7E3AE");
      g.addColorStop(0.45, background);
      g.addColorStop(1, "#8E6A2C");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(60,40,10,.45)";
      ctx.lineWidth = 6;
      ctx.strokeRect(18, 18, width - 36, height - 36);
    }

    const { engraving } = config;
    const family = getComputedStyle(document.documentElement).getPropertyValue(FONTS[engraving.font].cssVar).trim() || FONTS[engraving.font].fallback;
    const lines = engraving.lines.filter((l) => l.trim());
    const hasLogo = !!logo;
    const logoH = hasLogo ? height * 0.34 : 0;
    const base = (height / Math.max(3, lines.length + 1.2)) * 0.62 * engraving.size;
    const x = engraving.align === "left" ? width * 0.1 : engraving.align === "right" ? width * 0.9 : width / 2;

    let y = (height - (logoH + lines.length * base * 1.25)) / 2;
    if (logo) {
      const ratio = logo.width / logo.height || 1;
      const w = Math.min(logoH * ratio, width * 0.6);
      const lx = engraving.align === "left" ? width * 0.1 : engraving.align === "right" ? width * 0.9 - w : (width - w) / 2;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(logo, lx, y, w, w / ratio);
      ctx.globalAlpha = 1;
      y += logoH + base * 0.2;
    }

    ctx.textAlign = engraving.align;
    ctx.textBaseline = "top";
    ctx.fillStyle = engraving.color;
    lines.forEach((line, i) => {
      const size = i === 0 ? base * 1.12 : base * 0.82;
      ctx.font = `${i === 0 ? 600 : 400} ${size}px ${family}`;
      // Ajuste pour que la ligne tienne dans la plaque
      let s = size;
      while (ctx.measureText(line).width > width * 0.84 && s > 12) {
        s -= 2;
        ctx.font = `${i === 0 ? 600 : 400} ${s}px ${family}`;
      }
      ctx.fillText(line, x, y);
      y += s * 1.28;
    });
    // eslint-disable-next-line react-hooks/immutability -- les textures three.js se mettent à jour par mutation (needsUpdate)
    texture.needsUpdate = true;
  }, [config, logo, texture, width, height, background]);

  return texture;
}

/* ------------------------------------------------------------------ */
/* Matériaux                                                           */
/* ------------------------------------------------------------------ */

function useMetal(config: TrophyConfig) {
  return useMemo(() => {
    if (config.metal === "crystal") {
      return new THREE.MeshPhysicalMaterial({
        color: METALS.crystal.color, transmission: 1, thickness: 0.8, roughness: 0.04, ior: 1.52,
        clearcoat: 1, attenuationColor: new THREE.Color("#BFDCEB"), attenuationDistance: 2.5,
      });
    }
    return new THREE.MeshPhysicalMaterial({
      color: METALS[config.metal].color,
      metalness: config.metal === "black" ? 0.55 : 1,
      roughness: FINISHES[config.finish].roughness,
      clearcoat: config.finish === "mat" ? 0 : 0.6,
      clearcoatRoughness: 0.2,
    });
  }, [config.metal, config.finish]);
}

/* ------------------------------------------------------------------ */
/* Géométries procédurales                                            */
/* ------------------------------------------------------------------ */

function Cup({ material }: { material: THREE.Material }) {
  const lathe = useMemo(() => {
    const pts = [
      [0, 0], [0.34, 0], [0.34, 0.05], [0.12, 0.1], [0.07, 0.18], [0.06, 0.5], [0.1, 0.56], [0.16, 0.6],
      [0.34, 0.72], [0.46, 0.92], [0.52, 1.16], [0.54, 1.34], [0.5, 1.34], [0.47, 1.16], [0.4, 0.95], [0.02, 0.72],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 96);
  }, []);
  return (
    <group>
      <mesh geometry={lathe} material={material} castShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.56, 1.02, 0]} rotation={[0, 0, s * -0.25]} material={material} castShadow>
          <torusGeometry args={[0.2, 0.035, 20, 48, Math.PI * 1.15]} />
        </mesh>
      ))}
    </group>
  );
}

function Star({ material }: { material: THREE.Material }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.52 : 0.22;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 4 });
    g.center();
    return g;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.35, 0]} material={material} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.7, 32]} />
      </mesh>
      <mesh geometry={geo} position={[0, 1.18, 0]} material={material} castShadow />
    </group>
  );
}

function Column({ material }: { material: THREE.Material }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]} material={material} castShadow>
        <cylinderGeometry args={[0.2, 0.22, 1, 24]} />
      </mesh>
      <mesh position={[0, 1.02, 0]} material={material} castShadow>
        <cylinderGeometry args={[0.28, 0.24, 0.06, 48]} />
      </mesh>
      <mesh position={[0, 1.3, 0]} material={material} castShadow>
        <sphereGeometry args={[0.22, 48, 32]} />
      </mesh>
    </group>
  );
}

function Crystal({ material, engraving }: { material: THREE.Material; engraving: THREE.Texture }) {
  return (
    <group position={[0, 0.72, 0]}>
      <RoundedBox args={[0.9, 1.45, 0.28]} radius={0.06} smoothness={4} material={material} castShadow />
      <mesh position={[0, 0.05, 0.142]}>
        <planeGeometry args={[0.8, 0.4]} />
        <meshBasicMaterial map={engraving} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function Medal({ material, engraving }: { material: THREE.Material; engraving: THREE.Texture }) {
  return (
    <group position={[0, 0.85, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={material} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.07, 96]} />
      </mesh>
      <mesh position={[0, 0, 0.037]}>
        <circleGeometry args={[0.46, 96]} />
        <meshStandardMaterial map={engraving} metalness={0.6} roughness={0.35} transparent />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.16, 0.85, -0.02]} rotation={[0, 0, s * 0.32]}>
          <planeGeometry args={[0.22, 1.2]} />
          <meshStandardMaterial color={s < 0 ? "#1E4F8F" : "#C23D2E"} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Plaque({ engraving, boardColor }: { engraving: THREE.Texture; boardColor: string }) {
  return (
    <group position={[0, 0.8, 0]}>
      <RoundedBox args={[1.1, 1.45, 0.08]} radius={0.03} smoothness={4} castShadow>
        <meshPhysicalMaterial color={boardColor} roughness={0.35} clearcoat={0.8} />
      </RoundedBox>
      <mesh position={[0, 0, 0.042]}>
        <planeGeometry args={[0.86, 1.18]} />
        <meshStandardMaterial map={engraving} metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Trophée complet                                                    */
/* ------------------------------------------------------------------ */

function Trophy({ config, interactive, autoRotate }: { config: TrophyConfig; interactive: boolean; autoRotate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const material = useMetal(config);
  const plate = useEngravingTexture(config, 1024, 360, "#D4AF6A");
  const face = useEngravingTexture(config, 1024, 1024, config.shape === "plaque" ? "#D4AF6A" : undefined);
  const { pointer } = useThree();
  const appear = useRef(0);

  useFrame((state, delta) => {
    if (!group.current) return;
    // Apparition progressive (échelle + montée)
    appear.current = Math.min(1, appear.current + delta * 0.9);
    const e = 1 - Math.pow(1 - appear.current, 3);
    const s = config.scale * (0.85 + 0.15 * e);
    group.current.scale.setScalar(s);
    group.current.position.y = -0.15 * (1 - e) - 0.9 * s + 0.1;

    const targetY = (autoRotate ? state.clock.elapsedTime * 0.25 : 0) + (interactive ? pointer.x * 0.6 : 0);
    const targetX = interactive ? -pointer.y * 0.12 : 0;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetY, 4, delta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 4, delta);
  });

  const hasBase = config.base !== "aucun" && config.shape !== "plaque" && config.shape !== "medal";
  const engraveOnBase = hasBase && config.engraving.placement === "socle";
  const lift = hasBase ? 0.42 : 0;

  return (
    <group ref={group}>
      {hasBase && (
        <group>
          <RoundedBox args={[0.95, 0.42, 0.95]} radius={0.02} smoothness={3} position={[0, 0.21, 0]} castShadow receiveShadow>
            <meshPhysicalMaterial color={BASES[config.base].color} roughness={config.base === "marbre" ? 0.18 : 0.45} clearcoat={config.base === "marbre" ? 1 : 0.4} />
          </RoundedBox>
          <mesh position={[0, 0.21, 0.477]}>
            <planeGeometry args={[0.8, 0.28]} />
            <meshStandardMaterial map={plate} metalness={0.9} roughness={0.22} />
          </mesh>
        </group>
      )}
      <group position={[0, lift, 0]}>
        {config.shape === "cup" && <Cup material={material} />}
        {config.shape === "star" && <Star material={material} />}
        {config.shape === "column" && <Column material={material} />}
        {config.shape === "crystal" && <Crystal material={material} engraving={engraveOnBase ? emptyTexture : face} />}
        {config.shape === "medal" && <Medal material={material} engraving={face} />}
        {config.shape === "plaque" && <Plaque engraving={face} boardColor={config.base === "marbre" ? "#141416" : "#5A2E18"} />}
      </group>
    </group>
  );
}

const emptyTexture = new THREE.Texture();

/** Suspend le rendu quand la scène sort de l'écran (batterie, CPU). */
function PauseWhenHidden({ visible }: { visible: boolean }) {
  const { setFrameloop } = useThree();
  useEffect(() => setFrameloop(visible ? "always" : "never"), [visible, setFrameloop]);
  return null;
}

export default function TrophyScene({
  config,
  interactive = true,
  autoRotate = true,
  className,
  distance = 4.6,
}: {
  config: TrophyConfig;
  interactive?: boolean;
  autoRotate?: boolean;
  className?: string;
  /** Recul de la caméra (plus grand = objet plus petit) */
  distance?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!host.current) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    io.observe(host.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={host} className={className}>
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 0.3, distance], fov: 30 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
        <PauseWhenHidden visible={visible} />
        <ambientLight intensity={0.45} />
        <spotLight position={[2.5, 4, 3]} angle={0.4} penumbra={0.8} intensity={60} castShadow color="#FFF1D6" />
        <pointLight position={[-3, 1.5, -2]} intensity={12} color="#9CC4FF" />
        {/* Environnement procédural : reflets de studio, aucun fichier HDR à télécharger */}
        <Environment resolution={256} environmentIntensity={1.35}>
          <color attach="background" args={["#141416"]} />
          <Lightformer intensity={4} position={[0, 5, -9]} scale={[10, 3, 1]} />
          <Lightformer intensity={3} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[8, 6, 1]} color="#FFF6E6" />
          <Lightformer intensity={1.5} position={[0, 0.5, 6]} scale={[6, 1.5, 1]} />
          <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[10, 2, 1]} />
          <Lightformer intensity={2} rotation-y={-Math.PI / 2} position={[5, 1, -1]} scale={[10, 2, 1]} color="#F2DDA8" />
          <Lightformer form="ring" intensity={4} position={[2, 3, 4]} scale={2} color="#ffffff" />
        </Environment>
        <Trophy config={config} interactive={interactive} autoRotate={autoRotate} />
        <ContactShadows position={[0, -0.92, 0]} opacity={0.6} scale={5} blur={2.4} far={2} />
      </Canvas>
    </div>
  );
}
