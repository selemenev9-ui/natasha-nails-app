import { motion } from 'framer-motion';
import SplitText from '../components/SplitText.jsx';
import styles from './InfoScreen.module.css';

const GALLERY = [
  { id: 'atelier', title: 'Atelier зона', description: 'Хромированные поверхности, мягкий свет и индивидуальные кресла.', accent: 'rgba(76, 29, 149, 0.45)' },
  { id: 'ritual', title: 'Ritual lab', description: 'Солярий нового поколения с системой охлаждения и бронзовым свечением.', accent: 'rgba(120, 53, 15, 0.45)' },
  { id: 'lounge', title: 'Lounge', description: 'Приватный кофейный угол и ароматерапия перед процедурой.', accent: 'rgba(255, 255, 255, 0.15)' }
];

const LINKS = [{ label: 'ВКонтакте', url: 'https://vk.com/natasha_premium_lab' }];

export default function InfoScreen() {
  const handleOpenExternal = (url) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  return (
    <div className={styles.info}>
      <motion.div
        className={styles.ambientGlow}
        animate={{
          background: 'radial-gradient(circle at 25% 25%, rgba(76, 29, 149, 0.45), transparent 60%), radial-gradient(circle at 80% 70%, rgba(120, 53, 15, 0.4), transparent 65%), #0a0a0c'
        }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />
      <div className={styles.inner}>
        <div className={styles.heading}>
          <SplitText text="О Natasha Beauty Lab" className={styles.title} delay={0.1} />
        </div>

        <div className={styles.galleryRow}>
          {GALLERY.map((card) => (
            <div key={card.id} className={`${styles.galleryCard} glass-panel`}>
              <div
                className={styles.galleryGlow}
                style={{
                  background:
                    `radial-gradient(circle at 30% 20%, ${card.accent}, transparent 60%), radial-gradient(circle at 75% 70%, rgba(120, 53, 15, 0.35), transparent 65%), #0b0b0e`
                }}
              />
              <div className={styles.galleryMeta}>
                <p>{card.title}</p>
                <span>{card.description}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={`${styles.card} glass-panel`}>
          <p className={styles.cardLabel}>Контакты</p>
          <p className={styles.cardValue}>Адрес: (В процессе добавления)</p>
          <p className={styles.cardValue}>пн–вс · 10:00—20:00</p>
          <a href="tel:+70000000000" className={styles.cardLink}>+7 (000) 000-00-00</a>
        </div>

        <div className={`${styles.card} glass-panel`}>
          <p className={styles.cardLabel}>О мастере</p>
          <p className={styles.quote}>
            Информация о мастере обновляется...
          </p>
        </div>

        <div className={styles.links}>
          {LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              className={`${styles.link} glass-panel`}
              onClick={() => handleOpenExternal(link.url)}
            >
              <span>{link.label}</span>
              <svg viewBox="0 0 24 24">
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </button>
          ))}
        </div>

        <div className={`${styles.card} glass-panel`}>
          <p className={styles.cardLabel}>Политика конфиденциальности</p>
          <p className={styles.cardValue}>
            Настоящая политика описывает, как Natasha Beauty Lab собирает, использует и защищает персональные данные пользователей приложения.
          </p>
          <p className={styles.cardLabel} style={{ marginTop: 12 }}>Какие данные мы собираем</p>
          <p className={styles.cardValue}>
            Имя и идентификатор ВКонтакте — для персонализации и истории визитов. Дата и время записи — для управления расписанием. Мы не собираем номера карт, пароли и геолокацию.
          </p>
          <p className={styles.cardLabel} style={{ marginTop: 12 }}>Как мы используем данные</p>
          <p className={styles.cardValue}>
            Данные используются исключительно для записи к мастеру, отправки напоминаний и ведения истории визитов. Данные не передаются третьим лицам и не используются в рекламных целях.
          </p>
          <p className={styles.cardLabel} style={{ marginTop: 12 }}>Хранение данных</p>
          <p className={styles.cardValue}>
            Данные хранятся на серверах Yandex Cloud на территории Российской Федерации в соответствии с требованиями ФЗ-152 «О персональных данных».
          </p>
          <p className={styles.cardLabel} style={{ marginTop: 12 }}>Ваши права</p>
          <p className={styles.cardValue}>
            Вы можете запросить удаление своих данных, написав администратору через ВКонтакте. Данные будут удалены в течение 3 рабочих дней.
          </p>
          <p className={styles.cardValue} style={{ marginTop: 12, fontSize: 11, opacity: 0.5 }}>
            Последнее обновление: апрель 2026 г.
          </p>
        </div>

      </div>
    </div>
  );
}
