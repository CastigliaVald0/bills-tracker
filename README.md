# Billions Tracker

App personal de control de gastos mensuales (Uruguay, UYU/USD), con gastos por categoría y gastos fijos/recurrentes que se cargan solos cada mes.

## Stack

Next.js (App Router) + TypeScript + Tailwind · Prisma + PostgreSQL · Auth.js (Credentials) · pensado para deploy en Vercel + Neon.

## Desarrollo local

1. Copiá `.env.example` a `.env` y completá `DATABASE_URL` y `AUTH_SECRET` (`openssl rand -base64 33`).
2. Necesitás un Postgres corriendo. Para desarrollo local con Docker:
   ```bash
   docker run -d --name bills-tracker-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=bills_tracker -p 5432:5432 postgres:16-alpine
   ```
   y usá `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bills_tracker"`.
3. Instalá dependencias y aplicá las migraciones:
   ```bash
   npm install
   npx prisma migrate dev
   ```
4. Levantá el servidor:
   ```bash
   npm run dev
   ```
5. Abrí [http://localhost:3000](http://localhost:3000), registrate y empezá a cargar gastos.

## Gastos recurrentes

`/api/cron/generate-recurring` recorre los gastos fijos activos y, si hoy coincide con su día del mes, genera el gasto del mes (una sola vez). En producción lo dispara el cron de Vercel definido en `vercel.json` (todos los días 06:00 UTC).

El endpoint genera gastos para **todos** los usuarios, así que exige `CRON_SECRET`: sin esa variable configurada rechaza cualquier pedido. Para probarlo manualmente:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/generate-recurring
```

## Deploy a producción

1. Creá un proyecto en [Neon](https://neon.tech) (Postgres, free tier) y copiá la connection string.
2. Importá el repo en [Vercel](https://vercel.com/new).
3. Configurá las variables de entorno en Vercel (las tres son obligatorias):
   - `DATABASE_URL` — la connection string de Neon.
   - `AUTH_SECRET` — `openssl rand -base64 33`.
   - `CRON_SECRET` — `openssl rand -base64 33`. Vercel Cron lo manda solo como `Authorization: Bearer <CRON_SECRET>`.
4. Aplicá las migraciones contra Neon **antes** del primer deploy, desde tu máquina:
   ```bash
   DATABASE_URL="<la-de-neon>" npx prisma migrate deploy
   ```
   Repetí este paso cada vez que agregues una migración nueva.
5. Deploy. El script `build` corre `prisma generate` antes de `next build`, que es imprescindible: sin eso el build falla en un servidor limpio.

> Si lo desplegás fuera de Vercel, agregá también `AUTH_TRUST_HOST=true` (Auth.js solo confía en el host automáticamente en Vercel).
