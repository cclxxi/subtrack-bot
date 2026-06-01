# subs-bot — план реализации

## Context

Greenfield-проект (`/Users/cclxxi/WebstormProjects/subs-bot`): только `bun init` запущен (пустой `index.ts`, `package.json` без зависимостей, не git-репозиторий). Нужно с нуля собрать Telegram-бот для трекинга подписок и карт с дневными уведомлениями о ближайших списаниях. Цель — минимальный, но расширяемый MVP, который через несколько месяцев получит webapp поверх той же БД и того же HTTP-слоя.

**Зафиксированные решения:**

- Bun + grammY + Hono + PostgreSQL + Drizzle ORM
- Multi-user с первого дня (изоляция по `telegram_id`)
- Webhook (Caddy уже стоит на сервере)
- Уведомления: дневной cron + lead-time в днях per-subscription
- Мультивалютность на уровне подписки (без авто-конвертации в v1)
- Карта в v1 = `label` + `last4`
- Деплой: Docker Compose рядом с уже работающими сервисами (portainer, uptime kuma, второй бот)

---

## Стек и ключевые библиотеки

| Зона          | Выбор                                | Зачем                                                                                     |
| ------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| Runtime       | Bun (latest)                         | Уже в проекте, быстрый старт, native TS                                                   |
| Bot framework | `grammy` + `@grammyjs/conversations` | Conversations нужны для пошаговых wizard-ов (add subscription/card)                       |
| HTTP          | `hono`                               | `webhookCallback(bot, 'hono')` встроен в grammY, + готовый каркас для будущего webapp API |
| DB driver     | `pg` (node-postgres)                 | Drizzle с pg-драйвером — самый накатанный путь                                            |
| ORM           | `drizzle-orm` + `drizzle-kit`        | TS-first, миграции из коробки                                                             |
| Cron          | `croner`                             | Маленький, Bun-friendly, точные таймзоны                                                  |
| Валидация env | `zod`                                | Чтобы упасть на старте, а не в рантайме                                                   |

---

## Структура проекта

```
subs-bot/
├── src/
│   ├── index.ts                 # bootstrap: env → db → bot → hono → cron
│   ├── env.ts                   # zod-схема .env
│   ├── db/
│   │   ├── client.ts            # pg Pool + drizzle()
│   │   ├── schema.ts            # users, cards, subscriptions, notifications_log
│   │   └── migrations/          # drizzle-kit generate
│   ├── bot/
│   │   ├── index.ts             # createBot(): сборка middlewares + handlers
│   │   ├── middleware/auth.ts   # upsert user по from.id, кладёт в ctx.user
│   │   ├── conversations/       # add-subscription.ts, add-card.ts
│   │   ├── menu/main.ts         # inline-меню верхнего уровня
│   │   └── handlers/            # /start, subs, cards, settings
│   ├── server/app.ts            # Hono: POST /tg/webhook, GET /healthz, /api/* (заглушка для webapp)
│   ├── scheduler/
│   │   └── billing-notifier.ts  # ежечасный тик, фильтр по TZ юзера, рассылка
│   ├── services/
│   │   ├── subscriptions.ts     # CRUD + advanceNextBillingDate()
│   │   └── cards.ts             # CRUD
│   ├── lib/
│   │   ├── billing.ts           # nextBillingDate(interval, anchor) — чистая функция
│   │   └── money.ts             # форматирование `1 990,00 ₽` / `$9.99`
│   └── types/
├── drizzle.config.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
└── tsconfig.json (уже есть)
```

---

## Схема БД (Drizzle)

```ts
// src/db/schema.ts (эскиз — окончательные типы при реализации)
users            { id uuid pk, telegram_id bigint unique, username text, first_name text,
                   locale text default 'ru', timezone text default 'Europe/Moscow',
                   notification_hour int default 9, created_at }
cards            { id uuid pk, user_id fk users, label text, last4 char(4),
                   is_archived bool default false, created_at }
subscriptions    { id uuid pk, user_id fk users, card_id fk cards nullable,
                   name text, amount numeric(12,2), currency char(3),
                   interval enum('monthly','yearly','weekly','custom'),
                   interval_days int nullable,        -- для 'custom'
                   next_billing_date date,
                   notify_days_before int[] default '{3,1,0}',
                   is_active bool default true,
                   created_at, updated_at }
notifications_log{ id uuid pk, subscription_id fk, sent_at timestamptz,
                   kind enum('reminder','charge'),
                   days_before int                    -- какой именно из массива сработал
                   unique(subscription_id, sent_at::date, kind, days_before) }
```

`notifications_log` с уникальным индексом — единственная защита от дублей: при перезапуске процесса или дрожании cron повторная вставка просто упадёт с `ON CONFLICT DO NOTHING`.

---

## Bot UX (v1)

`/start` → upsert юзера + главное inline-меню:

```
📋 Мои подписки   💳 Карты
📊 Сводка месяца  ⚙️ Настройки
```

- **Подписки**: список карточек с inline-кнопками `[✏️] [🗑] [⏸]`, отдельная `➕ Добавить`.
- **Add subscription** (`@grammyjs/conversations`): name → amount → currency (3-buttons + free input) → interval → дата следующего списания → выбор карты из existing (или skip) → подтверждение.
- **Карты**: список + `➕ Добавить` → label → last4 (regex `^\d{4}$`).
- **Сводка месяца**: суммы сгруппированы по валютам (без конвертации).
- **Настройки**: timezone, час уведомлений, дефолтный lead-time.

---

## Webhook + безопасность

- При старте: `bot.api.setWebhook(BOT_WEBHOOK_URL, { secret_token: BOT_WEBHOOK_SECRET })`.
- В Hono-роуте `POST /tg/webhook` — мидлваря проверяет `X-Telegram-Bot-Api-Secret-Token` до того, как тело улетит в grammY.
- `webhookCallback(bot, 'hono')` — встроенный адаптер grammY.
- `GET /healthz` — для uptime kuma.
- `/api/*` — пустой роутер-заглушка под будущий webapp (там же позже добавится Telegram Web App initData verification).

---

## Scheduler

`croner` запускает джобу `0 * * * *` (каждый час в `:00`). Алгоритм одного тика:

```sql
SELECT s.*, u.timezone, u.notification_hour
FROM subscriptions s JOIN users u ON ...
WHERE s.is_active
  AND EXTRACT(HOUR FROM (now() AT TIME ZONE u.timezone)) = u.notification_hour
  AND (s.next_billing_date - CURRENT_DATE) = ANY(s.notify_days_before)
```

Для каждой строки:

1. `INSERT INTO notifications_log ... ON CONFLICT DO NOTHING` — атомарная блокировка дубля.
2. Если вставка прошла (`rowCount > 0`) — `bot.api.sendMessage(...)`.
3. При `days_before = 0` — `subscriptions.advanceNextBillingDate(id)` (двигает дату на следующий период через `lib/billing.ts`).

Чистая функция `nextBillingDate(interval, anchor, intervalDays?)` живёт в `lib/billing.ts` и покрывается парой `bun test` (граничные случаи — 31-е число, февраль, прыжки через DST не релевантны т.к. работаем в `date`, не в `timestamptz`).

---

## Деплой (Docker Compose)

`docker-compose.yml` — три сервиса в общей внутренней сети:

```yaml
services:
  subs-bot:
    build: .
    env_file: .env
    depends_on: [subs-bot-db]
    networks: [internal, caddy_net] # caddy_net — существующая external сеть Caddy
    restart: unless-stopped
  subs-bot-db:
    image: postgres:16-alpine
    volumes: ['subs-bot-pgdata:/var/lib/postgresql/data']
    environment: { POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD }
    networks: [internal]
    restart: unless-stopped
```

`Dockerfile` — multi-stage: `oven/bun:1` для install (с lockfile) → финальный slim-образ. На старте контейнера: `bun run db:migrate && bun run src/index.ts`.

В существующий Caddyfile добавить блок:

```
subs-bot.<домен> {
  reverse_proxy subs-bot:3000
}
```

`.env.example` фиксирует обязательные переменные: `BOT_TOKEN`, `BOT_WEBHOOK_URL`, `BOT_WEBHOOK_SECRET`, `DATABASE_URL`, `PORT=3000`, `TZ_DEFAULT=Europe/Moscow`.

---

## Порядок реализации (рекомендуемый)

1. **Скелет**: установить зависимости, `src/env.ts`, `src/db/client.ts`, dummy `src/index.ts` запускается.
2. **Schema + миграции**: `drizzle.config.ts`, описать таблицы, сгенерировать и применить первую миграцию локально.
3. **Bot bootstrap**: `bot/index.ts` с `/start` и auth-мидлварёй → проверить через polling (`bot.start()` временно вместо webhook).
4. **Hono + webhook**: переключить на webhook, добавить secret-token проверку, `/healthz`.
5. **Cards CRUD** (проще подписок) — отладить паттерн conversation/menu.
6. **Subscriptions CRUD** + просмотр.
7. **Scheduler + notifications_log** — сначала тестовый endpoint `/api/_debug/tick` для ручного запуска, потом cron.
8. **Сводка месяца + настройки** (TZ, час, дефолтный lead-time).
9. **Dockerfile + docker-compose.yml** + Caddyfile-сниппет.

---

## Verification

**Локально (без публичного домена):**

- `docker compose up subs-bot-db` → `bun run db:migrate` → `bun run dev`.
- `cloudflared tunnel` (или ngrok) → выставить `BOT_WEBHOOK_URL` на временный https-домен.
- В Telegram: `/start` → проверить, что юзер создался в `users`.
- Добавить карту, добавить подписку с `next_billing_date = today + 1`, `notify_days_before = {1}`.
- `curl http://localhost:3000/api/_debug/tick` → должно прийти сообщение, в `notifications_log` появиться строка, повторный curl — без дублей.
- `bun test` на `lib/billing.ts` (граничные даты).

**На сервере:**

- `docker compose up -d --build` → `docker compose logs -f subs-bot`.
- В Caddyfile прописать поддомен, `caddy reload`.
- `curl https://subs-bot.<домен>/healthz` → 200.
- `/start` боту в Telegram → реальный e2e.
- Добавить uptime-kuma monitor на `/healthz`.
- Создать тестовую подписку с `next_billing_date = today`, дождаться следующего часа, совпадающего с `notification_hour` → уведомление приходит, `next_billing_date` сдвигается.
