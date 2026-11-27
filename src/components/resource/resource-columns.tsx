import type { QueryClient } from '@tanstack/react-query';

import type { Column } from '@/components/ui/data-table';
import { request } from '@/lib/api';

import { InlineNumber } from './inline-number';
import { InlineToggle } from './inline-toggle';
import type { useResourceText } from './translate';
import type { Resource } from './types';

// The columns of a list as staff see them: headed and explained from the translations, with a number
// that can be changed in place, and an on/off field of the form turned into a switch in the list.
export function resourceColumns<T>(
  resource: Resource<T>,
  t: ReturnType<typeof useResourceText>,
  canEdit: boolean,
  queryClient: QueryClient,
): Column<T>[] {
  const scope = resource.scope ?? resource.key;
  // A column showing an on/off field of the form becomes a switch staff flip in the list.
  const switches = new Set(
    resource.fields
      .filter((field) => field.kind === 'switch' && !field.createOnly)
      .map((f) => f.name),
  );
  return resource.columns.map((column) => {
    const header = t(`fields.${column.key}`);
    // resources.<key>.columnHelp.<column>, when written, explains the heading in plain words.
    const help = t.has(`columnHelp.${column.key}`) ? t(`columnHelp.${column.key}`) : undefined;
    const inline = canEdit ? resource.inline?.[column.key] : undefined;
    if (inline) {
      return {
        ...column,
        header,
        help,
        cell: (row: T) => {
          const start = inline.value(row);
          return (
            <InlineNumber
              display={column.cell(row)}
              initial={start === null || start === undefined ? '' : String(start)}
              type={inline.type}
              allowZero={inline.allowZero}
              label={`${header}: ${resource.rowLabel(row)}`}
              onSave={async (value) => {
                await (inline.save
                  ? inline.save(row, value)
                  : request('PATCH', `${resource.path}/${resource.rowId(row)}`, {
                      body: { [column.key]: value },
                    }));
                await queryClient.invalidateQueries({ queryKey: [scope] });
              }}
            />
          );
        },
      };
    }
    if (!canEdit || resource.singleton || !switches.has(column.key) || !column.sortValue) {
      return { ...column, header, help };
    }
    const on = column.sortValue;
    return {
      ...column,
      header,
      help,
      cell: (row: T) => (
        <InlineToggle
          path={`${resource.path}/${resource.rowId(row)}`}
          field={column.key}
          on={on(row) === true}
          label={`${header}: ${resource.rowLabel(row)}`}
          scope={resource.scope ?? resource.key}
        />
      ),
    };
  });
}
