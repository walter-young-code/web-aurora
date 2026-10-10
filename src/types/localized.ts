export type Locale = 'zh' | 'en';

export type Localized<T = string> = { zh: T; en: T };
