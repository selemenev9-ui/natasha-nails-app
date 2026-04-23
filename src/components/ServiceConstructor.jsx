import { useMemo, useState } from 'react';
import { useVK } from '../contexts/VKContext';
import styles from './ServiceConstructor.module.css';

const getInitialState = (modifiersData) =>
  Object.fromEntries(
    Object.entries(modifiersData || {}).map(([key, category]) => [key, category.options?.[0]?.id || null])
  );

export default function ServiceConstructor({ service, modifiersData, onBook, isSubmitting = false }) {
  const [selectedState, setSelectedState] = useState(() => getInitialState(modifiersData));
  const { triggerHaptic } = useVK();

  const totalPrice = useMemo(() => {
    if (!service || !modifiersData) return 0;
    const base = service.basePrice || 0;
    const modifiersTotal = Object.entries(selectedState).reduce((acc, [categoryKey, optionId]) => {
      const category = modifiersData[categoryKey];
      const option = category?.options?.find((item) => item.id === optionId);
      return acc + (option?.price || 0);
    }, 0);
    return base + modifiersTotal;
  }, [modifiersData, selectedState, service]);

  const handleSelect = (categoryKey, optionId) => {
    triggerHaptic?.('light');
    setSelectedState((prev) => ({
      ...prev,
      [categoryKey]: optionId
    }));
  };

  if (!service || !modifiersData) {
    return null;
  }

  return (
    <div className={`${styles.container}`}>
      {Object.entries(modifiersData).map(([key, category]) => (
        <div key={key} className={styles.categoryBlock}>
          <p className={styles.categoryTitle}>{category.title}</p>
          <div className={styles.optionsGrid}>
            {category.options.map((option) => {
              const isActive = selectedState[key] === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleSelect(key, option.id);
                  }}
                >
                  <span className={styles.optionLabel}>{option.label}</span>
                  <span className={styles.optionPrice}>{option.price > 0 ? `+${option.price} ₽` : 'Включено'}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        type="button"
        className={styles.bookButton}
        disabled={isSubmitting}
        onClick={(event) => {
          event.stopPropagation();
          if (isSubmitting) return;
          triggerHaptic?.('heavy');
          onBook?.({ service, totalPrice, selections: selectedState, url: service?.bookingUrl || '' });
        }}
      >
        {isSubmitting ? 'Отправка...' : `Записаться · ${totalPrice.toLocaleString('ru-RU')} ₽`}
      </button>
    </div>
  );
}
