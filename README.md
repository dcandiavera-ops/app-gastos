# Gastos Personales Web

App web personal para registrar gastos, revisar historial y escanear boletas con OCR gratuito.

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Prisma
- PostgreSQL
- OCR.space para OCR de boletas
- Supabase Auth para acceso privado

## Desarrollo local

1. Copia `.env.example` a `.env`
2. Configura `DATABASE_URL` con el pooler de Supabase
3. Configura `DIRECT_URL` con la conexion directa de Supabase
4. Configura `NEXT_PUBLIC_SUPABASE_URL`
5. Configura `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
6. Configura `OCR_SPACE_API_KEY` con tu clave gratis de OCR.space
7. Ejecuta `npm install`
8. Ejecuta `npx prisma db push`
9. Ejecuta `npm run dev`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Despliegue gratis recomendado

- Frontend y backend: Vercel
- Base de datos: Supabase Postgres free
- Auth: Supabase Auth
- OCR: OCR.space free API

## Variables de entorno

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `OCR_SPACE_API_KEY`

## Checklist de produccion

1. En Supabase activa Email/Password en Authentication.
2. En Supabase agrega las Redirect URLs:
   - `http://localhost:3000/auth/confirm`
   - `https://TU_DOMINIO_VERCEL/auth/confirm`
3. Ejecuta `npx prisma db push` con las variables apuntando a Supabase.
4. En Vercel configura las variables de entorno del proyecto.
5. Despliega desde GitHub.
