export interface CalendarCell {
  day: number | null;
}

/** Строит сетку 7×n (неделя с понедельника) для месяца в формате "YYYY-MM". */
export function buildMonthGrid(monthStr: string): CalendarCell[][] {
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 0 = понедельник

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push({ day: null });

  const rows: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export function isSameMonth(monthStr: string, date = new Date()): boolean {
  const [year, month] = monthStr.split('-').map(Number);
  return date.getFullYear() === year && date.getMonth() === month - 1;
}

export const WEEKDAY_LABELS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
