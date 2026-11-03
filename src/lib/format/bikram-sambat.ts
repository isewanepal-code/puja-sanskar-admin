import converter from 'nepali-date-converter';

type NepaliDateClass = typeof converter;

// The CommonJS build (tests) puts the class on `default`; the ES build (Next) is the class.
const NepaliDate: NepaliDateClass =
  (converter as unknown as { default?: NepaliDateClass }).default ?? converter;

export const BS_MONTHS = [
  ['Baisakh', 'बैशाख'],
  ['Jestha', 'जेठ'],
  ['Asar', 'असार'],
  ['Shrawan', 'साउन'],
  ['Bhadra', 'भदौ'],
  ['Asoj', 'असोज'],
  ['Kartik', 'कार्तिक'],
  ['Mangsir', 'मंसिर'],
  ['Poush', 'पुष'],
  ['Magh', 'माघ'],
  ['Falgun', 'फागुन'],
  ['Chaitra', 'चैत'],
] as const;

// Years the converter knows; the picker offers these.
export const BS_FIRST_YEAR = 2000;
export const BS_LAST_YEAR = 2089;

// month is 1-12 in both calendars.
export type CalendarDay = { year: number; month: number; day: number };

const pad = (value: number) => String(value).padStart(2, '0');

export const toIsoDay = ({ year, month, day }: CalendarDay) => `${year}-${pad(month)}-${pad(day)}`;

export function parseIsoDay(value: string): CalendarDay {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return { year: year!, month: month!, day: day! };
}

export function adToBs(ad: CalendarDay): CalendarDay {
  const { BS } = new NepaliDate(new Date(ad.year, ad.month - 1, ad.day)).getDateObject();
  return { year: BS.year, month: BS.month + 1, day: BS.date };
}

export function bsToAd(bs: CalendarDay): CalendarDay {
  const ad = new NepaliDate(bs.year, bs.month - 1, bs.day).toJsDate();
  return { year: ad.getFullYear(), month: ad.getMonth() + 1, day: ad.getDate() };
}

// BS months run 29 to 32 days; counted from where the next month starts.
export function bsMonthLength(year: number, month: number): number {
  const first = bsToAd({ year, month, day: 1 });
  const next =
    month === 12 ? { year: year + 1, month: 1, day: 1 } : { year, month: month + 1, day: 1 };
  const start = Date.UTC(first.year, first.month - 1, first.day);
  const nextAd = bsToAd(next);
  return Math.round((Date.UTC(nextAd.year, nextAd.month - 1, nextAd.day) - start) / 86_400_000);
}

// Weekday (0 Sunday) the BS month starts on, for laying out a calendar.
export function bsMonthStartsOn(year: number, month: number): number {
  const ad = bsToAd({ year, month, day: 1 });
  return new Date(ad.year, ad.month - 1, ad.day).getDay();
}

export const bsMonthName = (month: number) => BS_MONTHS[month - 1]![0];
