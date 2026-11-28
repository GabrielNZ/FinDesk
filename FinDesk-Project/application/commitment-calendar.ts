import {
  adjacentCivilDate,
  calendarMonth,
  containsDate,
  type CivilDate,
  type DateRange,
} from '../domain/civil-date';
import type { CommitmentRow } from './commitments';
export interface CommitmentDay {
  readonly on: CivilDate | null;
  readonly day: number | null;
  readonly enabled: boolean;
  readonly count: number;
}
export function commitmentCalendar(
  month: CivilDate,
  range: DateRange,
  rows: readonly CommitmentRow[],
): readonly CommitmentDay[] {
  const bounds = calendarMonth(month);
  const offset = (new Date(`${bounds.start}T12:00:00Z`).getUTCDay() + 6) % 7;
  let on: CivilDate | null = bounds.start;
  return Array.from({ length: 42 }, (_, index) => {
    if (index < offset || on === null || on > bounds.end)
      return { on: null, day: null, enabled: false, count: 0 };
    const date = on;
    on = adjacentCivilDate(date, 1);
    return {
      on: date,
      day: Number(date.slice(8, 10)),
      enabled: containsDate(range, date),
      count: rows.filter((row) => row.dueOn === date).length,
    };
  });
}
