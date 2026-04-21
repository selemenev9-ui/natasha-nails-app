import { useState } from 'react';
import styles from './CareAccordion.module.css';

export default function CareAccordion({ data = [] }) {
  const [activeId, setActiveId] = useState(null);

  const handleToggle = (id) => {
    setActiveId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={styles.accordion}>
      {data.map((item) => {
        const isOpen = activeId === item.id;

        return (
          <article key={item.id} className={`${styles.item} ${isOpen ? styles.open : ''}`}>
            <button
              type="button"
              className={styles.header}
              onClick={() => handleToggle(item.id)}
              aria-expanded={isOpen}
            >
              <span className={styles.headingBlock}>
                <span className={styles.category}>{item.category}</span>
                <span className={styles.title}>{item.title}</span>
              </span>
              <span className={styles.icon} aria-hidden="true" />
            </button>

            <div className={styles.contentWrap}>
              <p className={styles.content}>{item.content}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
