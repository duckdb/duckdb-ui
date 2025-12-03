const DAYS_IN_400_YEARS = 146097; // (((365 * 4 + 1) * 25) - 1) * 4 + 1
const MILLISECONDS_PER_DAY_NUM = 86400000; // 1000 * 60 * 60 * 24

const MICROSECONDS_PER_SECOND = BigInt(1000000);
const MICROSECONDS_PER_MILLISECOND = BigInt(1000);
const NANOSECONDS_PER_MICROSECOND = BigInt(1000);
const SECONDS_PER_MINUTE = BigInt(60);
const MINUTES_PER_HOUR = BigInt(60);
const MICROSECONDS_PER_DAY = BigInt(86400000000); // 24 * 60 * 60 * 1000000

const NEGATIVE_INFINITY_TIMESTAMP = BigInt('-9223372036854775807'); // -(2^63-1)
const POSITIVE_INFINITY_TIMESTAMP = BigInt('9223372036854775807'); // 2^63-1

export function getDuckDBDateStringFromYearMonthDay(
  year: number,
  month: number,
  dayOfMonth: number,
): string {
  const yearStr = String(Math.abs(year)).padStart(4, '0');
  const monthStr = String(month).padStart(2, '0');
  const dayOfMonthStr = String(dayOfMonth).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayOfMonthStr}${year < 0 ? ' (BC)' : ''}`;
}

export function getDuckDBDateStringFromDays(days: number): string {
  const absDays = Math.abs(days);
  const sign = days < 0 ? -1 : 1;
  // 400 years is the shortest interval with a fixed number of days. (Leap years and different length months can result
  // in shorter intervals having different number of days.) By separating the number of 400 year intervals from the
  // interval covered by the remaining days, we can guarantee that the date resulting from shifting the epoch by the
  // remaining interval is within the valid range of the JS Date object. This allows us to use JS Date to calculate the
  // year, month, and day of month for the date represented by the remaining interval, thus accounting for leap years
  // and different length months. We can then safely add back the years from the 400 year intervals, because the month
  // and day of month won't change when a date is shifted by a whole number of such intervals.
  const num400YearIntervals = Math.floor(absDays / DAYS_IN_400_YEARS);
  const yearsFrom400YearIntervals = sign * num400YearIntervals * 400;
  const absDaysFromRemainingInterval = absDays % DAYS_IN_400_YEARS;
  const millisecondsFromRemainingInterval =
    sign * absDaysFromRemainingInterval * MILLISECONDS_PER_DAY_NUM;
  const date = new Date(millisecondsFromRemainingInterval);
  let year = yearsFrom400YearIntervals + date.getUTCFullYear();
  if (year < 0) {
    year--; // correct for non-existence of year zero
  }
  const month = date.getUTCMonth() + 1; // getUTCMonth returns zero-indexed month, but we want a one-index month for display
  const dayOfMonth = date.getUTCDate(); // getUTCDate returns one-indexed day-of-month
  return getDuckDBDateStringFromYearMonthDay(year, month, dayOfMonth);
}

export function getTimeZoneOffsetString(
  timeZoneOffsetInMinutes?: number,
): string | undefined {
  if (timeZoneOffsetInMinutes === undefined) {
    return undefined;
  }
  const negative = timeZoneOffsetInMinutes < 0;
  const positiveMinutes = Math.abs(timeZoneOffsetInMinutes);
  const minutesPart = positiveMinutes % 60;
  const hoursPart = Math.floor(positiveMinutes / 60);
  const minutesStr =
    minutesPart !== 0 ? String(minutesPart).padStart(2, '0') : '';
  const hoursStr = String(hoursPart).padStart(2, '0');
  return `${negative ? '-' : '+'}${hoursStr}${minutesStr ? `:${minutesStr}` : ''}`;
}

const formatterCache: { [timeZone: string]: Intl.DateTimeFormat | undefined } =
  {};

export function getFormatterForTimeZone(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache[timeZone];
  if (!formatter) {
    formatter = new Intl.DateTimeFormat([], {
      timeZone,
      timeZoneName: 'longOffset', // e.g. GMT+12:34
    });
    formatterCache[timeZone] = formatter;
  }
  return formatter;
}

export function getTimeZoneName(
  date: Date,
  timeZone: string,
): string | undefined {
  const formatter = getFormatterForTimeZone(timeZone);
  const parts = formatter.formatToParts(date);
  let timeZoneName: string | undefined;
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part.type === 'timeZoneName') {
      timeZoneName = part.value;
      break;
    }
  }
  return timeZoneName;
}

const MAX_JS_DATE_MS = 8.64e15; // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#the_epoch_timestamps_and_invalid_date
const MS_IN_400_YEARS = 12622780800000; // 1000 * 60 * 60 * 24 * 365.2425 * 400 (handles leap years)

export function getTimeZoneOffsetInMinutes(
  millisecondsSinceEpoch: number,
  timeZone: string,
): number {
  let milliseconds = millisecondsSinceEpoch;
  // Constrain milliseconds value to the valid range for JS Date. Modify value by a multiple of 400 years (in
  // milliseconds) to preserve relative place in Gregorian calendar.
  if (milliseconds < -MAX_JS_DATE_MS) {
    milliseconds +=
      Math.ceil((-MAX_JS_DATE_MS - milliseconds) / MS_IN_400_YEARS) *
      MS_IN_400_YEARS;
  } else if (milliseconds > MAX_JS_DATE_MS) {
    milliseconds -=
      Math.ceil((milliseconds - MAX_JS_DATE_MS) / MS_IN_400_YEARS) *
      MS_IN_400_YEARS;
  }
  const date = new Date(milliseconds);
  const timeZoneName = getTimeZoneName(date, timeZone);
  if (!timeZoneName) {
    return 0;
  }
  const match = timeZoneName.match(/GMT(.)(\d\d):(\d\d)/);
  if (!match) {
    return 0;
  }
  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3], 10);
  return sign * (hours * 60 + minutes);
}

export function getAbsoluteOffsetStringFromParts(
  hoursPart: number,
  minutesPart: number,
  secondsPart: number,
): string {
  const hoursStr = String(hoursPart).padStart(2, '0');
  const minutesStr =
    minutesPart !== 0 || secondsPart !== 0
      ? String(minutesPart).padStart(2, '0')
      : '';
  const secondsStr =
    secondsPart !== 0 ? String(secondsPart).padStart(2, '0') : '';
  let result = hoursStr;
  if (minutesStr) {
    result += `:${minutesStr}`;
    if (secondsStr) {
      result += `:${secondsStr}`;
    }
  }
  return result;
}

export function getOffsetStringFromAbsoluteSeconds(
  absoluteOffsetInSeconds: number,
): string {
  const secondsPart = absoluteOffsetInSeconds % 60;
  const minutes = Math.floor(absoluteOffsetInSeconds / 60);
  const minutesPart = minutes % 60;
  const hoursPart = Math.floor(minutes / 60);
  return getAbsoluteOffsetStringFromParts(hoursPart, minutesPart, secondsPart);
}

export function getOffsetStringFromSeconds(offsetInSeconds: number): string {
  const negative = offsetInSeconds < 0;
  const absoluteOffsetInSeconds = negative ? -offsetInSeconds : offsetInSeconds;
  const absoluteString = getOffsetStringFromAbsoluteSeconds(
    absoluteOffsetInSeconds,
  );
  return `${negative ? '-' : '+'}${absoluteString}`;
}

export function getDuckDBTimeStringFromParts(
  hoursPart: bigint,
  minutesPart: bigint,
  secondsPart: bigint,
  microsecondsPart: bigint,
): string {
  const hoursStr = String(hoursPart).padStart(2, '0');
  const minutesStr = String(minutesPart).padStart(2, '0');
  const secondsStr = String(secondsPart).padStart(2, '0');
  const microsecondsStr = String(microsecondsPart)
    .padStart(6, '0')
    .replace(/0+$/, '');
  return `${hoursStr}:${minutesStr}:${secondsStr}${
    microsecondsStr.length > 0 ? `.${microsecondsStr}` : ''
  }`;
}

export function getDuckDBTimeStringFromPositiveMicroseconds(
  positiveMicroseconds: bigint,
): string {
  const microsecondsPart = positiveMicroseconds % MICROSECONDS_PER_SECOND;
  const seconds = positiveMicroseconds / MICROSECONDS_PER_SECOND;
  const secondsPart = seconds % SECONDS_PER_MINUTE;
  const minutes = seconds / SECONDS_PER_MINUTE;
  const minutesPart = minutes % MINUTES_PER_HOUR;
  const hoursPart = minutes / MINUTES_PER_HOUR;
  return getDuckDBTimeStringFromParts(
    hoursPart,
    minutesPart,
    secondsPart,
    microsecondsPart,
  );
}

export function getDuckDBTimeStringFromMicrosecondsInDay(
  microsecondsInDay: bigint,
): string {
  const positiveMicroseconds =
    microsecondsInDay < 0
      ? microsecondsInDay + MICROSECONDS_PER_DAY
      : microsecondsInDay;
  return getDuckDBTimeStringFromPositiveMicroseconds(positiveMicroseconds);
}

export function getDuckDBTimeStringFromMicroseconds(
  microseconds: bigint,
): string {
  const negative = microseconds < 0;
  const positiveMicroseconds = negative ? -microseconds : microseconds;
  const positiveString =
    getDuckDBTimeStringFromPositiveMicroseconds(positiveMicroseconds);
  return negative ? `-${positiveString}` : positiveString;
}

export function getDuckDBTimestampStringFromDaysAndMicroseconds(
  days: bigint,
  microsecondsInDay: bigint,
  timeZonePart?: string,
): string {
  // This conversion of BigInt to Number is safe, because the largest absolute value that `days` can has is 106751991,
  // which fits without loss of precision in a JS Number. (106751991 = (2^63-1) / MICROSECONDS_PER_DAY)
  const dateStr = getDuckDBDateStringFromDays(Number(days));
  const timeStr = getDuckDBTimeStringFromMicrosecondsInDay(microsecondsInDay);
  return `${dateStr} ${timeStr}${timeZonePart ?? ''}`;
}

export function getDuckDBTimestampStringFromMicroseconds(
  microseconds: bigint,
  timeZone?: string,
): string {
  // Note that -infinity and infinity are only representable in TIMESTAMP (and TIMESTAMPTZ), not the other timestamp
  // variants. This is by-design and matches DuckDB.
  if (microseconds === NEGATIVE_INFINITY_TIMESTAMP) {
    return '-infinity';
  }
  if (microseconds === POSITIVE_INFINITY_TIMESTAMP) {
    return 'infinity';
  }
  const timeZoneOffsetInMinutes = timeZone
    ? getTimeZoneOffsetInMinutes(
        Number(microseconds / MICROSECONDS_PER_MILLISECOND),
        timeZone,
      )
    : undefined;
  const offsetMicroseconds =
    timeZoneOffsetInMinutes !== undefined
      ? microseconds +
        BigInt(timeZoneOffsetInMinutes) *
          MICROSECONDS_PER_SECOND *
          SECONDS_PER_MINUTE
      : microseconds;
  let days = offsetMicroseconds / MICROSECONDS_PER_DAY;
  let microsecondsPart = offsetMicroseconds % MICROSECONDS_PER_DAY;
  if (microsecondsPart < 0) {
    days--;
    microsecondsPart += MICROSECONDS_PER_DAY;
  }
  return getDuckDBTimestampStringFromDaysAndMicroseconds(
    days,
    microsecondsPart,
    getTimeZoneOffsetString(timeZoneOffsetInMinutes),
  );
}

export function getDuckDBTimestampStringFromSeconds(seconds: bigint): string {
  return getDuckDBTimestampStringFromMicroseconds(
    seconds * MICROSECONDS_PER_SECOND,
  );
}

export function getDuckDBTimestampStringFromMilliseconds(
  milliseconds: bigint,
): string {
  return getDuckDBTimestampStringFromMicroseconds(
    milliseconds * MICROSECONDS_PER_MILLISECOND,
  );
}

export function getDuckDBTimestampStringFromNanoseconds(
  nanoseconds: bigint,
): string {
  // Note that this division causes loss of precision. This matches the behavior of the DuckDB. It's important that this
  // precision loss happen before the negative correction in getTimestampStringFromMicroseconds, otherwise off-by-one
  // errors can occur.
  return getDuckDBTimestampStringFromMicroseconds(
    nanoseconds / NANOSECONDS_PER_MICROSECOND,
  );
}

// Assumes baseUnit can be pluralized by adding an 's'.
function numberAndUnit(value: number, baseUnit: string): string {
  return `${value} ${baseUnit}${value !== 1 ? 's' : ''}`;
}

export function getDuckDBIntervalString(
  months: number,
  days: number,
  microseconds: bigint,
): string {
  const parts: string[] = [];
  if (months !== 0) {
    const sign = months < 0 ? -1 : 1;
    const absMonths = Math.abs(months);
    const absYears = Math.floor(absMonths / 12);
    const years = sign * absYears;
    const extraMonths = sign * (absMonths - absYears * 12);
    if (years !== 0) {
      parts.push(numberAndUnit(years, 'year'));
    }
    if (extraMonths !== 0) {
      parts.push(numberAndUnit(extraMonths, 'month'));
    }
  }
  if (days !== 0) {
    parts.push(numberAndUnit(days, 'day'));
  }
  if (microseconds !== BigInt(0)) {
    parts.push(getDuckDBTimeStringFromMicroseconds(microseconds));
  }
  if (parts.length > 0) {
    return parts.join(' ');
  }
  return '00:00:00';
}
