"use client";

import dynamic from "next/dynamic";

const SceneCanvas = dynamic(
  () => import("./SceneCanvas").then((mod) => mod.SceneCanvas),
  { ssr: false },
);

export function AgentField() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      <SceneCanvas />
      <div className="absolute inset-0 bg-gradient-to-b from-void/20 via-transparent to-void" />
    </div>
  );
}
