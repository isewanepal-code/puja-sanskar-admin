import { getTranslations } from 'next-intl/server';

import { Icon, type IconName } from '@/components/icons';

const AREAS: { icon: IconName; key: 'catalogue' | 'orders' | 'counter' | 'money' }[] = [
  { icon: 'box', key: 'catalogue' },
  { icon: 'truck', key: 'orders' },
  { icon: 'store', key: 'counter' },
  { icon: 'coin', key: 'money' },
];

// The left of the sign-in page: what the panel runs, over a quiet diya-light backdrop.
export async function LoginShowcase() {
  const t = await getTranslations('login.showcase');

  return (
    <aside className="relative isolate hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Concentric rings, like the light of a lamp spreading; purely decoration. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 600 600"
        className="absolute -right-40 -bottom-40 -z-10 size-[720px] text-white/10"
        fill="none"
        stroke="currentColor"
      >
        {[60, 120, 180, 240, 300].map((radius) => (
          <circle key={radius} cx="300" cy="300" r={radius} strokeWidth="1.5" />
        ))}
        <circle cx="300" cy="300" r="14" fill="currentColor" stroke="none" />
      </svg>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_top_left,rgb(255_255_255/0.14),transparent_55%)]"
      />

      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
          <Icon name="diya" size={24} aria-hidden="true" />
        </span>
        <span className="font-heading text-xl font-semibold tracking-wide">{t('brand')}</span>
      </div>

      <div className="grid max-w-lg gap-8">
        <div className="grid gap-3">
          <h2 className="font-heading text-4xl leading-tight font-semibold">{t('headline')}</h2>
          <p className="text-base leading-relaxed text-primary-foreground/80">{t('lead')}</p>
        </div>
        <ul className="grid grid-cols-2 gap-3">
          {AREAS.map(({ icon, key }) => (
            <li
              key={key}
              className="grid gap-1.5 rounded-xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm"
            >
              <Icon name={icon} size={20} aria-hidden="true" />
              <span className="text-sm font-semibold">{t(`areas.${key}.title`)}</span>
              <span className="text-xs leading-snug text-primary-foreground/75">
                {t(`areas.${key}.note`)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-primary-foreground/70">{t('staffOnly')}</p>
    </aside>
  );
}
