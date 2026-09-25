"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

export function MuteLoopVideo({
  src,
  poster,
  className = "",
  label,
}: {
  src: string;
  poster: string;
  className?: string;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      node.pause();
      return undefined;
    }
    void node.play().catch(() => undefined);
    return undefined;
  }, [src]);

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      aria-label={label}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

export function ReportStill({ src, title, body }: { src: string; title: string; body: string }) {
  return (
    <figure className="glass overflow-hidden rounded-3xl">
      <div className="relative aspect-video">
        <Image src={src} alt={title} fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
      </div>
      <figcaption className="px-4 py-3">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">{body}</p>
      </figcaption>
    </figure>
  );
}
