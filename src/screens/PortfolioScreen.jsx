import { useState } from 'react';
import { motion } from 'framer-motion';
import SplitText from '../components/SplitText.jsx';
import Marquee from '../components/Marquee.jsx';
import LocalLazyImage from '../components/LocalLazyImage.jsx';
import { asset } from '../utils/assetUrl.js';
import styles from './PortfolioScreen.module.css';

const LANES = [
  {
    id: 'nails',
    label: 'Маникюр',
    color: 'rgba(76, 29, 149, 0.12)',
    items: [
      { title: 'Chromed Tips', description: 'металлический френч · 120 минут', accent: 'linear-gradient(135deg, #4c1d95, #a855f7)', image: '/portfolio/nails-chrome.webp' },
      { title: 'Mirror Glaze', description: 'жидкое золото · 90 минут', accent: 'linear-gradient(135deg, #b45309, #fde68a)', image: '/portfolio/nails-mirror.webp' },
      { title: 'Liquid Obsidian', description: 'черный лак с бронзой · 75 минут', accent: 'linear-gradient(135deg, #0f0f15, #78350f)', image: '/portfolio/nails-obsidian.webp' }
    ]
  },
  {
    id: 'solarium',
    label: 'Солярий',
    color: 'rgba(120, 53, 15, 0.16)',
    items: [
      { title: 'Pulse Bronze', description: '8 минут · режим evening', accent: 'linear-gradient(135deg, #78350f, #f97316)', image: '/portfolio/solarium-pulse.webp' },
      { title: 'Nordic Glow', description: '12 минут · режим delicate', accent: 'linear-gradient(135deg, #1d1f2b, #4c1d95)', image: '/portfolio/solarium-nordic.webp' },
      { title: 'After-Sun Mist', description: 'уход и охлаждение', accent: 'linear-gradient(135deg, #0f172a, #155e75)', image: '/portfolio/solarium-mist.webp' }
    ]
  },
  {
    id: 'extra',
    label: 'Дополнительно',
    color: 'rgba(255, 255, 255, 0.08)',
    items: [
      { title: 'Hand Spa', description: 'омолаживающая маска', accent: 'linear-gradient(135deg, #312e81, #4c1d95)', image: '/portfolio/extra-spa.webp' },
      { title: 'Chrome Detox', description: 'скраб + массаж', accent: 'linear-gradient(135deg, #0f0f15, #27272a)', image: '/portfolio/extra-detox.webp' },
      { title: 'Event Kit', description: 'уход за домом', accent: 'linear-gradient(135deg, #78350f, #fde68a)', image: '/portfolio/extra-kit.webp' }
    ]
  }
];

export default function PortfolioScreen() {
  const [activeLane, setActiveLane] = useState(null);

  return (
    <div className={styles.portfolio}>
      <motion.div
        className={styles.ambientGlow}
        animate={{
          background: 'radial-gradient(circle at 20% 20%, rgba(76, 29, 149, 0.45), transparent 60%), radial-gradient(circle at 80% 70%, rgba(120, 53, 15, 0.4), transparent 65%), #0a0a0c'
        }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />

      <div
        className={styles.bgOverlay}
        style={{ background: activeLane ? activeLane.color : 'transparent' }}
      />

      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.kicker}>галерея</span>
          <SplitText text="портфолио" className={styles.title} delay={0.1} />
        </div>

        {LANES.map((lane, laneIndex) => (
          <div key={lane.id}>
            {laneIndex === 1 && <Marquee reverse speed={40} />}

            <div className={styles.lane}>
              <div className={styles.laneHeader}>
                <span className={styles.laneTitle}>{lane.label}</span>
                <div
                  className={styles.laneAccent}
                  style={{
                    background: activeLane?.id === lane.id ? lane.color : 'transparent'
                  }}
                />
              </div>

              <div className={styles.laneScroll}>
                {lane.items.map((item) => (
                  <motion.div
                    key={item.title}
                    className={`${styles.card} glass-panel`}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    onTapStart={() => setActiveLane(lane)}
                  >
                    <LocalLazyImage className={styles.cardImage} src={asset(item.image)} alt={item.title} />
                    <div className={styles.cardAura} />
                    <div className={styles.cardCopy}>
                      <p>{item.title}</p>
                      <span>{item.description}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
