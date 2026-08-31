# Bills Tracker

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

`/api/cron/generate-recurring` recorre los gastos fijos activos y, si hoy coincide con su día del mes, genera el gasto del mes (una sola vez). En producción lo dispara el cron de Vercel definido en `vercel.json` (todos los días 06:00 UTC). En local podés probarlo pegándole manualmente:
```bash
curl http://localhost:3000/api/cron/generate-recurring
```

## Deploy a producción

1. Creá un proyecto en [Neon](https://neon.tech) (Postgres, free tier) y copiá la connection string.
2. Importá el repo en [Vercel](https://vercel.com/new).
3. Configurá las variables de entorno en Vercel: `DATABASE_URL` (la de Neon), `AUTH_SECRET`, y opcionalmente `CRON_SECRET` (si lo definís, Vercel Cron lo manda automáticamente como `Authorization: Bearer <CRON_SECRET>`).
4. Corré `npx prisma migrate deploy` contra la base de Neon (localmente, apuntando `DATABASE_URL` a Neon, o como build step en Vercel) antes del primer deploy.
