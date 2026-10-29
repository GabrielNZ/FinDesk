/** Data civil validada, sem horário nem conversão de fuso. */
export type CivilDate = string & { readonly __civilDate: unique symbol };

export interface DateRange {
  readonly start: CivilDate;
  readonly end: CivilDate;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function civilDate(value: string): CivilDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError('Data civil deve usar YYYY-MM-DD.');
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError('Data civil inválida.');
  }
  return value as CivilDate;
}

/** Intervalo inclusivo fornecido explicitamente; não define ciclos de salário/cartão. */
export function dateRange(start: CivilDate, end: CivilDate): DateRange {
  civilDate(start);
  civilDate(end);
  if (start > end) throw new RangeError('Início do intervalo posterior ao fim.');
  return Object.freeze({ start, end });
}

export function containsDate(range: DateRange, date: CivilDate): boolean {
  dateRange(range.start, range.end);
  civilDate(date);
  return date >= range.start && date <= range.end;
}

export function calendarMonth(date: CivilDate): DateRange {
  civilDate(date);
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return dateRange(
    civilDate(`${date.slice(0, 7)}-01`),
    civilDate(`${date.slice(0, 7)}-${daysInMonth(year, month)}`),
  );
}

export interface Clock {
  today(): CivilDate;
}

export function fixedClock(today: CivilDate): Clock {
  civilDate(today);
  return Object.freeze({ today: () => today });
}
