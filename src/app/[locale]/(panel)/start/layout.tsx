// The steps of bringing something into the shop are sidebar pages of their own; each has its header.
export default function StartLayout({ children }: LayoutProps<'/[locale]/start'>) {
  return <div className="grid grid-cols-1 gap-6">{children}</div>;
}
