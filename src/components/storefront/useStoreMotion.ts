import { useEffect, type RefObject } from "react";

/** Animate on entry without hiding content before JavaScript is ready. */
export function useStoreMotion(
  root: RefObject<HTMLDivElement | null>,
  paused: boolean,
  view: string,
  catalogKey: string,
) {
  useEffect(() => {
    const store = root.current;
    if (!store) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const elements = Array.from(store.querySelectorAll<HTMLElement>(
      ".world-intro, .world-card, .section-heading, .product-card, .editorial, .exclusive-editorial, .footer-signature, .newsletter, .footer-wordmark",
    ));
    const reset = () => {
      observer?.disconnect();
      elements.forEach(element => {
        element.classList.remove("motion-enter");
        element.style.removeProperty("--reveal-delay");
      });
    };
    const setup = () => {
      reset();
      if (paused || preference.matches || !("IntersectionObserver" in window)) return;
      observer = new IntersectionObserver(entries => {
        let order = 0;
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          element.style.setProperty("--reveal-delay", `${Math.min(order++, 4) * 85}ms`);
          element.classList.add("motion-enter");
          observer?.unobserve(element);
        });
      }, { threshold: 0.08 });
      elements.forEach(element => observer?.observe(element));
    };
    setup();
    preference.addEventListener("change", setup);
    return () => {
      reset();
      preference.removeEventListener("change", setup);
    };
  }, [root, paused, view, catalogKey]);
}
