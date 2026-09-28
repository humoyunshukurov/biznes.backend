# Biznes ERP - Backend

NestJS + Prisma + PostgreSQL API.

## Ishga tushirish

```bash
cp .env.example .env  # DATABASE_URL, JWT_SECRET ni sozlang
npm install
npx prisma migrate dev
npm run start:dev
```

Namuna ma'lumotlar bilan to'ldirish uchun:

```bash
npm run db:seed
```

Agar bazada administrator bo'lmasa, seed `admin@biznes.uz` / `admin123` foydalanuvchisini yaratadi (parolni keyin o'zgartiring). Seed biznes ma'lumotlarini (mahsulotlar, buyurtmalar, mijozlar, yetkazib beruvchilar va hokazo) o'chirib, qaytadan yozadi.

Yuklangan mahsulot rasmlari `uploads/` papkasida saqlanadi va `/uploads/...` manzili orqali beriladi.

## Modullar

- Auth - JWT ro'yxatdan o'tish/kirish, `/auth/me`
- Inventory - bo'limlar, mahsulotlar (bir nechta shtrix-kod, tan narxi, ulgurji narx, IKPU, QQS, markirovka, vaznli tovar), o'lchov birliklari, brendlar, tovar harakati, reviziya, Excel import, rasm yuklash
- Suppliers - yetkazib beruvchilar, tovar kirimi/qaytarish, to'lovlar va balans
- Sales - mijozlar, buyurtmalar (bekor qilinganda tovar omborga qaytadi)
- Finance - hisob-fakturalar, to'lovlar, xarajatlar
- Stats - umumiy statistika, qoldiq (foyda bilan), ABC tahlil, mijozlar balansi, tavsiya etilgan xarid
- Settings - kompaniya, chek, printer va qo'llab-quvvatlash sozlamalari (faqat ADMIN o'zgartiradi)
- Shifts - smena ochish/yopish
