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
  const needsPermission = typeof window !== 'undefined' && typeof window.DeviceOrientationEvent !== 'undefined' && typeof window.DeviceOrientationEvent.requestPermission === 'function';
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

        if (nextCount >= BASELINE_SAMPLES) {
          baseline.ready = true;
        }
        return;
      }

      const deltaBeta = beta - baseline.beta;
      const deltaGamma = gamma - baseline.gamma;

      const mappedX = clamp(applyDeadZone((-(deltaBeta / GYRO_RANGE) * MAX_TILT)), -MAX_TILT, MAX_TILT);
      const mappedY = clamp(applyDeadZone(((deltaGamma / GYRO_RANGE) * MAX_TILT)), -MAX_TILT, MAX_TILT);

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
  }, [gyroReady]);

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
    } catch (error) {
      console.error('Gyro permission request failed', error);
      setGyroDenied(true);
    }
  };

  const handleMouseMove = (event) => {
    const node = cardRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const nx = clamp((x / rect.width) * 2 - 1, -1, 1);
    const ny = clamp((y / rect.height) * 2 - 1, -1, 1);

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
      boxShadow: `${-rotateY * 1.1}px ${16 + rotateX * 1.1}px 34px rgba(0, 0, 0, 0.18)`
    }),
    [isReturning, rotateX, rotateY]
  );

  const glareStyle = useMemo(() => {
    const percentX = clamp(((rotateY + MAX_TILT) / (2 * MAX_TILT)) * 100, 0, 100);
    const percentY = clamp(((-rotateX + MAX_TILT) / (2 * MAX_TILT)) * 100, 0, 100);
    const intensity = Math.min(1, (Math.abs(rotateX) + Math.abs(rotateY)) / (MAX_TILT * 1.2));
    const glareColor = theme === 'dark' ? 'rgba(100, 180, 255, 0.22)' : 'rgba(255, 255, 255, 0.35)';

    return {
      background: `radial-gradient(circle at ${percentX}% ${percentY}%, ${glareColor} 0%, rgba(255, 255, 255, 0) 60%)`,
      opacity: isReturning ? 0 : intensity
    };
  }, [rotateX, rotateY, isReturning, theme]);

  const rimStyle = useMemo(() => {
    const offsetX = clamp((-rotateY / MAX_TILT) * 16, -16, 16);
    const offsetY = clamp((rotateX / MAX_TILT) * 16, -16, 16);
    const rimColor = theme === 'dark' ? 'rgba(140, 200, 255, 0.25)' : 'rgba(255, 255, 255, 0.42)';

    return {
      boxShadow: `inset ${offsetX}px ${offsetY}px 24px ${rimColor}`
    };
  }, [rotateX, rotateY, theme]);

  const displayName = firstName || 'Гость';
  const displayVkId = vkId ?? '000000000';

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  return (
    <div
      ref={cardRef}
      className={styles.perspectiveWrap}
      style={transformStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onPointerDown={requestGyroAccess}
      onClick={handleFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleFlip();
        }
      }}
    >
      <motion.article
        className={`${styles.card} ${theme === 'dark' ? styles.dark : styles.light}`}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 60, damping: 15, mass: 1.5 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
          <div className={styles.frontFace}>
            <div className={`${styles.brand} ${styles.levitate}`}>NATASHA LAB</div>
            <div className={`${styles.name} ${styles.levitate}`}>{displayName}</div>

            <div className={styles.bottomRow}>
              <span className={`${styles.status} ${styles.levitate}`}>BEAUTY ID</span>
              <span className={`${styles.vkId} ${styles.levitate}`}>{displayVkId}</span>
            </div>

            <div className={styles.glare} style={glareStyle} />
            <div className={styles.rim} style={rimStyle} />
            <div className={styles.grain} />
            <div className={styles.sweep} />

            <AnimatePresence>
              {needsPermission && !gyroReady && !gyroDenied && (
                <motion.button
                  key="gyro-prompt"
                  type="button"
                  className={styles.gyroPrompt}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  onClick={(event) => {
                    event.stopPropagation();
                    requestGyroAccess();
                  }}
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
                  onClick={(event) => event.stopPropagation()}
                >
                  Разрешите «Движение и ориентацию» в настройках браузера
                </motion.p>
              )}
            </AnimatePresence>
          </div>

        <div className={styles.backFace} style={{ transform: 'rotateY(180deg) translateZ(1px)' }}>
          <div className={styles.magneticStrip} />
          <div className={styles.backContent}>
            <p>PRIVATE MEMBER</p>
            <p className={styles.vkId}>{displayVkId}</p>
          </div>
          </div>

      </motion.article>
    </div>
  );
}
