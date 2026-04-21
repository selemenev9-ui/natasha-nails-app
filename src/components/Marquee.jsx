import styles from './Marquee.module.css';

const TEXT = 'Маникюр · Педикюр · Солярий · Хромовый блеск · Natasha Beauty · Premium Rituals · ';

export default function Marquee({ reverse = false, speed = 25 }) {
  return (
    <div className={styles.marquee}>
      <div
        className={`${styles.track} ${reverse ? styles.reverse : ''}`}
        style={{ animationDuration: `${speed}s` }}
      >
        {[...Array(4)].map((_, i) => (
          <span key={i} className={styles.text}>
            {TEXT}
            &nbsp;&nbsp;
          </span>
        ))}
      </div>
    </div>
  );
}
