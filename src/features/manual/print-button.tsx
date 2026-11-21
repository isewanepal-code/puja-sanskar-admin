'use client';

import { Button } from '@/components/ui/button';

// Prints the manual, or saves it as a PDF to share.
export function PrintButton() {
  return (
    <Button
      variant="secondary"
      icon="download"
      onClick={() => window.print()}
      className="print:hidden"
    >
      Print / Save as PDF
    </Button>
  );
}
