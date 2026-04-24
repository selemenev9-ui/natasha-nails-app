import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ServiceConstructor from '../components/ServiceConstructor.jsx';
import BookingModal from '../components/BookingModal.jsx';
import ConfirmationParticles from '../components/ConfirmationParticles.jsx';
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

export default function BookingScreen({ onNavigate, onConfirmChange, preSelectedService, onServiceConsumed }) {
  const listRef = useRef(null);
  const isMountedRef = useRef(true);
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
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onConfirmChange?.(false);
    return () => onConfirmChange?.(false);
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
    setActiveService(null);
    setIsBookingOpen(false);
    onConfirmChange?.(false);
    onNavigate?.('profile');
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
            if (!isMountedRef.current) return;
            setConfirmState({
              service: payload.service,
              date: bookingDate,
              totalPrice: payload.totalPrice || getNumericPrice(payload.service)
            });
            onConfirmChange?.(true);
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
            key="confirm-overlay"
            className={styles.confirm}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ConfirmationParticles />

            <motion.div
              className={styles.receiptCard}
              initial={{ y: 60, opacity: 0, scale: 0.92 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.1 }}
            >
              {/* Логотип */}
              <motion.div
                className={styles.receiptLogo}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <span className={styles.receiptBrand}>NATASHA LAB</span>
                <span className={styles.receiptTag}>PREMIUM</span>
              </motion.div>

              {/* Галочка */}
              <motion.div
                className={styles.receiptCheckWrap}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.4 }}
              >
                <svg className={styles.receiptCheckSvg} viewBox="0 0 56 56" fill="none">
                  <circle cx="28" cy="28" r="27" stroke="rgba(100,180,255,0.35)" strokeWidth="1" />
                  <motion.path
                    d="M16 28 L24 36 L40 20"
                    stroke="rgba(140,210,255,0.95)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.55, ease: 'easeOut' }}
                  />
                </svg>
              </motion.div>

              {/* Название услуги */}
              <motion.h2
                className={styles.receiptService}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.35 }}
              >
                {confirmState.service?.title}
              </motion.h2>

              {/* Разделитель */}
              <motion.div
                className={styles.receiptDivider}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75 }}
              />

              {/* Строки чека */}
              {[
                { label: 'Дата', value: formatBookingDate(confirmState.date) },
                confirmState.totalPrice ? { label: 'Сумма', value: `${confirmState.totalPrice.toLocaleString('ru-RU')} ₽` } : null
              ].filter(Boolean).map((row, i) => (
                <motion.div
                  key={row.label}
                  className={styles.receiptRow}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.3 }}
                >
                  <span className={styles.receiptRowLabel}>{row.label}</span>
                  <span className={styles.receiptRowValue}>{row.value}</span>
                </motion.div>
              ))}

              {/* Футер */}
              <motion.p
                className={styles.receiptFooter}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.05 }}
              >
                Мастер свяжется для подтверждения
              </motion.p>
            </motion.div>

            {/* Кнопки */}
            <motion.div
              className={styles.confirmActions}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.35 }}
            >
              <button type="button" className={styles.confirmDoneBtn} onClick={handleConfirmClose}>
                Готово
              </button>
              <button type="button" className={styles.confirmOutline} onClick={handleConfirmClose}>
                Вернуться к услугам
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
