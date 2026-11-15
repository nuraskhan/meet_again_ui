// Calendar days: plain dates without a time and without a time zone.
//
// WHY a file of its own, and why nothing here calls `new Date('2030-01-05')`: an availability day
// is the string "2030-01-05" - "the 5th" is the 5th for everyone. JavaScript reads such a string
// as midnight in UTC; in a zone west of UTC the local parts of that moment are already the 4th,
// and going back through toISOString() shifts a day east of UTC. So a day is only ever
//   - built from numbers: new Date(year, monthIndex, day) - local midnight, no zone conversion;
//   - written back from the LOCAL parts: getFullYear() / getMonth() / getDate();
//   - compared as a string: "2030-01-05" < "2030-01-06" sorts correctly.
// A real moment (a proposed time of a plan) is the opposite case: it is converted with
// new Date(iso) and the day it falls on is read from its local parts - see dayOfInstant().

import type { AvailabilityKind } from '@/api/types'

// The interface is in English, so dates are too - whatever the language of the browser.
const LOCALE = 'en-US'

const monthTitleFormat = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' })
const longDayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })
const longDayYearFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const shortDayFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })
const shortDayYearFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
const clockFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })

function two(value: number): string {
  return value < 10 ? '0' + value : String(value)
}

/** The local day of a Date as "2030-01-05". */
export function toYmd(moment: Date): string {
  return moment.getFullYear() + '-' + two(moment.getMonth() + 1) + '-' + two(moment.getDate())
}

/** "2030-01-05" as local midnight of that day. Only for arithmetic and for formatting. */
export function fromYmd(day: string): Date {
  const parts: number[] = day.split('-').map(Number)
  return new Date(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1)
}

/** A well-formed day, as <input type="date"> gives it. */
export function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** The day it is now, where the user is. */
export function today(): string {
  return toYmd(new Date())
}

/** The day `count` days later (earlier when negative). The Date constructor carries months and years. */
export function addDays(day: string, count: number): string {
  const start: Date = fromYmd(day)
  return toYmd(new Date(start.getFullYear(), start.getMonth(), start.getDate() + count))
}

/** The local day a real moment falls on; null if the text is not a moment. */
export function dayOfInstant(iso: string): string | null {
  const moment = new Date(iso)
  return Number.isNaN(moment.getTime()) ? null : toYmd(moment)
}

/** "18:00": the local clock time of a real moment. */
export function clockTime(iso: string): string {
  return clockFormat.format(new Date(iso))
}

/**
 * The days a month view shows: whole weeks, Sunday first (the week as calendars in the United
 * States show it), so it starts with the last days of the previous month and ends with the first
 * of the next.
 */
export function monthDays(year: number, monthIndex: number): string[] {
  // getDay() counts from Sunday, which is the first column.
  const lead: number = new Date(year, monthIndex, 1).getDay()
  const length: number = new Date(year, monthIndex + 1, 0).getDate()
  const total: number = Math.ceil((lead + length) / 7) * 7
  const days: string[] = []
  for (let index = 0; index < total; index++) {
    days.push(toYmd(new Date(year, monthIndex, 1 - lead + index)))
  }
  return days
}

/** The mark (first day to last day, both included) touches the day. */
export function covers(mark: { fromDate: string; toDate: string }, day: string): boolean {
  return mark.fromDate <= day && day <= mark.toDate
}

/** "November 2030". */
export function monthTitle(year: number, monthIndex: number): string {
  return monthTitleFormat.format(new Date(year, monthIndex, 1))
}

function isThisYear(day: string): boolean {
  return day.slice(0, 4) === today().slice(0, 4)
}

/** "Saturday, 5 November"; with the year when it is not this one. */
export function longDay(day: string): string {
  return (isThisYear(day) ? longDayFormat : longDayYearFormat).format(fromYmd(day))
}

/** "5 Nov"; with the year when it is not this one. */
export function shortDay(day: string): string {
  return (isThisYear(day) ? shortDayFormat : shortDayYearFormat).format(fromYmd(day))
}

/** "5 Nov" for one day, "5 – 9 Nov" inside a month, "28 Oct – 3 Nov" across months. */
export function dayRange(fromDate: string, toDate: string): string {
  if (fromDate === toDate) {
    return shortDay(fromDate)
  }
  if (fromDate.slice(0, 7) === toDate.slice(0, 7)) {
    return fromYmd(fromDate).getDate() + ' – ' + shortDay(toDate)
  }
  return shortDay(fromDate) + ' – ' + shortDay(toDate)
}

/**
 * What a mark says about a person, to follow their name: "busy", "free", "in Almaty".
 * Here, next to the days, because every list of marks (the calendar, a friend's page, the hints
 * of the invitation form) says it the same way.
 */
export function availabilityPhrase(kind: AvailabilityKind, city: string | null): string {
  if (kind === 'TRIP') {
    return city === null || city === '' ? 'away' : 'in ' + city
  }
  return kind === 'BUSY' ? 'busy' : 'free'
}
