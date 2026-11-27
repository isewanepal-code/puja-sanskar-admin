import { cn } from '@/lib/utils';

import type { GroupBy } from './data-table-types';

// The heading row above a group of rows; a collapsible one opens and closes them, and can show a
// summary of its rows and buttons for them.
export function GroupHeading<T>({
  groupBy,
  heading,
  members,
  isOpen,
  colSpan,
  onToggle,
}: {
  groupBy: GroupBy<T>;
  heading: string;
  members: T[];
  isOpen: boolean;
  colSpan: number;
  onToggle: () => void;
}) {
  return (
    <tr className="group-head">
      <td
        colSpan={colSpan}
        className="sticky left-0 border-r border-b border-border bg-muted px-3 py-2 text-xs font-semibold tracking-wide uppercase"
      >
        {groupBy.collapsible ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={onToggle}
              className="flex min-w-0 flex-1 items-center gap-2 text-left uppercase"
            >
              <span className={cn('inline-block transition-transform', isOpen && 'rotate-90')}>
                ▸
              </span>
              <span>{groupBy.label(heading)}</span>
              <span className="font-normal text-muted-foreground">{members.length}</span>
              {groupBy.summary ? (
                <span className="ml-auto font-normal tracking-normal text-muted-foreground normal-case">
                  {groupBy.summary(members)}
                </span>
              ) : null}
            </button>
            {groupBy.actions ? (
              <span className="flex items-center gap-1.5 font-normal tracking-normal normal-case">
                {groupBy.actions(members)}
              </span>
            ) : null}
          </div>
        ) : (
          <>
            {groupBy.label(heading)}
            <span className="ml-2 font-normal text-muted-foreground">{members.length}</span>
          </>
        )}
      </td>
    </tr>
  );
}
