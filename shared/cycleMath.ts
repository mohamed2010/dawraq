export type CycleRecordForStats = {
  id: number;
  startDate: string;
  endDate: string | null;
};

export type CycleStatistics = {
  averageCycleLength: number;
  averagePeriodDuration: number | null;
  nextPeriodStart: string | null;
  ovulationDate: string | null;
  fertileStart: string | null;
  fertileEnd: string | null;
  daysAfterOvulation: number | null;
  shortestCycleLength: number | null;
  longestCycleLength: number | null;
  isIrregular: boolean;
  predictionRangeStart: string | null;
  predictionRangeEnd: string | null;
  currentPeriodDay: number | null;
  lastRecord: CycleRecordForStats | null;
};

function toDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(dateKeyValue: string, days: number): string {
  const value = toDate(dateKeyValue);
  value.setDate(value.getDate() + days);
  return dateKey(value);
}

export function daysBetween(later: string, earlier: string): number {
  return Math.round((toDate(later).getTime() - toDate(earlier).getTime()) / 86_400_000);
}

export function daysInRange(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  let value = startDate;
  while (value <= endDate) {
    result.push(value);
    value = addCalendarDays(value, 1);
  }
  return result;
}

export function calculateCycleStatistics(
  records: CycleRecordForStats[],
  fallbackCycleLength = 28,
  today = dateKey(new Date()),
): CycleStatistics {
  const sorted = [...records].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const cycleIntervals = sorted.slice(1).map((record, index) =>
    daysBetween(record.startDate, sorted[index].startDate),
  ).filter(value => value >= 15 && value <= 60);
  const completedDurations = sorted
    .filter(record => record.endDate)
    .map(record => daysBetween(record.endDate!, record.startDate) + 1)
    .filter(value => value >= 1 && value <= 14);
  const averageCycleLength = cycleIntervals.length
    ? Math.round(cycleIntervals.reduce((sum, value) => sum + value, 0) / cycleIntervals.length)
    : fallbackCycleLength;
  const averagePeriodDuration = completedDurations.length
    ? Math.round(completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length)
    : null;
  const lastRecord = sorted.at(-1) ?? null;
  const nextPeriodStart = lastRecord ? addCalendarDays(lastRecord.startDate, averageCycleLength) : null;
  const ovulationDate = nextPeriodStart ? addCalendarDays(nextPeriodStart, -14) : null;
  const fertileStart = ovulationDate ? addCalendarDays(ovulationDate, -5) : null;
  const fertileEnd = ovulationDate ? addCalendarDays(ovulationDate, 1) : null;
  const shortestCycleLength = cycleIntervals.length ? Math.min(...cycleIntervals) : null;
  const longestCycleLength = cycleIntervals.length ? Math.max(...cycleIntervals) : null;
  const isIrregular = shortestCycleLength !== null && longestCycleLength !== null && longestCycleLength - shortestCycleLength >= 7;
  const rangePadding = shortestCycleLength !== null && longestCycleLength !== null ? Math.ceil((longestCycleLength - shortestCycleLength) / 2) : 0;
  const predictionRangeStart = nextPeriodStart ? addCalendarDays(nextPeriodStart, -rangePadding) : null;
  const predictionRangeEnd = nextPeriodStart ? addCalendarDays(nextPeriodStart, rangePadding) : null;
  const daysAfterOvulation = ovulationDate && nextPeriodStart && today >= ovulationDate && today < nextPeriodStart ? daysBetween(today, ovulationDate) : null;
  const currentPeriodDay = lastRecord && !lastRecord.endDate && lastRecord.startDate <= today
    ? daysBetween(today, lastRecord.startDate) + 1
    : null;

  return {
    averageCycleLength,
    averagePeriodDuration,
    nextPeriodStart,
    ovulationDate,
    fertileStart,
    fertileEnd,
    daysAfterOvulation,
    shortestCycleLength,
    longestCycleLength,
    isIrregular,
    predictionRangeStart,
    predictionRangeEnd,
    currentPeriodDay,
    lastRecord,
  };
}
