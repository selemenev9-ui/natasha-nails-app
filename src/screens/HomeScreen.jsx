import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Marquee from '../components/Marquee.jsx';
import ServiceDrawer from '../components/ServiceDrawer.jsx';
import { useVK } from '../contexts/VKContext.jsx';
import styles from './HomeScreen.module.css';

const CATEGORIES = [
  { id: 'nails', label: 'Маникюр' },
  { id: 'solarium', label: 'Солярий' },
  { id: 'extra', label: 'Дополнительно' }
];

const SERVICES_DATA = {
  nails: {
    title: 'Chrome Couture Маникюр',
    description:
      'Аппаратные техники, жидкие металлы и сложные покрытия под цвет вашего гардероба. Каждое покрытие фиксируется в карте клиента.',
    price: 'от 2 200 ₽',
    link: ''
  },
  solarium: {
    title: 'Natasha Solarium Program',
    description:
      'Индивидуальные протоколы загара с подбором фильтров, SPF-этикета и режимов после солнечного бара. Золотистый оттенок без перегрева.',
    price: 'от 1 500 ₽',
    link: ''
  },
  extra: {
    title: 'Дополнительные ритуалы',
    description:
      'Спа для рук, массаж кистей и экспресс-уходы, которые усиливают основной визит. Созданы для длинных вечеров и премиальных событий.',
    price: 'от 900 ₽',
    link: ''
  }
};

export default function HomeScreen() {
  const { triggerHaptic } = useVK();
  const [activeCategory, setActiveCategory] = useState('nails');
  const [activeService, setActiveService] = useState(null);
  const [timeTint, setTimeTint] = useState('rgba(0,0,0,0)');
  const now = new Date();
  const localizedDate = now.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  useEffect(() => {
    const h = new Date().getHours();
    let tint;
    if (h >= 5 && h < 11) {
      tint = 'rgba(212, 197, 179, 0.15)';
    } else if (h >= 11 && h < 17) {
      tint = 'rgba(247, 245, 240, 0.2)';
    } else if (h >= 17 && h < 21) {
      tint = 'rgba(140, 122, 107, 0.15)';
    } else {
      tint = 'rgba(28, 27, 26, 0.05)';
    }
    setTimeTint(tint);
  }, []);

  useEffect(() => {
    if (!activeService) return undefined;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [activeService]);

  const handleCategorySelect = (id) => {
    triggerHaptic('light');
    setActiveCategory(id);
    setActiveService(id);
  };

  return (
    <div className={styles.home}>
      <div className={styles.heroPhoto}>
        <div className={styles.heroBackdrop} aria-hidden="true" />
        <div className={styles.heroNoise} aria-hidden="true" />
        <div className={styles.heroFade} />
        <div
          className={styles.heroTint}
          style={{ background: timeTint }}
        />
        <div className={styles.logoCenter}>NATASHA NAILS LAB</div>
        <span className={styles.datePill}>{localizedDate}</span>

        <div className={styles.content}>
          <div className={styles.categories}>
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className={`${styles.categoryChip} glass-panel ${activeCategory === cat.id ? `${styles.categoryActive} glass-panel-active` : ''}`}
                onClick={() => handleCategorySelect(cat.id)}
              >
                {cat.label}
              </motion.button>
            ))}
          </div>

          <Marquee speed={30} />
        </div>
      </div>

      <ServiceDrawer
        isOpen={!!activeService}
        onClose={() => setActiveService(null)}
        data={activeService ? SERVICES_DATA[activeService] : null}
      />
    </div>
  );
}
