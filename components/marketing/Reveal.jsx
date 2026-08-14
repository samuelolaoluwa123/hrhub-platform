"use client";

import { useEffect, useRef, useState } from "react";

// Fades + rises an element into place the first time it enters the
// viewport. delay (ms) lets a parent stagger a group of children —
// pass i * 60 or similar for list items.
export default function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect(); // reveal is one-way, never re-hide on scroll-out
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 600ms var(--ease-out), transform 600ms var(--ease-out)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
