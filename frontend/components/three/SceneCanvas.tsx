"use client";

import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useEffect, useRef } from "react";

import { AgentCore, AgentDust } from "./AgentCore";
import type { PointerState } from "./pointer-state";

const INITIAL: PointerState = { nx: 0, ny: 0, vx: 0, vy: 0 };

export function SceneCanvas() {
  const pointer = useRef<PointerState>({ ...INITIAL });
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return undefined;

    const onMove = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = -(event.clientY / window.innerHeight) * 2 + 1;
      pointer.current.vx = nx - last.current.x;
      pointer.current.vy = ny - last.current.y;
      pointer.current.nx = nx;
      pointer.current.ny = ny;
      last.current = { x: nx, y: ny };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0, 4.6], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, background: "transparent" }}
      aria-hidden
    >
      <ambientLight intensity={0.35} />
      <AgentDust pointer={pointer} />
      <AgentCore pointer={pointer} />
      <Environment preset="city" />
    </Canvas>
  );
}
