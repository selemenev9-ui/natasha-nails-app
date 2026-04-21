import styles from './InfoScreen.module.css';

const LINKS = [{ label: 'ВКонтакте', url: 'https://vk.com/natasha_premium_lab' }];

export default function InfoScreen() {
  const handleOpenExternal = (url) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  return (
    <div className={styles.info}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Studio</h1>

        <div className={styles.card}>
          <p className={styles.cardLabel}>Контакты</p>
          <p className={styles.cardValue}>Адрес: (В процессе добавления)</p>
          <p className={styles.cardValue}>пн–вс · 10:00—20:00</p>
          <a href="tel:+70000000000" className={styles.cardLink}>+7 (000) 000-00-00</a>
        </div>

        <div className={styles.card}>
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
              className={styles.link}
              onClick={() => handleOpenExternal(link.url)}
            >
              <span>{link.label}</span>
              <svg viewBox="0 0 24 24">
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </button>
          ))}
        </div>

        <div className={styles.card}>
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
