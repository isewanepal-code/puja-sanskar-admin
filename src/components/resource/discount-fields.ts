import type { Field } from './types';

type Keys = { kind: string; percent: string; amount: string; value: string };

// A discount edited as one choice and one number: percent off, or flat rupees off. The API
// keeps the percent and the amount apart; the form sends the number to the one chosen.
export function discountFields(keys: Keys, section?: string) {
  const fields: Field[] = [
    {
      name: keys.kind,
      kind: 'select',
      required: true,
      defaultValue: 'PERCENT',
      options: [
        { value: 'PERCENT', label: 'Percent off (%)' },
        { value: 'FLAT', label: 'Flat rupees off (Rs)' },
      ],
      section,
    },
    { name: keys.value, kind: 'money' },
  ];
  const formRow = (row: Record<string, unknown>) => ({
    ...row,
    [keys.value]: row[keys.kind] === 'FLAT' ? row[keys.amount] : row[keys.percent],
  });
  const shapeBody = ({ [keys.value]: value, ...body }: Record<string, unknown>) => {
    const flat = body[keys.kind] === 'FLAT';
    const number = value ?? '0';
    return {
      ...body,
      [keys.percent]: flat ? '0' : number,
      [keys.amount]: flat ? number : '0',
    };
  };
  return { fields, formRow, shapeBody };
}
