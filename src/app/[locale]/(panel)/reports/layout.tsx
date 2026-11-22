import { SectionHeader } from '@/components/navigation';

// Every page here has its own sidebar entry; the header names it from the address.
export default function ReportsLayout({ children }: LayoutProps<'/[locale]/reports'>) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <SectionHeader />
      {children}
    </div>
  );
}
