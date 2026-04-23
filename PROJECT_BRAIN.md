# NATASHA NAILS APP — PROJECT BRAIN
_Обновлено: 23.04.2026_

## Стек
- React + Vite, VK Mini App
- Yandex Cloud Functions (Node.js 22, ESM)
- YDB Serverless (natasha-db)
- Yandex Object Storage (natasha-chat-media) — фото в чате
- Framer Motion
- НЕТ Zustand — стейт через useState + VKContext

## API
- URL: https://functions.yandexcloud.net/d4eb8ife6rqecrip6jp3
- Сервисный аккаунт: natasha-api-sa (роли: ydb.editor + storage.uploader)
- Env: YDB_ENDPOINT, YDB_DATABASE, VK_TOKEN, VK_GROUP_ID, S3_KEY_ID, S3_SECRET

## Схема YDB (финальная)
- **appointments**: id, client_id, service_id, appointment_date(Datetime), status, total_price(Int32), client_name, client_phone, notes, confirmed_at
- **services**: id, category, title, price(Int32), duration_minutes(Int32), is_active(Bool)
- **clients**: id, vk_id, first_name, phone, registered_at
- **availability**: id, date, start_time, end_time, is_day_off
- **messages**: id, appointment_id, sender_id, sender_name, text, created_at(Datetime), is_read(Bool)

## API actions (все рабочие)
- **GET**: history, all_appointments, all_services, availability, all_clients, busy_slots, day_config, client_notes, get_messages, get_conversations
- **POST**: update_service, add_service, delete_service, confirm_appointment, cancel_appointment, complete_appointment, add_appointment, set_availability, reschedule_appointment, save_client_notes, send_message, mark_read, upload_photo, (default: create booking)

## Критичные решения (не менять)
- extractValue() парсит protobuf через JSON.parse(JSON.stringify(cell)) — без этого int32 читается как пустая строка
- appointment_date пишется через CAST("..." AS Datetime), формат: 2026-04-21T00:12:54Z
- total_price: CAST(N AS Int32)
- package.json функции: оставить @yandex-cloud/nodejs-sdk, не удалять
- Навигация: простой useState route в App.jsx — НЕ менять на router, сломает VK Bridge
- Driver YDB: использовать СИНГЛТОН (_driver на уровне модуля) — НЕ создавать новый на каждый запрос! Иначе RESOURCE_EXHAUSTED

## Object Storage (natasha-chat-media)
- Бакет: natasha-chat-media, регион ru-central1
- Доступ: публичное чтение объектов
- Lifecycle: автоудаление через 30 дней (уже настроено)
- Endpoint: https://natasha-chat-media.storage.yandexcloud.net
- Загрузка: через Cloud Function (upload_photo action), AWS Signature V4 (без внешних пакетов — встроенный crypto + https)
- Сжатие на клиенте: Canvas, max 1200px, quality 0.82 → ~100-150 КБ
- Формат сообщения с фото: text = "[photo]https://..."

## Чат (архитектура)
- Таблица messages в YDB
- room_id для прямых сообщений: "direct_{client_id}"
- Поллинг каждые 5 сек (get_messages)
- mark_read вызывается при открытии чата
- VK уведомление при каждом новом сообщении (send_message → sendVkMessage/notifyMasters)
- ChatDrawer — полноэкранный, слайд справа (как VK/Telegram)
- Emoji picker: 40 эмодзи, кнопка 😊
- Фото: кнопка 📷, input type=file, сжатие → upload_photo → [photo]url

## Экраны
- Booking — услуги из API, POST запись, hasModifiers → ServiceConstructor
- Info — статичный
- Profile — VK user, BeautyCard, CareAccordion, история визитов, отмена/перенос, кнопка чата
- Chat — клиентский чат с мастером (room: direct_{user.id})
- Master — мастер-панель (светлая тема): Сегодня, Расписание, Клиенты, Чат

## MASTER_IDS
- ['80557585', '187729875']
- 123456789 (тестовый) — УЖЕ УДАЛЁН ✅

## VK App
- App ID: 54555974
- URL: https://selemenev9-ui.github.io/natasha-nails-app/
- Группа: Natasha Premium Lab
- Статус: Непроверенное, доступно по ссылке

## natasha-notify (cron функция)
- Отдельная Cloud Function, триггер каждые 30 минут
- 24ч окно: diffSec >= 23*3600+45*60 && diffSec <= 24*3600+15*60
- 2ч окно: diffSec >= 1*3600+45*60 && diffSec <= 2*3600+15*60
- Утренняя сводка мастеру: UTC час 5 (08:00 МСК)

## TabBar (клиент)
- Вкладки: Запись, Кабинет, Чат, О студии + Мастер (только MASTER_IDS)
- Красный бейдж на Чат — поллинг get_messages каждые 30 сек, unread_count
- При открытии вкладки Чат — сброс счётчика

## КЛАДБИЩЕ (не повторять!)
- TypedData.asRows — не существует в ydb-sdk v5
- .nativeObjects — возвращает пустой результат
- 'textValue' in cell без JSON.parse — всегда true из-за protobuf прототипа
- Параметризованные запросы с typeId — не работают, использовать inline CAST
- LEFT JOIN без AS → колонки с префиксом "a.id" — всегда писать явные алиасы AS
- driver.destroy() в finally — убивает соединение → RESOURCE_EXHAUSTED на следующем запросе
- Виндсёрф обрезает index.js при редактировании — после деплоя всегда: tail -5 index.js → должно быть };

## ЧТО СДЕЛАНО ✅
- Этапы 1-9 базовой функциональности
- Уведомления VK (клиенту и мастеру)
- Дизайн мастер-панели (светлая тема, аватары, таймлайн, свайпы, бар-чарт)
- Напоминания за 24ч и 2ч клиенту, утренняя сводка мастеру
- Повторная запись в один клик
- Отмена/перенос клиентом (если > 24ч до записи)
- Комментарии к действиям мастера (уходят в VK)
- Перенос записи мастером (новая pending + VK уведомление)
- Чат: таблица messages, ChatDrawer, ChatScreen, ChatTab в мастер-панели
- Telegram-like чат: разделители дат, галочки ✓/✓✓, бейджи непрочитанных
- Полноэкранный чат (слайд справа, как VK/Telegram)
- Emoji picker 😊 (40 эмодзи)
- Фото в чате: Canvas сжатие + Object Storage (бакет настроен, lifecycle 30 дней)
- uploadToS3 через AWS Signature V4 (без внешних зависимостей)

## 🔴 НУЖНО СДЕЛАТЬ (приоритет)

### 1. КРИТИЧНО — driver-синглтон в index.js (RESOURCE_EXHAUSTED fix)
Текущая проблема: каждый запрос создаёт новый Driver → исчерпывает gRPC соединения YDB.

Заменить в index.js:
```js
// УДАЛИТЬ:
async function createDriver() {
  const driver = new Driver({...});
  if (!(await driver.ready(7000))) throw new Error('...');
  return driver;
}

// ДОБАВИТЬ:
let _driver = null;
async function getDriver() {
  if (_driver) return _driver;
  _driver = new Driver({ endpoint, database, authService: getCredentialsFromEnv() });
  if (!(await _driver.ready(15000))) { _driver = null; throw new Error('YDB не ответил'); }
  return _driver;
}
```

В handler заменить `let driver; try { driver = await createDriver();` на `try { const driver = await getDriver();`

Удалить блок: `} finally { await driver?.destroy?.(); }`

В catch добавить: `_driver = null;`

### 2. Проверить фото в чате
После п.1 — отправить фото и убедиться что появляется у собеседника

### 3. Теги клиентов (автоматические)
- VIP: сумма всех визитов > 10 000 ₽
- Постоянный: 3+ завершённых визита
- Новый: менее 2 визитов
- Показывать в карточках клиентов в мастер-панели (ChatTab + ClientsTab)

### 4. Виндсёрф — важные правила работы с index.js
- Выбирать МОЩНУЮ модель: Claude Sonnet или GPT-4o (не medium/mini!)
- После каждого деплоя проверять: tail -5 index.js → должно заканчиваться на };
- При редактировании index.js — использовать targeted edits, не перезаписывать весь файл
