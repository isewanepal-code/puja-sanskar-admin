import { routing } from '@/i18n/routing';

import './globals.css';

export default function GlobalNotFound() {
  return (
    <html lang={routing.defaultLocale}>
      <body className="flex min-h-screen items-center justify-center px-4">
        <h1 className="text-2xl font-semibold">404</h1>
      </body>
    </html>
  );
}
