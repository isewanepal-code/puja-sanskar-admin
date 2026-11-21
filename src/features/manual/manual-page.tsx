import manual from './manual.json';
import { PrintButton } from './print-button';

type Chapter = {
  id: string;
  title: string;
  nepali?: string;
  where?: string;
  intro?: string;
  steps?: string[];
  terms?: string[][];
  fields?: string[][];
  columns?: string[][];
  tips?: string[];
};

const th = 'border-b border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground';
const td = 'border-b border-border/60 px-3 py-2 align-top text-sm';

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {head.map((h, i) => (
                <td key={h} className={i === 0 ? `${td} font-medium` : td}>
                  {row[i] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The shop's manual: every page, box and column in plain words, in the order the work is done.
// Kept in manual.json, the same file the shareable copy is made from.
export function ManualPage() {
  const chapters = manual.chapters as Chapter[];
  return (
    <div className="grid max-w-5xl gap-8 print:max-w-none">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{manual.title}</h1>
          <p className="text-sm text-muted-foreground">{manual.subtitle}</p>
          <p className="text-xs text-muted-foreground">Updated {manual.updated}</p>
        </div>
        <PrintButton />
      </header>

      <nav
        aria-label="Contents"
        className="rounded-xl border border-border bg-card p-4 print:hidden"
      >
        <p className="mb-2 text-sm font-semibold">Contents · Suchi</p>
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {chapters.map((c) => (
            <li key={c.id}>
              <a href={`#${c.id}`} className="text-primary hover:underline">
                {c.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {chapters.map((c) => (
        <section
          key={c.id}
          id={c.id}
          className="grid scroll-mt-6 break-inside-avoid gap-3 rounded-xl border border-border bg-card p-5"
        >
          <div>
            <h2 className="font-heading text-lg font-semibold">{c.title}</h2>
            {c.nepali ? <p className="text-sm text-muted-foreground">{c.nepali}</p> : null}
            {c.where ? (
              <p className="mt-1 text-xs">
                <span className="font-semibold">Where: </span>
                {c.where}
              </p>
            ) : null}
          </div>
          {c.intro ? <p className="text-sm">{c.intro}</p> : null}
          {c.terms ? <Table head={['Word', 'What it means']} rows={c.terms} /> : null}
          {c.fields ? (
            <>
              <h3 className="text-sm font-semibold">Boxes to fill</h3>
              <Table head={['Box', 'Example', 'What happens']} rows={c.fields} />
            </>
          ) : null}
          {c.columns ? (
            <>
              <h3 className="text-sm font-semibold">What you see</h3>
              <Table head={['Column / part', 'What it means']} rows={c.columns} />
            </>
          ) : null}
          {c.steps ? (
            <>
              <h3 className="text-sm font-semibold">Steps</h3>
              <ol className="ml-5 list-decimal space-y-1 text-sm">
                {c.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </>
          ) : null}
          {c.tips ? (
            <ul className="grid gap-1 rounded-lg bg-muted/50 p-3 text-xs">
              {c.tips.map((tip) => (
                <li key={tip}>💡 {tip}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
