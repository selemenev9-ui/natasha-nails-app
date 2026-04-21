import { useEffect } from 'react';

export default function useViscousScroll(containerRef) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastScrollY = container.scrollTop;
    let rafId;
    let currentSkew = 0;

    const update = () => {
      const scrollY = container.scrollTop;
      const velocity = scrollY - lastScrollY;
      lastScrollY = scrollY;

      const targetSkew = Math.max(-6, Math.min(6, velocity * 0.8));
      currentSkew += (targetSkew - currentSkew) * 0.12;

      const cards = container.querySelectorAll('[data-viscous]');
      cards.forEach((card) => {
        card.style.transform = `skewY(${currentSkew}deg)`;
        card.style.transition =
          Math.abs(currentSkew) < 0.05
            ? 'transform 0.6s cubic-bezier(0.16,1,0.3,1)'
            : 'none';
      });

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);
}
