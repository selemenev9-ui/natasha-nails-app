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
- ~~Этап 1: ProfileScreen — история визитов~~ ✅
- ~~Этап 2: MasterScreen — записи + полный CRUD услуг~~ ✅
- ~~Этап 3: Политика конфиденциальности + онбординг~~ ✅
- ~~Деплой GitHub Pages~~ ✅
- VK Dev: создано приложение ID 54555974, URL вставлен ✅
- Ожидаем иконки от дизайнера → загрузить в Оформление → подать на модерацию
- Этап 4: Уведомления VK Notify (после модерации)
- Этап 5: Master Analytics (In-App дашборд с премиальным UI для просмотра статистики: выручка, клиенты, топ услуг. Интеграция с YDB)
- Этап 6: Визуальный рефакторинг (Quiet Luxury & Clean Editorial)
- Вкладка «Портфолио» утверждена к удалению.
## Текущий фокус
- ~~Этап 1: ProfileScreen — история визитов~~ ✅
- ~~Этап 2: MasterScreen — полный CRUD + 5 вкладок~~ ✅
- ~~Этап 3: Политика конфиденциальности~~ ✅
- ~~Этап 4: Деплой GitHub Pages + VK Dev~~ ✅
- ~~Этап 5: Выбор даты/времени при записи~~ ✅
- ~~Этап 6: Статусы записей (pending→confirmed→completed)~~ ✅
- Следующее: показывать имя клиента вместо VK ID в мастер-панели
- Потом: блокировка уже занятых слотов при выборе времени
- Потом: вкладка График (выходные, рабочие часы)
- Потом: уведомления VK Notify

## Booking flow (финальный)
1. Клиент выбирает услугу → модификаторы → дату/время → POST status=pending
2. Наташа видит в "Сегодня" → подтверждает → status=confirmed
3. После визита → "Выполнено" → status=completed

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
-  задеплоено в VK (есть группа, передать Наташе позже)
- Локально: npm run dev
- **Правило:** `npm run deploy` / публикации в `gh-pages` запускать **только после явного разрешения Наташи** (никаких самостоятельных деплоев во время экспериментов).