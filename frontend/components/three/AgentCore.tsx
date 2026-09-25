"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

import type { PointerState } from "./pointer-state";

type Props = {
  pointer: MutableRefObject<PointerState>;
};

export function AgentCore({ pointer }: Props) {
  const mesh = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const keyLight = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    const meshNode = mesh.current;
    if (!meshNode) return;
    const { nx, ny, vx, vy } = pointer.current;
    const t = state.clock.elapsedTime;
    const energy = Math.min(0.22, Math.hypot(vx, vy) * 1.8);

    meshNode.rotation.x = THREE.MathUtils.damp(meshNode.rotation.x, ny * 0.55 + t * 0.05, 2.4, delta);
    meshNode.rotation.y = THREE.MathUtils.damp(meshNode.rotation.y, nx * 0.7 + t * 0.18, 2.4, delta);
    const nextScale = 1.05 + energy;
    const current = meshNode.scale.x;
    const damped = THREE.MathUtils.damp(current, nextScale, 3.2, delta);
    meshNode.scale.setScalar(damped);

    if (halo.current) {
      halo.current.rotation.z = t * 0.12;
      halo.current.rotation.x = t * 0.08;
    }
    if (keyLight.current) {
      keyLight.current.position.x = THREE.MathUtils.damp(keyLight.current.position.x, nx * 3.2, 3, delta);
      keyLight.current.position.y = THREE.MathUtils.damp(keyLight.current.position.y, ny * 2.2, 3, delta);
      keyLight.current.intensity = 18 + energy * 40;
    }
  });

  return (
    <group>
      <mesh ref={mesh} position={[0, 0.1, 0]}>
        <icosahedronGeometry args={[1.15, 24]} />
        <MeshDistortMaterial
          color="#7dd3fc"
          emissive="#0ea5e9"
          emissiveIntensity={0.35}
          roughness={0.12}
          metalness={0.55}
          distort={0.42}
          speed={1.6}
          envMapIntensity={1.4}
        />
      </mesh>
      <mesh ref={halo} scale={1.55}>
        <torusGeometry args={[1.05, 0.012, 16, 180]} />
        <meshBasicMaterial color="#99f6e4" transparent opacity={0.45} />
      </mesh>
      <mesh scale={1.9} rotation={[Math.PI / 2.4, 0.4, 0.2]}>
        <torusGeometry args={[1.05, 0.006, 12, 160]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.28} />
      </mesh>
      <pointLight ref={keyLight} position={[2, 1.4, 2.2]} color="#67e8f9" intensity={22} distance={12} />
      <pointLight position={[-2.4, -1, 1.5]} color="#a78bfa" intensity={10} distance={10} />
    </group>
  );
}

export function AgentDust({ pointer }: Props) {
  const points = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const count = 420;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const r = 1.7 + Math.random() * 2.4;
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      positions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      positions[i * 3 + 2] = r * Math.cos(theta);
      speeds[i] = 0.08 + Math.random() * 0.22;
    }
    return { positions, speeds };
  }, []);

  useFrame((state, delta) => {
    const node = points.current;
    if (!node) return;
    const { nx, ny } = pointer.current;
    node.rotation.y += delta * (0.04 + nx * 0.03);
    node.rotation.x += delta * (0.02 + ny * 0.02);
    const geo = node.geometry.attributes.position;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < speeds.length; i += 1) {
      const ix = i * 3 + 1;
      geo.array[ix] = (geo.array[ix] as number) + Math.sin(t * speeds[i] + i) * 0.0015;
    }
    geo.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#e0f2fe" size={0.018} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}
