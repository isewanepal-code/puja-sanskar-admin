import Script from 'next/script';

import { themeScript } from '@/lib/theme';

// Sets light or dark before the page paints. Next's beforeInteractive script, not a bare <script>:
// React never runs a script tag a component renders, and warns about it.
export function ThemeScript() {
  return (
    // App Router: allowed here, as this renders only in the root layout (the rule is from pages/).
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script id="theme-script" strategy="beforeInteractive">
      {themeScript}
    </Script>
  );
}
