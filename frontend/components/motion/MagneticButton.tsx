"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { useRef, type MouseEvent, type ReactNode } from "react";

type Props = {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  type?: "button" | "submit";
};

export function MagneticButton({ href, onClick, children, className = "", type = "button" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 });

  function onMove(event: MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    x.set(dx * 0.28);
    y.set(dy * 0.28);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  const inner = (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-cyan-200/30 bg-white/10 px-6 py-3 text-sm font-medium text-mist shadow-neon backdrop-blur-xl transition-colors hover:bg-white/16 ${className}`}
    >
      {children}
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">
        {inner}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className="inline-block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">
      {inner}
    </button>
  );
}
