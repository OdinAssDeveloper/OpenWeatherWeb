# OpenWeatherWeb

SPA на React + TypeScript + Vite, созданное на основе [Test_proj](https://github.com/OdinAssDeveloper/Test_proj).

Сайт: https://odinassdeveloper.github.io/OpenWeatherWeb/

## Возможности

- Поиск города через Geocoding API OpenWeather перед запросом погоды.
- Выбор среди одноимённых мест; сообщения для пустого ввода и ненайденного города.
- Температура, влажность, ветер, давление, видимость, облачность, восход и закат по местному времени города.
- Адаптивный интерфейс на русском, демонстрационный режим без ключа. Пример явно помечен и не является текущей погодой.
- Обработка неверного ключа, лимитов API, сетевых ошибок и отмены устаревших запросов.

## Запуск

Нужен Node.js 22.12+ (или 24).

```bash
npm install
npm run dev
```

Проверки и сборка: `npm test` и `npm run build`.

## Ключи и Keyring

Ключ не включается в исходники, .env, сборку, GitHub Secrets или публичные артефакты. Введите личный ключ в диалоге «Подключить API». Он остаётся только в памяти вкладки и передаётся напрямую https://api.openweathermap.org; после перезагрузки введите его заново. LocalStorage, sessionStorage и аналитика не используются. Браузер и его расширения могут читать введённый ключ; статический SPA не обеспечивает серверную изоляцию секретов.

На Ubuntu стандарт хранения — GNOME Keyring / Secret Service. Запись можно создать в своём терминале:

```bash
secret-tool store --label="OpenWeatherWeb OpenWeather" project OpenWeatherWeb service openweather
```

Введите ключ самостоятельно по запросу Password. Для уже существующей записи Test_proj используются атрибуты `project=Test_proj`, `service=openweather`. Не выводите секрет в терминал или логи; перенесите его в интерфейс самостоятельно через менеджер паролей. Доступ к локальному Keyring у опубликованного сайта отсутствует.

## GitHub Pages

Workflow .github/workflows/deploy.yml запускает тесты, TypeScript и production-сборку, затем публикует dist. В Settings → Pages выбран источник GitHub Actions. Для пути репозитория установлен Vite base /OpenWeatherWeb/. Последующие push в main автоматически обновляют сайт.
