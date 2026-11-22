// Bills, returns and payments are sidebar pages of their own; each has its header.
export default function Layout({ children }: LayoutProps<'/[locale]/purchases'>) {
  return <div className="grid grid-cols-1 gap-6">{children}</div>;
}
