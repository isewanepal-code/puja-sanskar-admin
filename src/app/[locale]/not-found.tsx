import { useTranslations } from 'next-intl';

import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>

        <h1 className="text-2xl font-semibold">{t('title')}</h1>

        <p className="text-sm text-muted-foreground">{t('description')}</p>

        <Link href="/" className={buttonVariants({ size: 'lg' })}>
          {t('home')}
        </Link>
      </div>
    </main>
  );
}
