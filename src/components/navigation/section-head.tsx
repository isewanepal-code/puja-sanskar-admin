import type { ReactNode } from 'react';

import { Icon } from '@/components/icons';
import { Link } from '@/i18n/navigation';

type SectionHeadProps = {
  title: ReactNode;
  id?: string;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  link?: { href: string; label: string };
  tools?: ReactNode;
};

export function SectionHead({ title, id, eyebrow, subtitle, link, tools }: SectionHeadProps) {
  return (
    <div className="section-head">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2 id={id}>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {tools || link ? (
        <div className="head-tools">
          {tools}
          {link ? (
            <Link className="head-link" href={link.href}>
              {link.label} <Icon name="arrow" size={16} />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
