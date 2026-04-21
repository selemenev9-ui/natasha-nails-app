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
- ~~Этап 1: ProfileScreen — история визитов~~ ✅ ГОТОВО
- Этап 2: Уведомления через VK Notify API

## Деплой
- НЕ задеплоено в VK (есть группа, передать Наташе позже)
- Локально: npm run dev