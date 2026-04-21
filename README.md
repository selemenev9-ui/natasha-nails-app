# Люмэри — VK Mini App

Мини-приложение для студии красоты Люмэри (Ростов-на-Дон).

## Tech Stack

- Vite + React
- @vkontakte/vk-bridge — VK integration
- @vkontakte/vk-mini-apps-router — available in deps, used as minimal internal state routing
- Framer Motion — animations
- Custom CSS Modules (no UI library)

## Design

- Palette: warm off-white #FAF8F5, stone #5F5E5A, light beige #E8E4DC, border #D3D1C7, text #2C2C2A
- Fonts: Cormorant Garamond (headings), Inter (body)
- Mobile-first (base 375px), max-width 520px

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser. VK Bridge warnings in console are expected outside VK client.

## Build

```bash
npm run build
```

Output: `dist/` — static files ready for deployment.

## Deploy to VK Mini Apps

1. Create an app in [VK Mini Apps Console](https://dev.vk.com/mini-apps/getting-started/quick-start) and note the **App ID**.
2. Update `vk-hosting-config.json` with your App ID:
   ```json
   {
     "app_id": 1234567
   }
   ```
3. Make sure `dist/` exists: `npm run build`
4. Run deploy:
   ```bash
   npm run deploy
   ```
   Follow prompts to authenticate with VK.
5. Go to your app settings → Mini App → fill in the hosted URL.

## Dikidi Integration

Current flow opens Dikidi landing: `https://dikidi.ru/1109266`

Replace with real API calls later:
- Search files for `// TODO: replace with real Dikidi API call when token is provided`
- Services data, available dates, time slots — all mocked
- Update `BookingScreen.jsx` to fetch live availability once API token is available

## Structure

```
src/
  App.jsx               # Routing + VK Bridge setup
  main.jsx              # Entry point
  styles/global.css     # Theme variables, resets
  components/           # TabBar
  screens/              # Home, Booking, Portfolio, Info
```

## Navigation

- Bottom tab bar (Главная, Запись, Работы, О студии)
- Framer Motion page transitions

---

© Люмэри — студия красоты, Ростов-на-Дон
