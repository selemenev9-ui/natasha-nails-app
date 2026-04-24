import { useEffect, useRef, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { AnimatePresence, motion } from 'framer-motion';
import ServiceConstructor from '../components/ServiceConstructor.jsx';
import BookingModal from '../components/BookingModal.jsx';
import ConfirmationParticles from '../components/ConfirmationParticles.jsx';
import NeuralBackground from '../components/NeuralBackground.jsx';
import useViscousScroll from '../hooks/useViscousScroll.js';
import { useVK } from '../contexts/VKContext.jsx';
import { NAIL_MODIFIERS } from '../data/services.js';
import { API_URL } from '../utils/config.js';
import styles from './BookingScreen.module.css';

const CATEGORY_COLORS = {
  default: 'rgba(247, 245, 240, 0.4)',
  nails: 'rgba(212, 197, 179, 0.55)',
  solarium: 'rgba(140, 122, 107, 0.5)',
  extra: 'rgba(234, 229, 222, 0.6)'
};

const CATEGORY_TEMPLATE = [
  { id: 'nails', title: 'Маникюр & Педикюр' },
  { id: 'solarium', title: 'Солярий' },
  { id: 'extra', title: 'Дополнительно' }
];

export default function BookingScreen({ onConfirmChange, preSelectedService, onServiceConsumed }) {
  const listRef = useRef(null);
  const { triggerHaptic, user } = useVK();
  const [categories, setCategories] = useState(() => CATEGORY_TEMPLATE.map((meta) => ({ ...meta, items: [] })));
  const [activeService, setActiveService] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [bookingError, setBookingError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [selectedDate] = useState(() => new Date().toISOString());
  useViscousScroll(listRef);

  useEffect(() => {
    onConfirmChange?.(false);
  }, [onConfirmChange]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadServices() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(API_URL, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Ошибка ${response.status}`);
        }

        const payload = await response.json();
        const services = Array.isArray(payload?.services) ? payload.services : Array.isArray(payload) ? payload : null;
        console.log('Загруженные услуги:', services);

        if (!Array.isArray(services)) {
          throw new Error('Некорректный формат данных');
        }

        const normalized = services.map((service) => ({
          ...service,
          category: service?.category || 'nails'
        }));

        const grouped = CATEGORY_TEMPLATE.map((meta) => ({
          ...meta,
          items: normalized.filter((service) => service.category === meta.id)
        }));

        if (isMounted) {
          setCategories(grouped);
          setActiveService(null);
        }
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') return;
        if (isMounted) {
          setError(fetchError.message || 'Не удалось загрузить услуги');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadServices();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!preSelectedService || isLoading) return;
    for (const category of categories) {
      const found = category.items?.find((service) => service.id === preSelectedService.serviceId);
      if (found) {
        setActiveService(found);
        setIsBookingOpen(true);
        onServiceConsumed?.();
        break;
      }
    }
  }, [preSelectedService, isLoading, categories, onServiceConsumed]);

  const handleServiceSelect = (service) => {
    triggerHaptic('medium');

    if (activeService?.id === service.id) {
      setActiveService(null);
      return;
    }

    setActiveService(service);
  };

  const primaryCategory = categories.find((category) => category.items?.length > 0) ?? categories[0];
  const glowCategory = activeService?.category || primaryCategory?.id || 'default';

  const getNumericPrice = (service) => {
    if (!service) return 0;
    if (typeof service.basePrice === 'number') return service.basePrice;
    if (typeof service.price === 'string') {
      const digits = parseInt(service.price.replace(/[^0-9]/g, ''), 10);
      return Number.isNaN(digits) ? 0 : digits;
    }
    return 0;
  };

  async function requestMessagesPermission() {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('vk_messages_allowed')) return;
    try {
      const result = await bridge.send('VKWebAppAllowMessagesFromGroup', {
        group_id: 237746914,
        key: 'notify_booking'
      });
      if (result?.result) {
        localStorage.setItem('vk_messages_allowed', '1');
      }
    } catch (e) {
      // пользователь отказал — просто продолжаем
    }
  }

  const handleBookingRequest = async (payload) => {
    if (!payload?.service) {
      setIsBookingOpen(true);
      return;
    }
    // Сохраняем payload и открываем выбор времени
    setActiveService((prev) => ({ ...prev, _pendingPayload: payload }));
    setIsBookingOpen(true);
  };

  const handleBookingClose = () => {
    setIsBookingOpen(false);
  };

  const handleRetry = () => {
    setReloadKey((key) => key + 1);
  };

  const handleConfirmClose = () => {
    setConfirmState(null);
    onConfirmChange?.(false);
  };

  const formatBookingDate = (value) => {
    if (!value) return 'Дата уточняется';
    try {
      return new Date(value).toLocaleString('ru-RU', {
        dateStyle: 'long',
        timeStyle: 'short'
      });
    } catch (err) {
      return value;
    }
  };

  return (
    <>
      <div className={styles.booking}>
        <NeuralBackground />
        <div className={styles.ambientContainer} aria-hidden="true">
          <div className={styles.auroraMesh} />
          <div className={styles.noiseOverlay} />
        </div>

        <div className={styles.contentLayer}>
          <motion.div
            className={styles.step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <motion.div className={styles.cardStack} ref={listRef}>
              {isLoading ? (
                <div className={styles.loader}>Загрузка услуг…</div>
              ) : error ? (
                <div className={`${styles.emptyState} glass-panel`}>
                  <p>Не удалось загрузить услуги. {error}</p>
                  <button
                    type="button"
                    className={styles.inlineBookButton}
                    onClick={() => {
                      triggerHaptic('light');
                      handleRetry();
                    }}
                  >
                    Повторить запрос
                  </button>
                </div>
              ) : !categories.some((category) => category.items.length > 0) ? (
                <div className={`${styles.emptyState} glass-panel`}>
                  <p>Каталог услуг обновляется. Менеджер подберёт ритуал вручную после консультации.</p>
                  <button
                    type="button"
                    className={styles.inlineBookButton}
                    onClick={() => {
                      triggerHaptic('light');
                      handleBookingRequest();
                    }}
                  >
                    Записаться у администратора
                  </button>
                </div>
              ) : (
                categories.map((category) => (
                  category.items.length > 0 && (
                    <div key={category.id} className={styles.categoryGroup}>
                      <h2 className={styles.categoryDivider}>{category.title}</h2>
                      {category.items.map((service, index) => (
                        <motion.div
                          key={service.id}
                          role="button"
                          tabIndex={0}
                          data-viscous
                          className={`${styles.serviceCard} glass-panel ${activeService?.id === service.id ? styles.activeCard : ''}`}
                          whileTap={{ scale: 0.96 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut', delay: index * 0.04 } }}
                          onClick={() => handleServiceSelect(service)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleServiceSelect(service);
                            }
                          }}
                        >
                          <div className={styles.cardContent}>
                            <div>
                              <p className={styles.serviceTitle}>{service.title}</p>
                              <p className={styles.serviceDescription}>{service.description || 'Персональный уход, подобранный мастером'}</p>
                            </div>
                            <div className={styles.serviceMetadata}>
                              <span className={styles.serviceDuration}>{service.duration || '60 мин'}</span>
                              <span className={styles.servicePrice}>{typeof service.price === 'string' ? service.price : `${service.price || service.basePrice || '—'} ₽`}</span>
                            </div>
                          </div>
                          <AnimatePresence>
                            {activeService?.id === service.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                style={{ overflow: 'hidden', width: '100%' }}
                              >
                                {service.hasModifiers ? (
                                  <ServiceConstructor
                                    service={service}
                                    modifiersData={NAIL_MODIFIERS}
                                    isSubmitting={isSubmitting}
                                    onBook={(payload) => {
                                      triggerHaptic('heavy');
                                      handleBookingRequest(payload);
                                    }}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    className={styles.inlineBookButton}
                                    disabled={isSubmitting}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      triggerHaptic('heavy');
                                      handleBookingRequest({ service, totalPrice: getNumericPrice(service), url: service?.bookingUrl || '' });
                                    }}
                                  >
                                    {isSubmitting ? 'Отправка...' : 'Записаться онлайн'}
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  )
                ))
              )}
            </motion.div>
          </motion.div>

        </div>
      </div>

      {bookingError ? <p className={styles.bookingError}>{bookingError}</p> : null}

      <BookingModal
        isOpen={isBookingOpen}
        onClose={handleBookingClose}
        onConfirm={async (dateTime) => {
          const payload = activeService?._pendingPayload;
          if (!payload) return;
          if (isSubmitting) return;
          if (!payload.service?.id) {
            setBookingError('Не удалось определить услугу.');
            return;
          }
          if (!user?.id) {
            setBookingError('Авторизуйтесь через VK.');
            return;
          }

          setBookingError(null);
          setIsSubmitting(true);
          const bookingDate = `${dateTime.date}T${dateTime.time}:00Z`;
          const body = {
            service_id: payload.service.id,
            client_id: user.id,
            client_name: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
            date: bookingDate,
            totalPrice: payload.totalPrice || getNumericPrice(payload.service)
          };
          try {
            const response = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            });
            if (!response.ok) throw new Error(`Ошибка ${response.status}`);
            triggerHaptic('medium');
            setConfirmState({
              service: payload.service,
              date: bookingDate,
              totalPrice: payload.totalPrice || getNumericPrice(payload.service)
            });
            onConfirmChange?.(true);
            requestMessagesPermission();
          } catch (err) {
            setBookingError(err.message || 'Не удалось создать запись.');
          } finally {
            setIsSubmitting(false);
          }
        }}
      />

      <AnimatePresence>
        {confirmState ? (
          <motion.div
            className={styles.confirm}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <ConfirmationParticles />
            <div className={styles.confirmRing}>
              <div className={styles.confirmRingTrack} />
              <div className={styles.confirmRingSpinner} />
            </div>
            <h2 className={styles.confirmTitle}>Ритуал забронирован</h2>
            <div className={styles.confirmDetails}>
              <p className={styles.confirmService}>{confirmState.service?.title}</p>
              <div className={styles.confirmMeta}>
                <span>{formatBookingDate(confirmState.date)}</span>
                {confirmState.totalPrice ? (
                  <span>{confirmState.totalPrice.toLocaleString('ru-RU')} ₽</span>
                ) : null}
              </div>
            </div>
            <div className={styles.confirmActions}>
              <button type="button" className="btn-ink" onClick={handleConfirmClose}>
                Готово
              </button>
              <button type="button" className={styles.confirmOutline} onClick={handleConfirmClose}>
                Вернуться к услугам
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
