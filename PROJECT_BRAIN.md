# NATASHA NAILS APP — PROJECT BRAIN
_Обновлено: 29.04.2026 (сессия 2)_

## Стек
- React + Vite, VK Mini App
- Yandex Cloud Functions (Node.js 22, ESM)
- YDB Managed (natasha-db)
- Yandex Object Storage (natasha-chat-media) — фото и аудио в чате
- Framer Motion
- НЕТ Zustand — стейт через useState + VKContext

## API
- URL: https://functions.yandexcloud.net/d4eb8ife6rqecrip6jp3
- Сервисный аккаунт: natasha-api-sa (роли: ydb.editor + storage.uploader)
- Env: YDB_ENDPOINT, YDB_DATABASE, VK_TOKEN, VK_GROUP_ID, S3_KEY_ID, S3_SECRET
- Таймаут Cloud Function: 40 секунд

## Схема YDB (финальная)
- **appointments**: id, client_id, service_id, appointment_date(Datetime), status, total_price(Int32), client_name, client_phone, notes, confirmed_at, client_notes
- **services**: id, category, title, price(Int32), duration_minutes(Int32), is_active(Bool)
- **clients**: id, vk_id, first_name, phone, registered_at
- **client_profiles**: client_id, phone, telegram
- **availability**: id, date, start_time, end_time, is_day_off
- **messages**: id, appointment_id, sender_id, sender_name, text, created_at(Datetime), is_read(Bool), reply_to_id(Utf8), reply_to_text(Utf8)
- **reactions**: message_id(Utf8), user_id(Utf8), emoji(Utf8) — PK: (message_id, user_id)
- **typing_status**: room_id, user_id, updated_at(Uint32)

## API actions (все рабочие)
- **GET**: history, all_appointments, all_services, availability, all_clients, busy_slots, day_config, client_notes, get_client_profile, get_messages, get_conversations
- **POST**: update_service, add_service, delete_service, confirm_appointment, cancel_appointment, complete_appointment, delete_appointment, add_appointment, set_availability, reschedule_appointment, save_client_notes, save_client_profile, send_message, mark_read, upload_photo, upload_audio, add_reaction, remove_reaction, send_reminders (default: create booking)

## Критичные решения (не менять)
- extractValue() парсит protobuf через JSON.parse(JSON.stringify(cell)) — без этого int32 читается как пустая строка
- appointment_date пишется через CAST("..." AS Datetime), формат: 2026-04-21T00:12:54Z
- total_price: CAST(N AS Int32)
- package.json функции: оставить @yandex-cloud/nodejs-sdk, не удалять
- Навигация: простой useState route в App.jsx — НЕ менять на router, сломает VK Bridge
- **Driver YDB**: синглтон `cachedDriver` + `driverInitPromise` для защиты от двойной инициализации. Если `cachedDriver` есть — возвращать сразу БЕЗ проверки ready(). НЕ делать destroy(). При ошибках соединения — только обнулять `cachedDriver = null`. При RESOURCE_EXHAUSTED — НЕ сбрасывать драйвер, только ретрай.
- poolSettings: `{ minLimit: 0, maxLimit: 1 }` — жёсткий потолок (1 сессия на инстанс)
- `withSession(fn)`: 3 попытки с backoff (250ms × attempt) при RESOURCE_EXHAUSTED. При UNAVAILABLE/connection — сбрасывать `cachedDriver = null`.
- 503 ответ при RESOURCE_EXHAUSTED: `{"error":"throttled","retry":true}` — фронтенд должен backoff
- Все запросы к YDB — через `withSession(fn)`, не через `driver.tableClient.withSession` напрямую

## Object Storage (natasha-chat-media)
- Бакет: natasha-chat-media, регион ru-central1
- Доступ: публичное чтение объектов
- Lifecycle: автоудаление через 30 дней (уже настроено)
- Endpoint: https://natasha-chat-media.storage.yandexcloud.net
- Фото: `chat/{appointment_id}/{timestamp}.jpeg` → [photo]url
- Аудио: `audio/{appointment_id}/{timestamp}.webm` → [audio]url
- Загрузка через Cloud Function (upload_photo / upload_audio), AWS Signature V4 (без внешних пакетов)
- Сжатие фото на клиенте: Canvas, max 1200px, quality 0.82 → ~100-150 КБ
- Аудио: MediaRecorder API, audio/webm, без конвертации

## Чат (архитектура)
- Таблица messages в YDB
- room_id для прямых сообщений: "direct_{client_id}"
- Поллинг каждые **15 сек** (get_messages) — инкрементальный с `since_ts`
- Первый запрос (открытие чата): LIMIT 100, DESC, reverse → полная история
- Последующие запросы: `since_ts` = lastTs, LIMIT 50, ASC → только новые
- `lastTs` сбрасывается при смене чата и при visibilitychange (возврат на вкладку)
- **Оптимистичный UI**: сообщение добавляется локально сразу, заменяется реальным при следующем поллинге
- mark_read вызывается при открытии чата
- Typing indicator: таблица typing_status, поллинг в get_messages, анимация трёх точек
- Throttle typing updates: не чаще 1 раза в 10 сек
- Вибрация (haptic.medium) при получении нового сообщения от собеседника
- VK уведомление при каждом новом сообщении (send_message → sendVkMessage/notifyMasters)
- ChatDrawer — полноэкранный, слайд справа (как VK/Telegram)
- Emoji picker: 40 эмодзи, кнопка 😊
- Фото: кнопка 📷, input type=file, сжатие → upload_photo → [photo]url
- Аудио: кнопка 🎤 (удержание = запись, отпустить = отправить), MediaRecorder → upload_audio → [audio]url
- AudioBubble: HTML5 audio player со своим UI (play/pause, progress bar, время)
- Booking card: [booking_card]{json} → красивая карточка в чате
- **Реакции (фронтенд + бэкенд)**: долгое нажатие на сообщение → emoji picker → add_reaction/remove_reaction → отображение под сообщением ✅
- **Reply (фронтенд + бэкенд)**: свайп вправо на сообщение → превью над инпутом → send с reply_to_id/reply_to_text ✅
- Свайп reply: touch-action: pan-y, setPointerCapture, threshold 40px

## Формат сообщений в чате
- Обычный текст: просто строка
- Фото: `[photo]https://...`
- Аудио: `[audio]https://...`
- Booking card: `[booking_card]{"service":"...","date":"...","time":"...","price":"..."}`

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
- Красный бейдж на Чат — поллинг get_messages каждые **60 сек** (был 30/10), инкрементальный с `badgeSinceTs`
- visibilitychange: мгновенный refresh бейджа при возврате в приложение
- При открытии вкладки Чат — сброс счётчика и `badgeSinceTs`

## YDB Индексы (ОБЯЗАТЕЛЬНЫ для работы чата)
- `messages_by_appointment`: GLOBAL ON messages (appointment_id, created_at) — индекс для get_messages
- `reactions_by_message`: GLOBAL ON reactions (message_id) — индекс для загрузки реакций
- Без индексов → full table scan → RESOURCE_EXHAUSTED при любой нагрузке
- Статус: **созданы 29.04.2026**. При создании индекса YDB строит его в фоне (1-5 мин) — в этот период возможны RESOURCE_EXHAUSTED

## КЛАДБИЩЕ (не повторять!)
- TypedData.asRows — не существует в ydb-sdk v5
- .nativeObjects — возвращает пустой результат
- 'textValue' in cell без JSON.parse — всегда true из-за protobuf прототипа
- Параметризованные запросы с typeId — не работают, использовать inline CAST
- LEFT JOIN без AS → колонки с префиксом "a.id" — всегда писать явные алиасы AS
- driver.destroy() в finally — убивает соединение → RESOURCE_EXHAUSTED на следующем запросе
- _driver.ready(1500) проверка при каждом запросе — уничтожает рабочий драйвер по IDLE-каналу → накопление зомби-сессий → RESOURCE_EXHAUSTED
- Retry с destroy() + setTimeout(2000) внутри запроса — умножает зомби-сессии, делает хуже
- Сброс cachedDriver = null при RESOURCE_EXHAUSTED — неправильно! Драйвер живой, проблема в YDB. Сбрасывать только при UNAVAILABLE/connection errors
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
- Аудио (голосовые) в чате: MediaRecorder, upload_audio, AudioBubble компонент
- Typing indicator: анимация трёх точек когда собеседник печатает
- Вибрация при новом сообщении от собеседника (haptic.medium)
- Последнее сообщение в карточке чата (ChatScreen)
- uploadToS3 через AWS Signature V4 (без внешних зависимостей)
- YDB: reactions таблица, reply_to_id/reply_to_text в messages, typing_status таблица
- Бэкенд: add_reaction, remove_reaction, get_conversations, get_messages возвращает reactions
- Бэкенд: reply_to_id/reply_to_text поддержка в send_message и get_messages
- **Driver fix v2**: cachedDriver + driverInitPromise синглтон, maxLimit:1, retry+backoff, 503 на throttle, НЕ сбрасывать на RESOURCE_EXHAUSTED
- **YDB индексы**: messages_by_appointment + reactions_by_message (созданы 29.04.2026)
- **Инкрементальный поллинг**: since_ts в get_messages, только новые сообщения, LIMIT 50
- **Оптимистичный UI**: сообщение видно мгновенно, замена реальным при поллинге
- **Реакции (фронтенд)**: долгое нажатие → emoji picker → toggle, отображение под сообщением
- **Reply свайп (фронтенд)**: свайп вправо → превью → отправка с reply_to_id
- **Бейдж**: поллинг 60 сек, инкрементальный, visibilitychange refresh
- **Mic button fix**: убран красный индикатор после записи, исправлен pointer capture
- ClientsTab в MasterScreen (список клиентов со сводкой, спящие клиенты)

## 🔴 НУЖНО СДЕЛАТЬ

### 1. Протестировать на телефоне: Reply и Reactions
Реализовано в коде, но нужна проверка:
- Свайп вправо на сообщение → появляется превью → отправка работает
- Долгое нажатие → появляется emoji picker → реакция отображается под сообщением
- Проверить что нет конфликта между долгим нажатием и скроллом

### 2. Протестировать стабильность чата
После создания YDB индексов и деплоя нового бэкенда:
- Убедиться что RESOURCE_EXHAUSTED больше не возникает при обычном использовании
- Проверить что инкрементальный поллинг работает (новые сообщения приходят быстро)
- Проверить что оптимистичный UI не создаёт дубли

### 3. Теги клиентов (автоматические)
- VIP: сумма всех визитов > 10 000 ₽
- Постоянный: 3+ завершённых визита
- Новый: менее 2 визитов
- Показывать в карточках клиентов в ClientsTab и ChatTab

### 4. Галерея фото чата
Все фото из переписки в одном месте — сетка миниатюр, по нажатию полноэкранный просмотр.

### 5. Виндсёрф — важные правила работы с index.js
- Выбирать МОЩНУЮ модель: Claude Sonnet или GPT-4o (не medium/mini!)
- После каждого деплоя проверять: tail -5 index.js → должно заканчиваться на };
- При редактировании index.js — использовать targeted edits, не перезаписывать весь файл
- НЕ трогать функции getDriver() и withSession() — они решают проблему RESOURCE_EXHAUSTED

### 6. (Опционально) Уведомление мастеру при реакции клиента
При add_reaction → send VK notification to masters (аналогично send_message)

### 7. (Опционально) Счётчик сообщений в ChatTab мастера
Сейчас ChatTab в MasterScreen не показывает бейдж непрочитанных по каждому клиенту
