// Server xabarlari: har bir kalit uch tilda. {name} kabi joylar parametr bilan to'ldiriladi.
export type Lang = 'uz' | 'en' | 'ru';

type Entry = Record<Lang, string>;

export const messages = {
  // Umumiy
  'http.badRequest': {
    uz: "So'rov noto'g'ri",
    en: 'Invalid request',
    ru: 'Некорректный запрос',
  },
  'http.unauthorized': {
    uz: 'Tizimga qayta kiring',
    en: 'Please sign in again',
    ru: 'Войдите в систему заново',
  },
  'http.forbidden': {
    uz: "Bu amal uchun ruxsat yo'q",
    en: 'You are not allowed to do this',
    ru: 'Нет доступа к этому действию',
  },
  'http.notFound': { uz: 'Topilmadi', en: 'Not found', ru: 'Не найдено' },
  'http.tooLarge': {
    uz: 'Fayl juda katta',
    en: 'The file is too large',
    ru: 'Файл слишком большой',
  },
  'http.tooMany': {
    uz: "So'rovlar juda ko'p, biroz kuting",
    en: 'Too many requests, please wait',
    ru: 'Слишком много запросов, подождите',
  },
  'http.internal': {
    uz: "Serverda kutilmagan xatolik. Qayta urinib ko'ring",
    en: 'Unexpected server error. Please try again',
    ru: 'Непредвиденная ошибка сервера. Попробуйте ещё раз',
  },
  'db.duplicate': {
    uz: 'Bunday qiymat allaqachon mavjud',
    en: 'This value already exists',
    ru: 'Такое значение уже существует',
  },
  'db.inUse': {
    uz: "Bu yozuv boshqa ma'lumotlarda ishlatilgan, shuning uchun o'chirib bo'lmaydi",
    en: 'This record is used elsewhere and cannot be deleted',
    ru: 'Запись используется в других данных, удалить нельзя',
  },
  'db.notFound': {
    uz: 'Yozuv topilmadi',
    en: 'Record not found',
    ru: 'Запись не найдена',
  },
  'db.error': {
    uz: "Ma'lumotlar bazasi xatosi",
    en: 'Database error',
    ru: 'Ошибка базы данных',
  },

  // Validatsiya
  'val.invalid': {
    uz: '"{field}" maydoni noto\'g\'ri',
    en: 'Field "{field}" is invalid',
    ru: 'Поле «{field}» заполнено неверно',
  },
  'val.required': {
    uz: '"{field}" maydonini to\'ldiring',
    en: 'Field "{field}" is required',
    ru: 'Заполните поле «{field}»',
  },
  'val.nameRequired': {
    uz: "Nomi bo'sh bo'lmasligi kerak",
    en: 'Name must not be empty',
    ru: 'Название не может быть пустым',
  },
  'val.personNameRequired': {
    uz: "Ism bo'sh bo'lmasligi kerak",
    en: 'Name must not be empty',
    ru: 'Имя не может быть пустым',
  },
  'val.phoneInvalid': {
    uz: "Telefon raqami noto'g'ri",
    en: 'Invalid phone number',
    ru: 'Неверный номер телефона',
  },
  'val.emailInvalid': {
    uz: "Email noto'g'ri formatda",
    en: 'Invalid email format',
    ru: 'Неверный формат email',
  },
  'val.amountPositive': {
    uz: "Summa 0 dan katta bo'lishi kerak",
    en: 'Amount must be greater than 0',
    ru: 'Сумма должна быть больше 0',
  },
  'val.quantityPositive': {
    uz: "Miqdor 0 dan katta bo'lishi kerak",
    en: 'Quantity must be greater than 0',
    ru: 'Количество должно быть больше 0',
  },
  'val.priceNotNegative': {
    uz: "Narx manfiy bo'lmasligi kerak",
    en: 'Price must not be negative',
    ru: 'Цена не может быть отрицательной',
  },
  'val.categoryRequired': {
    uz: "Toifa bo'sh bo'lmasligi kerak",
    en: 'Category must not be empty',
    ru: 'Категория не может быть пустой',
  },
  'val.barcodeRequired': {
    uz: 'Kamida bitta shtrix-kod kiriting',
    en: 'Enter at least one barcode',
    ru: 'Введите хотя бы один штрих-код',
  },
  'val.barcodeSpaces': {
    uz: "Shtrix-kodda bo'sh joy bo'lmasligi kerak",
    en: 'Barcode must not contain spaces',
    ru: 'Штрих-код не должен содержать пробелов',
  },
  'val.ikpu': {
    uz: "IKPU (MXIK) kodi 17 ta raqamdan iborat bo'lishi kerak",
    en: 'IKPU (MXIK) code must be 17 digits',
    ru: 'Код ИКПУ (MXIK) должен состоять из 17 цифр',
  },
  'val.fileNoRows': {
    uz: "Faylda qatorlar yo'q",
    en: 'The file has no rows',
    ru: 'В файле нет строк',
  },
  'val.actualNotNegative': {
    uz: "Haqiqiy qoldiq manfiy bo'lmasligi kerak",
    en: 'Actual stock must not be negative',
    ru: 'Фактический остаток не может быть отрицательным',
  },
  'val.countAtLeastOne': {
    uz: 'Kamida bitta mahsulot sanang',
    en: 'Count at least one product',
    ru: 'Посчитайте хотя бы один товар',
  },
  'val.selectAtLeastOne': {
    uz: 'Kamida bitta mahsulot tanlang',
    en: 'Select at least one product',
    ru: 'Выберите хотя бы один товар',
  },

  // Auth
  'auth.emailTaken': {
    uz: "Bu email allaqachon ro'yxatdan o'tgan",
    en: 'This email is already registered',
    ru: 'Этот email уже зарегистрирован',
  },
  'auth.invalidCredentials': {
    uz: 'Email yoki parol xato',
    en: 'Wrong email or password',
    ru: 'Неверный email или пароль',
  },
  'auth.userNotFound': {
    uz: 'Foydalanuvchi topilmadi',
    en: 'User not found',
    ru: 'Пользователь не найден',
  },
  'auth.adminOnly': {
    uz: 'Bu amal faqat administrator uchun',
    en: 'Only an administrator can do this',
    ru: 'Это действие доступно только администратору',
  },

  // Ombor
  'product.notFound': {
    uz: 'Mahsulot topilmadi',
    en: 'Product not found',
    ru: 'Товар не найден',
  },
  'product.barcodeDuplicate': {
    uz: 'Shtrix-kodlar takrorlanmasligi kerak',
    en: 'Barcodes must not repeat',
    ru: 'Штрих-коды не должны повторяться',
  },
  'product.barcodeTaken': {
    uz: '"{code}" shtrix-kodi "{name}" mahsulotiga biriktirilgan',
    en: 'Barcode "{code}" is already assigned to "{name}"',
    ru: 'Штрих-код «{code}» уже привязан к товару «{name}»',
  },
  'product.skuTaken': {
    uz: '"{sku}" artikuli "{name}" mahsulotida ishlatilgan',
    en: 'SKU "{sku}" is already used by "{name}"',
    ru: 'Артикул «{sku}» уже используется у товара «{name}»',
  },
  'product.usedInOrders': {
    uz: "Bu mahsulot {n} ta buyurtmada ishlatilgan, uni o'chirib bo'lmaydi",
    en: 'This product is used in {n} orders and cannot be deleted',
    ru: 'Товар используется в заказах ({n}), удалить нельзя',
  },
  'product.nameEmpty': {
    uz: "mahsulot nomi bo'sh",
    en: 'product name is empty',
    ru: 'пустое название товара',
  },
  'import.row': {
    uz: '{line}-qator: {message}',
    en: 'Row {line}: {message}',
    ru: 'Строка {line}: {message}',
  },
  'import.rowNotFound': {
    uz: '{line}-qator: "{ref}" mahsuloti topilmadi',
    en: 'Row {line}: product "{ref}" not found',
    ru: 'Строка {line}: товар «{ref}» не найден',
  },
  'stock.notEnough': {
    uz: '"{name}" uchun omborda yetarli qoldiq yo\'q (mavjud: {available})',
    en: 'Not enough stock for "{name}" (available: {available})',
    ru: 'Недостаточно остатка для «{name}» (доступно: {available})',
  },
  'stock.duplicateProduct': {
    uz: 'Bir mahsulot ikki marta kiritilgan',
    en: 'The same product is entered twice',
    ru: 'Один товар указан дважды',
  },
  'category.notFound': {
    uz: "Bo'lim topilmadi",
    en: 'Category not found',
    ru: 'Раздел не найден',
  },
  'unit.notFound': {
    uz: "O'lchov birligi topilmadi",
    en: 'Unit not found',
    ru: 'Единица измерения не найдена',
  },
  'unit.inUse': {
    uz: "Bu o'lchov birligi {n} ta mahsulotda ishlatilgan",
    en: 'This unit is used by {n} products',
    ru: 'Единица измерения используется у товаров: {n}',
  },
  'brand.notFound': {
    uz: 'Brend topilmadi',
    en: 'Brand not found',
    ru: 'Бренд не найден',
  },
  'productType.notFound': {
    uz: 'Mahsulot turi topilmadi',
    en: 'Product type not found',
    ru: 'Тип товара не найден',
  },
  'upload.onlyImages': {
    uz: 'Faqat rasm (png, jpg, webp, gif) yuklash mumkin',
    en: 'Only images (png, jpg, webp, gif) can be uploaded',
    ru: 'Можно загружать только изображения (png, jpg, webp, gif)',
  },
  'upload.noFile': {
    uz: 'Fayl tanlanmagan',
    en: 'No file selected',
    ru: 'Файл не выбран',
  },

  // Sotuv
  'customer.notFound': {
    uz: 'Mijoz topilmadi',
    en: 'Customer not found',
    ru: 'Клиент не найден',
  },
  'customer.hasRecords': {
    uz: "Bu mijozda {orders} ta buyurtma va {invoices} ta hisob-faktura bor, uni o'chirib bo'lmaydi",
    en: 'This customer has {orders} orders and {invoices} invoices and cannot be deleted',
    ru: 'У клиента есть заказы ({orders}) и счета-фактуры ({invoices}), удалить нельзя',
  },
  'order.notFound': {
    uz: 'Buyurtma topilmadi',
    en: 'Order not found',
    ru: 'Заказ не найден',
  },
  'return.cancelledOrder': {
    uz: "Bekor qilingan buyurtmadan qaytarib bo'lmaydi",
    en: 'Items cannot be returned from a cancelled order',
    ru: 'Нельзя оформить возврат по отменённому заказу',
  },
  'return.notInOrder': {
    uz: "Bu mahsulot buyurtmada yo'q",
    en: 'This product is not in the order',
    ru: 'Этого товара нет в заказе',
  },
  'return.tooMany': {
    uz: '"{name}" dan ko\'pi bilan {available} ta qaytarish mumkin',
    en: 'At most {available} of "{name}" can be returned',
    ru: 'Можно вернуть не больше {available} шт. «{name}»',
  },

  // Moliya
  'invoice.notFound': {
    uz: 'Hisob-faktura topilmadi',
    en: 'Invoice not found',
    ru: 'Счёт-фактура не найден',
  },
  'invoice.paid': {
    uz: "Hisob-faktura to'liq to'langan",
    en: 'The invoice is fully paid',
    ru: 'Счёт-фактура полностью оплачен',
  },
  'invoice.cancelled': {
    uz: 'Hisob-faktura bekor qilingan',
    en: 'The invoice is cancelled',
    ru: 'Счёт-фактура отменён',
  },
  'invoice.hasPayments': {
    uz: "To'lov qilingan hisob-fakturani bekor qilib bo'lmaydi",
    en: 'An invoice with payments cannot be cancelled',
    ru: 'Нельзя отменить счёт-фактуру с оплатами',
  },
  'payment.tooMuch': {
    uz: "To'lov summasi qolgan qarzdan oshmasligi kerak (qolgan: {remaining})",
    en: 'Payment must not exceed the remaining debt ({remaining})',
    ru: 'Оплата не может превышать остаток долга ({remaining})',
  },
  'expense.notFound': {
    uz: 'Xarajat topilmadi',
    en: 'Expense not found',
    ru: 'Расход не найден',
  },

  // Yetkazib beruvchi, smena, statistika
  'supplier.notFound': {
    uz: 'Yetkazib beruvchi topilmadi',
    en: 'Supplier not found',
    ru: 'Поставщик не найден',
  },
  'supplier.hasRecords': {
    uz: "Bu yetkazib beruvchida kirim yoki to'lovlar bor, uni o'chirib bo'lmaydi",
    en: 'This supplier has deliveries or payments and cannot be deleted',
    ru: 'У поставщика есть приходы или оплаты, удалить нельзя',
  },
  'cash.transferAccounts': {
    uz: "O'tkazma uchun ikki xil hisob tanlang",
    en: 'Choose two different accounts for a transfer',
    ru: 'Для перевода выберите два разных счёта',
  },
  'cash.insufficient': {
    uz: "Hisobda yetarli mablag' yo'q (mavjud: {available})",
    en: 'Not enough money on the account (available: {available})',
    ru: 'Недостаточно средств на счёте (доступно: {available})',
  },
  'cash.notFound': {
    uz: 'Kassa yozuvi topilmadi',
    en: 'Cash record not found',
    ru: 'Кассовая запись не найдена',
  },
  'shift.alreadyOpen': {
    uz: 'Smena allaqachon ochiq',
    en: 'A shift is already open',
    ru: 'Смена уже открыта',
  },
  'shift.noneOpen': {
    uz: 'Ochiq smena topilmadi',
    en: 'No open shift found',
    ru: 'Открытая смена не найдена',
  },
  'stats.badRange': {
    uz: "Sana oralig'i noto'g'ri",
    en: 'Invalid date range',
    ru: 'Неверный период',
  },
  'stats.rangeTooLong': {
    uz: "Sana oralig'i 400 kundan oshmasligi kerak",
    en: 'The date range must not exceed 400 days',
    ru: 'Период не должен превышать 400 дней',
  },
} satisfies Record<string, Entry>;

export type MessageKey = keyof typeof messages;

export function isMessageKey(key: unknown): key is MessageKey {
  return typeof key === 'string' && key in messages;
}

export function translate(
  lang: Lang,
  key: MessageKey,
  params?: Record<string, string | number>,
) {
  const template = messages[key][lang] ?? messages[key].uz;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) =>
    k in params ? String(params[k]) : m,
  );
}

// "uz", "en-US,en;q=0.9", "ru" -> qo'llab-quvvatlanadigan til
export function pickLang(header: string | string[] | undefined): Lang {
  const value = Array.isArray(header) ? header[0] : header;
  const first = (value ?? '').split(',')[0].trim().slice(0, 2).toLowerCase();
  return first === 'en' || first === 'ru' ? first : 'uz';
}
