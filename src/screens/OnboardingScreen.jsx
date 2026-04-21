import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './OnboardingScreen.module.css';

const SLIDES = [
  {
    title: 'Добро пожаловать в Natasha Nails',
    text: 'Хромовые поверхности, бархатный свет и персональные мастера, которые держат ваш стиль в карте клиента.'
  },
  {
    title: 'Темный люкс каждый день',
    text: 'Маникюр, педикюр и солярий в одном приложении. Личные напоминания, советы и режимы ухода.'
  },
  {
    title: 'Запись в один тап',
    text: 'Выберите ритуал, подтвердите время и получите подтверждение без звонков и ожидания.'
  }
];

const contentVariants = {
  initial: { opacity: 0, y: 18, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -12, filter: 'blur(3px)', transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } }
};

export default function OnboardingScreen({ onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const isLastSlide = currentSlide === SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      if (!agreed) return;
      onComplete?.();
      return;
    }
    setCurrentSlide((prev) => Math.min(prev + 1, SLIDES.length - 1));
  };

  return (
    <section className={styles.onboarding}>
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.contentWrap}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className={styles.slide}
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <p className={styles.kicker}>Natasha Rituals</p>
            <h1 className={styles.title}>{SLIDES[currentSlide].title}</h1>
            <p className={styles.text}>{SLIDES[currentSlide].text}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.footer}>
        <div className={styles.dots}>
          {SLIDES.map((_, index) => (
            <span key={index}
              className={`${styles.dot} ${index === currentSlide ? styles.dotActive : ''}`}
              aria-hidden="true" />
          ))}
        </div>

        {isLastSlide && (
          <motion.label
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.consentRow}
          >
            <input
              type="checkbox"
              className={styles.consentCheck}
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
            />
            <span className={styles.consentText}>
              Я согласен(а) с{' '}
              <span className={styles.consentLink}>политикой конфиденциальности</span>
              {' '}и обработкой персональных данных в соответствии с ФЗ-152
            </span>
          </motion.label>
        )}

        <button
          type="button"
          className="btn-ink glass-panel"
          onClick={handleNext}
          style={{ opacity: isLastSlide && !agreed ? 0.4 : 1, transition: 'opacity 0.2s' }}
        >
          {isLastSlide ? 'Начать' : 'Далее'}
        </button>
      </div>
    </section>
  );
}