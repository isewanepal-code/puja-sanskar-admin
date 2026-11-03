import { Fragment } from 'react';

import { PATH_SEPARATOR } from '@/lib/choices';

// "हिन्दु › दैनिक पूजा" with the steps above muted and the last one plain.
export function PathText({ path }: { path: string }) {
  const steps = path.split(PATH_SEPARATOR);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1">
      {steps.map((step, index) => (
        <Fragment key={index}>
          {index > 0 ? <span className="text-muted-foreground/60">›</span> : null}
          <span
            className={index === steps.length - 1 ? 'font-medium' : 'text-xs text-muted-foreground'}
          >
            {step}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
