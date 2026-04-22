# NATASHA NAILS APP — PROJECT BRAIN

## Стек
- React + Vite, VK Mini App
- Yandex Cloud Functions (Node.js 22, ESM)
- YDB Serverless (natasha-db)
- Framer Motion, Three.js (rings на Home)
- НЕТ Zustand — стейт через useState + VKContext

## API
- URL: https://functions.yandexcloud.net/d4eb8ife6rqecrip6jp3
- GET → { services: [...] }
- POST → { service_id, client_id, date, totalPrice } → { ok, appointment_id }
- Сервисный аккаунт: natasha-api-sa (ydb.editor)
- Env: YDB_ENDPOINT, YDB_DATABASE

## Схема YDB
- services: id(Utf8), category(Utf8), title(Utf8), price(Int32), duration_minutes(Int32)
- appointments: id(Utf8), client_id(Utf8), service_id(Utf8), appointment_date(Datetime), status(Utf8), total_price(Int32)
- clients: id(Utf8), vk_id(Utf8), first_name(Utf8), phone(Utf8), registered_at(Datetime)

## Критичные решения (не менять)
- extractValue() парсит protobuf через JSON.parse(JSON.stringify(cell)) — без этого int32 читается как пустая строка
- appointment_date пишется через CAST("..." AS Datetime), формат: 2026-04-21T00:12:54Z
- total_price: CAST(N AS Int32)
- package.json функции: оставить @yandex-cloud/nodejs-sdk, не удалять

## Экраны
- Home — категории + ServiceDrawer, данные хардкод (не из API)
- Booking — услуги из API, POST запись, hasModifiers → ServiceConstructor
- Portfolio — статичный
- Info — статичный
- Profile — VK user, BeautyCard, CareAccordion (советы), кнопка написать админу

## Навигация
- Простой useState route в App.jsx — НЕ менять на router, сломает VK Bridge

## КЛАДБИЩЕ
- TypedData.asRows — не существует в ydb-sdk v5
- .nativeObjects — возвращает пустой результат
- 'textValue' in cell без JSON.parse — всегда true из-за protobuf прототипа
- Параметризованные запросы с typeId — не работают, использовать inline CAST
- LEFT JOIN без AS возвращает колонки с префиксом "a.id" — всегда писать явные алиасы AS

## Текущий фокус
- ~~Этап 1-6~~ ✅ всё что было
- ~~Этап 7: График работы (выходные, рабочие часы)~~ ✅
- ~~Этап 8: Занятые слоты блокируются~~ ✅
- ~~Этап 9: Имена клиентов~~ ✅
- **Следующие шаги:**
  1. Уведомления VK Notify (после публикации)
  2. Дизайн мастер-панели (функционал уже готов, нужен визуал)

## Booking flow (финальный)
1. Клиент выбирает услугу → дата/время (с учётом выходных и рабочих часов) → POST pending
2. Наташа подтверждает → confirmed
3. После визита → completed

## Таблицы YDB (финальные)
- **appointments**: id, client_id, service_id, appointment_date, status, total_price, client_name, client_phone, notes, confirmed_at
- **services**: id, category, title, price, duration_minutes, is_active
- **clients**: id, vk_id, first_name, phone, registered_at
- **availability**: id, date, start_time, end_time, is_day_off

## API actions (все рабочие)
- **GET**: history, all_appointments, all_services, availability, all_clients, busy_slots, day_config
- **POST**: update_service, add_service, delete_service, confirm_appointment, cancel_appointment, complete_appointment, add_appointment, set_availability, (default: create booking)

## VK App
- App ID: 54555974
- URL: https://selemenev9-ui.github.io/natasha-nails-app/
- Группа: Natasha Premium Lab
- Статус: Непроверенное, доступно по ссылке

## Схема services (обновлено)
- is_active (Bool) — скрыть без удаления
- Клиентский GET возвращает только is_active=true
- Мастерский GET: ?action=all_services — все включая скрытые

## MASTER_IDS
- ['80557585', '187729875', '123456789']
- 123456789 — тестовый локалхост, убрать перед финальным деплоем

## Деплой
- GitHub: https://github.com/selemenev9-ui/natasha-nails-app (public)
- Pages: https://selemenev9-ui.github.io/natasha-nails-app/
- VK App ID: 54555974
- Облако: https://functions.yandexcloud.net/d4eb8ife6rqecrip6jp3
-  задеплоено в VK (есть группа, передать Наташе позже)
- Локально: npm run dev
- **Правило:** `npm run deploy` / публикации в `gh-pages` запускать **только после явного разрешения Наташи** (никаких самостоятельных деплоев во время экспериментов).