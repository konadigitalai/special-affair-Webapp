"use client";

import Image from "next/image";
import "./hero-artwork.css";
import { useEffect, useId, useRef, useState } from "react";

/** Separate photographic planes, rather than moving a flattened photograph. */
export default function HeroArtwork({ paused }: { paused: boolean }) {
  const scene = useRef<HTMLDivElement>(null);
  const maskId = useId();
  const [loaded, setLoaded] = useState({
    background: false,
    foreground: false,
  });
  const ready = loaded.background && loaded.foreground;

  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (paused || preference.matches) return;
      const bounds = element.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -bounds.top / bounds.height));
      element.style.setProperty("--scene-scroll", String(progress));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    preference.addEventListener("change", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      preference.removeEventListener("change", schedule);
    };
  }, [paused]);

  return (
    <div
      ref={scene}
      className={`hero-scene ${ready ? "scene-ready" : ""}`}
      aria-label="Models wearing a taupe shell jacket and black performance essentials"
      role="img"
    >
      <Image
        className="scene-poster"
        src="/images/house-hero.png"
        alt=""
        fill
        priority
        sizes="100vw"
        onLoad={() => setLoaded(value => ({ ...value, foreground: true }))}
      />
      <div className="scene-wall" aria-hidden="true">
        <Image
          src="/images/house-background-v2.png"
          alt=""
          fill
          sizes="100vw"
          onLoad={() => setLoaded((value) => ({ ...value, background: true }))}
        />
      </div>
      <div className="scene-models" aria-hidden="true">
        <div className="scene-models-entrance">
          <div className="scene-models-float">
            <svg className="scene-canvas" viewBox="0 0 1672 941" aria-hidden="true">
              <defs>
                <filter id={maskId} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
                  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -10 -10 -10 0 27.5" result="keyed" />
                  <feMorphology in="keyed" operator="erode" radius="1.5" result="edge" />
                  <feGaussianBlur in="edge" stdDeviation="0.35" result="softEdge" />
                  <feComposite in="SourceGraphic" in2="softEdge" operator="in" />
                </filter>
              </defs>
              <image href="/images/house-models-v2.png" width="1672" height="941" filter={`url(#${maskId})`} onLoad={() => setLoaded(value => ({ ...value, foreground: true }))} />
            </svg>
          </div>
        </div>
      </div>
      <div className="scene-sunlight" aria-hidden="true" />
    </div>
  );
}
