# Biznes ERP - Backend

NestJS + Prisma + PostgreSQL API.

## Ishga tushirish

```bash
cp .env.example .env  # DATABASE_URL, JWT_SECRET ni sozlang
npm install
npx prisma migrate dev
npm run start:dev
```

## Modullar

- Auth - JWT ro'yxatdan o'tish/kirish
- Inventory - kategoriyalar, mahsulotlar, ombor harakati
- Sales - mijozlar, buyurtmalar
- Finance - hisob-fakturalar, to'lovlar, xarajatlar
