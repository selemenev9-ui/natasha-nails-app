import { useEffect, useRef } from 'react';

export default function NeuralBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let lastFrame = 0;
    const FPS = 30;
    const INTERVAL = 1000 / FPS;

    const PARTICLE_COUNT = 45;
    const MAX_DIST = 140;
    const particles = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function rand(min, max) {
      return Math.random() * (max - min) + min;
    }

    function init() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: rand(0, canvas.width),
          y: rand(0, canvas.height),
          vx: rand(-0.18, 0.18),
          vy: rand(-0.18, 0.18),
          r: rand(1.2, 2.8),
          opacity: rand(0.35, 0.75)
        });
      }
    }

    function draw(ts) {
      animId = requestAnimationFrame(draw);
      const delta = ts - lastFrame;
      if (delta < INTERVAL) return;
      lastFrame = ts - (delta % INTERVAL);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.25;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(100, 180, 255, ${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140, 200, 255, ${p.opacity})`;
        ctx.fill();
      }
    }

    function handleResize() {
      resize();
      init();
    }

    resize();
    init();
    animId = requestAnimationFrame(draw);
    window.addEventListener('resize', handleResize);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.85
      }}
    />
  );
}
