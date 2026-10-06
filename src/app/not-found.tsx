import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>

        <h1 className="text-2xl font-semibold">Page not found</h1>

        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist or may have been moved.
        </p>

        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
