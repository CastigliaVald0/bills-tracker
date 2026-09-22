# Billions Tracker · desarrollo y despliegue

Guía técnica para levantar la app en tu máquina y publicarla. Para saber qué hace la app, mirá el [README](../README.md).

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

## Seguridad de cuentas

- **Límite de intentos** (tabla `RateLimit`, ventana fija en la base porque en serverless
  cada request puede caer en otra instancia): login 8 por cuenta y 50 por IP cada 15 min;
  registro 10 por IP por hora; recuperación 5 por IP y 3 por cuenta por hora.
- **Recuperación de contraseña** por email, con token de un solo uso que vence en 1 hora.
  En la base se guarda solo el hash del token. Recuperar la contraseña también destraba
  una cuenta bloqueada por intentos fallidos.
- El cron limpia tokens vencidos y contadores viejos en cada corrida.

### Configurar el envío de mails

La app usa SMTP genérico, así que sirve cualquier proveedor. Dos opciones gratis que
**no requieren tener un dominio propio**:

- **Gmail** (lo más rápido): activá la verificación en 2 pasos en tu cuenta de Google,
  generá una "contraseña de aplicación" en [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
  y usá `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=tu-cuenta@gmail.com`,
  `SMTP_PASSWORD=` la contraseña de aplicación. Límite aproximado: 500 mails por día.
- **Brevo**: cuenta gratis, verificás tu email como remitente y usás sus credenciales SMTP
  (`smtp-relay.brevo.com`, puerto 587). Unos 300 mails por día.

En desarrollo conviene un servidor SMTP local que captura los mails sin enviarlos:
```bash
docker run -d --name billions-mail -p 1025:1025 -p 8025:8025 axllent/mailpit
```
y en `.env`: `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_USER=dev`, `SMTP_PASSWORD=dev`.
Los mails se leen en [http://localhost:8025](http://localhost:8025).

## Deploy a producción

1. Creá un proyecto en [Neon](https://neon.tech) (Postgres, free tier) y copiá la connection string.
2. Importá el repo en [Vercel](https://vercel.com/new).
3. Configurá las variables de entorno en Vercel (las tres son obligatorias):
   - `DATABASE_URL` — la connection string de Neon.
   - `AUTH_SECRET` — `openssl rand -base64 33`.
   - `CRON_SECRET` — `openssl rand -base64 33`. Vercel Cron lo manda solo como `Authorization: Bearer <CRON_SECRET>`.
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` — ver
     [Configurar el envío de mails](#configurar-el-envío-de-mails). Sin esto nadie puede
     recuperar su contraseña.
4. Aplicá las migraciones contra Neon **antes** del primer deploy, desde tu máquina:
   ```bash
   DATABASE_URL="<la-de-neon>" npx prisma migrate deploy
   ```
   Repetí este paso cada vez que agregues una migración nueva.
5. Deploy. El script `build` corre `prisma generate` antes de `next build`, que es imprescindible: sin eso el build falla en un servidor limpio.

> Si lo desplegás fuera de Vercel, agregá también `AUTH_TRUST_HOST=true` (Auth.js solo confía en el host automáticamente en Vercel).
