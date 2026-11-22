// Every page of the catalogue is on the sidebar, so there are no tabs here: each page names itself.
export default function CatalogueLayout({ children }: LayoutProps<'/[locale]/catalogue'>) {
  return children;
}
