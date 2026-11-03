import type messages from './messages/en.json';
import type { Locale } from './routing';

declare module 'next-intl' {
  interface AppConfig {
    // The shared components take either of the website's languages; routing serves English.
    Locale: Locale;
    Messages: typeof messages;
  }
}
