// Each inventory page has its own header; nothing is shared but the width.
export default function InventoryLayout({ children }: LayoutProps<'/[locale]/inventory'>) {
  return <div className="grid grid-cols-1 gap-6">{children}</div>;
}
