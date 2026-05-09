import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './BeautyCard.module.css';

const MAX_TILT = 10;
const GYRO_RANGE = 24;
const GYRO_DEAD_ZONE = 0.35;
const GYRO_SMOOTHING = 0.14;
const BASELINE_SAMPLES = 12;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ChipIcon() {
  return (
    <svg width="34" height="27" viewBox="0 0 34 27" fill="none">
      <rect x="0.5" y="0.5" width="33" height="26" rx="4.5"
        fill="rgba(210,185,130,0.35)" stroke="rgba(180,148,80,0.45)" strokeWidth="1" />
      <line x1="6" y1="0.5" x2="6" y2="26.5" stroke="rgba(180,148,80,0.3)" strokeWidth="0.75" />
      <line x1="28" y1="0.5" x2="28" y2="26.5" stroke="rgba(180,148,80,0.3)" strokeWidth="0.75" />
      <line x1="0.5" y1="9" x2="33.5" y2="9" stroke="rgba(180,148,80,0.3)" strokeWidth="0.75" />
      <line x1="0.5" y1="18" x2="33.5" y2="18" stroke="rgba(180,148,80,0.3)" strokeWidth="0.75" />
      <rect x="6" y="9" width="22" height="9" rx="1.5" fill="rgba(195,162,95,0.2)" />
    </svg>
  );
}

function ContactlessIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 12a3 3 0 0 1 3-3" stroke="rgba(44,32,22,0.45)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 12a6 6 0 0 1 6-6" stroke="rgba(44,32,22,0.3)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M3 12a9 9 0 0 1 9-9" stroke="rgba(44,32,22,0.18)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.8" fill="rgba(44,32,22,0.55)" />
    </svg>
  );
}

export default function BeautyCard({ firstName, vkId, theme = 'light' }) {
  const cardRef = useRef(null);
  const gyroBaselineRef = useRef({ beta: 0, gamma: 0, ready: false });
  const gyroSamplesRef = useRef(0);
  const gyroTargetRef = useRef({ x: 0, y: 0 });
  const gyroCurrentRef = useRef({ x: 0, y: 0 });
  const gyroFrameRef = useRef(0);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isReturning, setIsReturning] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const needsPermission =
    typeof window !== 'undefined' &&
    typeof window.DeviceOrientationEvent !== 'undefined' &&
    typeof window.DeviceOrientationEvent.requestPermission === 'function';
  const [gyroReady, setGyroReady] = useState(!needsPermission);
  const [gyroDenied, setGyroDenied] = useState(false);

  useEffect(() => {
    if (!gyroReady) return undefined;

    const applyDeadZone = (value) => (Math.abs(value) < GYRO_DEAD_ZONE ? 0 : value);

    const animateToTarget = () => {
      const current = gyroCurrentRef.current;
      const target = gyroTargetRef.current;
      const nextX = current.x + (target.x - current.x) * GYRO_SMOOTHING;
      const nextY = current.y + (target.y - current.y) * GYRO_SMOOTHING;
      gyroCurrentRef.current = { x: nextX, y: nextY };
      setRotateX(nextX);
      setRotateY(nextY);
      if (Math.abs(target.x - nextX) > 0.01 || Math.abs(target.y - nextY) > 0.01) {
        gyroFrameRef.current = window.requestAnimationFrame(animateToTarget);
      } else {
        gyroFrameRef.current = 0;
      }
    };

    const startAnimation = () => {
      if (gyroFrameRef.current) return;
      gyroFrameRef.current = window.requestAnimationFrame(animateToTarget);
    };

    gyroBaselineRef.current = { beta: 0, gamma: 0, ready: false };
    gyroSamplesRef.current = 0;
    gyroTargetRef.current = { x: 0, y: 0 };
    gyroCurrentRef.current = { x: rotateX, y: rotateY };

    const onDeviceOrientation = (event) => {
      const beta = typeof event.beta === 'number' ? event.beta : 0;
      const gamma = typeof event.gamma === 'number' ? event.gamma : 0;
      if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return;
      const baseline = gyroBaselineRef.current;
      if (!baseline.ready) {
        const nextCount = gyroSamplesRef.current + 1;
        baseline.beta = baseline.beta + (beta - baseline.beta) / nextCount;
        baseline.gamma = baseline.gamma + (gamma - baseline.gamma) / nextCount;
        gyroSamplesRef.current = nextCount;
        if (nextCount >= BASELINE_SAMPLES) baseline.ready = true;
        return;
      }
      const deltaBeta = beta - baseline.beta;
      const deltaGamma = gamma - baseline.gamma;
      const mappedX = clamp(applyDeadZone(-(deltaBeta / GYRO_RANGE) * MAX_TILT), -MAX_TILT, MAX_TILT);
      const mappedY = clamp(applyDeadZone((deltaGamma / GYRO_RANGE) * MAX_TILT), -MAX_TILT, MAX_TILT);
      setIsReturning(false);
      gyroTargetRef.current = { x: mappedX, y: mappedY };
      startAnimation();
    };

    window.addEventListener('deviceorientation', onDeviceOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', onDeviceOrientation, true);
      if (gyroFrameRef.current) {
        window.cancelAnimationFrame(gyroFrameRef.current);
        gyroFrameRef.current = 0;
      }
    };
  }, [gyroReady, rotateX, rotateY]);

  const requestGyroAccess = async () => {
    if (!needsPermission || gyroReady) return;
    try {
      const state = await window.DeviceOrientationEvent.requestPermission();
      if (state === 'granted') {
        setGyroReady(true);
        setGyroDenied(false);
      } else {
        setGyroDenied(true);
      }
    } catch {
      setGyroDenied(true);
    }
  };

  const handleMouseMove = (event) => {
    const node = cardRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const nx = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    const ny = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    gyroTargetRef.current = { x: 0, y: 0 };
    gyroCurrentRef.current = { x: 0, y: 0 };
    setIsReturning(false);
    setRotateX(clamp(-ny * MAX_TILT, -MAX_TILT, MAX_TILT));
    setRotateY(clamp(nx * MAX_TILT, -MAX_TILT, MAX_TILT));
  };

  const handleMouseLeave = () => {
    setIsReturning(true);
    setRotateX(0);
    setRotateY(0);
    gyroTargetRef.current = { x: 0, y: 0 };
    gyroCurrentRef.current = { x: 0, y: 0 };
  };

  const transformStyle = useMemo(
    () => ({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      transition: isReturning ? 'transform 0.5s ease' : 'transform 0.1s ease-out',
      boxShadow: `${-rotateY * 0.7}px ${12 + rotateX * 0.7}px 44px rgba(56,40,28,0.2), 0 2px 8px rgba(56,40,28,0.09)`
    }),
    [isReturning, rotateX, rotateY]
  );

  const glareStyle = useMemo(() => {
    const percentX = clamp(((rotateY + MAX_TILT) / (2 * MAX_TILT)) * 100, 0, 100);
    const percentY = clamp(((-rotateX + MAX_TILT) / (2 * MAX_TILT)) * 100, 0, 100);
    const intensity = Math.min(1, (Math.abs(rotateX) + Math.abs(rotateY)) / (MAX_TILT * 1.2));
    return {
      background: `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0) 60%)`,
      opacity: isReturning ? 0 : intensity
    };
  }, [rotateX, rotateY, isReturning]);

  const rimStyle = useMemo(() => {
    const offsetX = clamp((-rotateY / MAX_TILT) * 14, -14, 14);
    const offsetY = clamp((rotateX / MAX_TILT) * 14, -14, 14);
    return {
      boxShadow: `inset ${offsetX}px ${offsetY}px 20px rgba(255,255,255,0.4)`
    };
  }, [rotateX, rotateY]);

  const displayName = firstName || 'Гость';
  const displayVkId = vkId ?? '000000000';

  return (
    <div
      ref={cardRef}
      className={styles.perspectiveWrap}
      style={transformStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onPointerDown={requestGyroAccess}
      onClick={() => setIsFlipped((v) => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsFlipped((v) => !v);
        }
      }}
    >
      <motion.article
        className={`${styles.card} ${theme === 'dark' ? styles.dark : styles.light}`}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 60, damping: 15, mass: 1.5 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* ── ЛИЦЕВАЯ СТОРОНА ── */}
        <div className={styles.frontFace}>
          <div className={styles.cardTopRow}>
            <span className={styles.brand}>NATASHA LAB</span>
            <ChipIcon />
          </div>

          <div className={styles.cardMiddle}>
            <span className={styles.cardSubtitle}>Liquid Pearl Club</span>
            <span className={styles.name}>{displayName}</span>
          </div>

          <div className={styles.bottomRow}>
            <span className={styles.status}>BEAUTY ID</span>
            <div className={styles.bottomRight}>
              <ContactlessIcon />
              <span className={styles.vkId}>{displayVkId}</span>
            </div>
          </div>

          <div className={styles.glare} style={glareStyle} />
          <div className={styles.rim} style={rimStyle} />

          <AnimatePresence>
            {needsPermission && !gyroReady && !gyroDenied && (
              <motion.button
                key="gyro-prompt"
                type="button"
                className={styles.gyroPrompt}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                onClick={(e) => { e.stopPropagation(); requestGyroAccess(); }}
              >
                Включить гироскоп
              </motion.button>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {gyroDenied && (
              <motion.p
                key="gyro-hint"
                className={styles.gyroHint}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                onClick={(e) => e.stopPropagation()}
              >
                Разрешите «Движение и ориентацию» в настройках браузера
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ── ОБРАТНАЯ СТОРОНА ── */}
        <div className={styles.backFace} style={{ transform: 'rotateY(180deg) translateZ(1px)' }}>
          <div className={styles.holoGlow} aria-hidden="true" />
          <div className={styles.magneticStrip} />

          <div className={styles.backTopRow}>
            <div>
              <p className={styles.backLabel}>Natasha Premium Lab</p>
              <p className={styles.backTagline}>Liquid Pearl Club</p>
            </div>
            <div className={styles.holoSeal} aria-hidden="true">NL</div>
          </div>

          <div className={styles.signaturePanel}>
            <span className={styles.signatureLabel}>Подпись</span>
            <span className={styles.signatureValue}>{displayName}</span>
          </div>

          <div className={styles.backMeta}>
            <div className={styles.metaBlock}>
              <p className={styles.metaLabel}>Beauty ID</p>
              <p className={styles.metaValue}>{displayVkId}</p>
            </div>
            <div className={styles.metaBlock}>
              <p className={styles.metaLabel}>Статус</p>
              <p className={styles.metaValue}>PREMIUM</p>
            </div>
          </div>

          <p className={styles.backHelp}>Если нашли карту — напишите @natasha_premium_lab</p>
        </div>
      </motion.article>
    </div>
  );
}
