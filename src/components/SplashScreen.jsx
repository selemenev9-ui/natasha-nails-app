import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animId;
    let t = 0;

    const particles = Array.from({ length: 38 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.6 + 0.5,
      opacity: Math.random() * 0.55 + 0.2,
      phase: Math.random() * Math.PI * 2
    }));

    function draw() {
      animId = requestAnimationFrame(draw);
      t += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 115) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(100, 180, 255, ${(1 - dist / 115) * 0.22})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        const tw = p.opacity * (0.55 + 0.45 * Math.sin(t * 1.8 + p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140, 200, 255, ${tw})`;
        ctx.fill();
      }
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1, ease: 'easeOut' } }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(160deg, #010910 0%, #031726 32%, #063147 68%, #0f4f69 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        pointerEvents: 'none'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, opacity: 0.9, pointerEvents: 'none' }}
      />

      <div
        style={{
          position: 'absolute',
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(40,120,200,0.18) 0%, transparent 70%)',
          filter: 'blur(24px)'
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.91 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.07, transition: { duration: 1 } }}
        transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}
      >
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: '0.5px',
            background: 'linear-gradient(90deg, transparent, rgba(140,200,255,0.55), transparent)',
            marginBottom: 16,
            transformOrigin: 'center'
          }}
        />

        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-display)',
            fontSize: 27,
            letterSpacing: '0.5em',
            paddingRight: '0.5em',
            color: 'rgba(237, 244, 255, 0.97)',
            textTransform: 'uppercase',
            textShadow: '0 0 36px rgba(100,180,255,0.45)'
          }}
        >
          NATASHA LAB
        </span>

        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 0.55, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            letterSpacing: '0.38em',
            paddingRight: '0.38em',
            color: 'rgba(140,200,255,0.8)',
            textTransform: 'uppercase',
            marginTop: 9
          }}
        >
          premium nail studio
        </motion.span>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: '0.5px',
            background: 'linear-gradient(90deg, transparent, rgba(140,200,255,0.55), transparent)',
            marginTop: 16,
            transformOrigin: 'center'
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        style={{ position: 'absolute', bottom: 72, display: 'flex', gap: 7 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.15, 0.9, 0.15], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.3, delay: i * 0.22, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'rgba(140, 200, 255, 0.75)'
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
