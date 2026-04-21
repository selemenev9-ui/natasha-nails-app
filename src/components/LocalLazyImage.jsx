import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import styles from './LocalLazyImage.module.css';

export default function LocalLazyImage({ src, alt = '', className = '' }) {
  const containerRef = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.1
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsLoaded(false);
  }, [src]);

  return (
    <div ref={containerRef} className={`${styles.wrapper} ${className}`}>
      <motion.div
        aria-hidden
        className={styles.placeholder}
        animate={isLoaded ? { opacity: 0 } : { opacity: [0.25, 0.8, 0.25] }}
        transition={{ duration: 1.6, repeat: isLoaded ? 0 : Infinity, ease: 'easeInOut' }}
      />
      {isInView ? (
        <motion.img
          src={src}
          alt={alt}
          loading="lazy"
          className={styles.image}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          onLoad={() => setIsLoaded(true)}
        />
      ) : null}
    </div>
  );
}
