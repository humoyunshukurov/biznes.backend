import { Transform } from 'class-transformer';

// Satr qiymatning boshi va oxiridagi bo'sh joylarni olib tashlaydi
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

// Ixtiyoriy maydon bo'sh qoldirilsa null sifatida saqlanadi (maydonni tozalash uchun)
export const EmptyToNull = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? null : value,
  );
