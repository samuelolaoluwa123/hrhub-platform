"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

const CARD_COUNT = 28;
const GRID_COLS = 7;

// Pre-compute each card's two states once — never allocate inside the
// render loop. "scattered" is a random starting pose (the chaos);
// "grid" is where it settles once the hero has assembled (the order).
function useCardStates() {
  return useMemo(() => {
    const cards = [];
    for (let i = 0; i < CARD_COUNT; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);

      cards.push({
        scattered: {
          position: new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 7,
            (Math.random() - 0.5) * 6
          ),
          rotation: new THREE.Euler(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          ),
        },
        grid: {
          position: new THREE.Vector3(
            (col - (GRID_COLS - 1) / 2) * 1.35,
            (row - 1.5) * 1.35,
            0
          ),
          rotation: new THREE.Euler(0, 0, 0),
        },
      });
    }
    return cards;
  }, []);
}

function Card({ data, progress }) {
  const ref = useRef();
  // Scratch objects reused every frame instead of created every frame.
  const pos = useMemo(() => new THREE.Vector3(), []);
  const rot = useMemo(() => new THREE.Euler(), []);

  useFrame(() => {
    const t = progress.current;
    pos.lerpVectors(data.scattered.position, data.grid.position, t);
    rot.set(
      THREE.MathUtils.lerp(data.scattered.rotation.x, data.grid.rotation.x, t),
      THREE.MathUtils.lerp(data.scattered.rotation.y, data.grid.rotation.y, t),
      THREE.MathUtils.lerp(data.scattered.rotation.z, data.grid.rotation.z, t)
    );
    ref.current.position.copy(pos);
    ref.current.rotation.copy(rot);
  });

  return (
    <RoundedBox ref={ref} args={[1.1, 1.4, 0.06]} radius={0.08} smoothness={4}>
      <meshStandardMaterial color="#f3e9fc" roughness={0.4} metalness={0.05} />
    </RoundedBox>
  );
}

function Scene({ scrollProgress, reducedMotion }) {
  const cards = useCardStates();
  const progress = useRef(0);
  const ambientDrift = useRef(0);

  useFrame((state, delta) => {
    // Smoothly chase the scroll-derived target instead of snapping —
    // sampled here in the render loop, not mutated from the scroll
    // handler directly, so fast scrolling doesn't stutter.
    progress.current = THREE.MathUtils.damp(
      progress.current,
      scrollProgress.current,
      6,
      delta
    );

    if (!reducedMotion) {
      ambientDrift.current += delta * 0.15;
      state.camera.position.x = Math.sin(ambientDrift.current) * 0.3;
      state.camera.lookAt(0, 0, 0);
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 4, 5]} intensity={1.2} />
      <directionalLight position={[-4, -2, -3]} intensity={0.3} color="#8224e3" />
      {cards.map((data, i) => (
        <Card key={i} data={data} progress={progress} />
      ))}
    </>
  );
}

export default function Hero3D() {
  const scrollProgress = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    function onScroll() {
      // 0 at top of hero, 1 once scrolled one viewport height —
      // this is what drives cards from "scattered" to "grid".
      const p = Math.min(window.scrollY / window.innerHeight, 1);
      scrollProgress.current = p;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 9], fov: 45 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Scene scrollProgress={scrollProgress} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
