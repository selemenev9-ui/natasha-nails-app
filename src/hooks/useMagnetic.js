import { useRef, useCallback } from 'react';

export default function useMagnetic(strength = 0.35) {
  const ref = useRef(null);

  const onMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = rect.width * 1.2;
    if (dist < radius) {
      const x = dx * strength;
      const y = dy * strength;
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.transition = 'transform 0.15s ease';
    }
  }, [strength]);

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'translate(0, 0)';
    el.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
