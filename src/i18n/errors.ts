import { t, type Language } from './core';
import { errorsKo } from './locales/ko/errors';

// Match only app-owned messages at the display boundary. Keep validation and errors unchanged.
const messages = Object.entries(errorsKo);
const fixed = new Map<string, string>(
  messages.filter(([, message]) => !message.includes('%{')).map(([key, message]) => [message, key]),
);
const patterns = messages
  .filter(([, message]) => message.includes('%{'))
  .map(([key, message]) => ({
    key,
    names: [...message.matchAll(/%\{(\w+)\}/g)].map((match) => match[1]),
    pattern: new RegExp(
      '^' +
        message
          .split(/%\{\w+\}/g)
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('([\\s\\S]*?)') +
        '$',
    ),
  }));

export function translateErrorMessage(message: string, language: Language): string {
  if (language === 'ko') return message;
  const key = fixed.get(message);
  if (key) return t(`errors.${key as keyof typeof errorsKo}`, { locale: language });
  for (const { key, names, pattern } of patterns) {
    const match = pattern.exec(message);
    if (!match) continue;
    if (names.some((name, index) => name === 'count' && !/^\d+(?:\.\d+)?$/.test(match[index + 1])))
      continue;
    const values = Object.fromEntries(
      names.map((name, index) => [
        name,
        name === 'count' ? Number(match[index + 1]) : match[index + 1],
      ]),
    );
    // Numeric limits are never arbitrary text; leave an unexpected message intact.
    if ('count' in values && !Number.isFinite(values.count)) continue;
    return t(`errors.${key as keyof typeof errorsKo}`, { ...values, locale: language });
  }
  return message;
}
