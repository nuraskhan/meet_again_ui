// How values are shown. One place, so a price or a date looks the same on every screen.

import type { EventTypeCode } from '@/api/types'

/** The short name of every event type. Its picture is components/EventTypeIcon.vue. */
export const EVENT_TYPE_LOOK: Record<EventTypeCode, { label: string }> = {
  BATH: { label: 'Bathhouse' },
  FOOD: { label: 'Eat together' },
  COFFEE: { label: 'Coffee' },
  BAR: { label: 'Bar' },
  WALK: { label: 'Walk' },
  CINEMA: { label: 'Cinema' },
  SPORT: { label: 'Sport' },
  BOARD_GAMES: { label: 'Board games' },
  OTHER: { label: 'Something else' },
}

/** The currency sign shown before a price: US dollars. The server stores prices as plain numbers. */
const CURRENCY = '$'

const numberFormat = new Intl.NumberFormat('en-US')

/** 1500 -> "$1,500": the sign first and a comma for thousands, as dollars are written. */
function money(value: number): string {
  return CURRENCY + numberFormat.format(value)
}

/** "Free", "up to $40", "$20 – $60". */
export function priceRange(min: number, max: number): string {
  if (max === 0) {
    return 'Free'
  }
  if (min === 0) {
    return 'up to ' + money(max)
  }
  if (min === max) {
    return money(min)
  }
  return money(min) + ' – ' + money(max)
}

/** "within 5 mi", "5 – 10 mi". Distances are in miles everywhere. */
export function distanceRange(minMi: number, maxMi: number): string {
  if (minMi === 0) {
    return 'within ' + maxMi + ' mi'
  }
  if (minMi === maxMi) {
    return minMi + ' mi away'
  }
  return minMi + ' – ' + maxMi + ' mi'
}

// The interface is in English, so dates are too - whatever the language of the browser.
const LOCALE = 'en-US'

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })

/** A moment from the server in the time zone of the browser: "Sat, 19 Nov, 18:00". */
export function dateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

/** The proposed dates in one line: "Time to be agreed", "Sat, 19 Nov, 18:00", or the first one "+2 more". */
export function proposedTimesSummary(times: string[]): string {
  const first: string | undefined = times[0]
  if (first === undefined) {
    return 'Time to be agreed'
  }
  return times.length === 1 ? dateTime(first) : dateTime(first) + ' +' + (times.length - 1) + ' more'
}

/** The address people open to see an invitation. */
export function inviteLink(shareToken: string): string {
  return window.location.origin + '/i/' + encodeURIComponent(shareToken)
}

export function date(iso: string): string {
  return dateFormat.format(new Date(iso))
}

/** For chat bubbles: the time today, the date and time otherwise. */
export function messageTime(iso: string): string {
  const moment = new Date(iso)
  const today = new Date()
  const sameDay: boolean =
    moment.getFullYear() === today.getFullYear() &&
    moment.getMonth() === today.getMonth() &&
    moment.getDate() === today.getDate()

  return sameDay ? timeFormat.format(moment) : dateTimeFormat.format(moment)
}

/** The value of <input type="datetime-local"> (local time, no zone) as a UTC moment for the server. */
export function localInputToIso(value: string): string | null {
  if (value === '') {
    return null
  }
  const moment = new Date(value)
  return Number.isNaN(moment.getTime()) ? null : moment.toISOString()
}

/** Up to two letters for an avatar without a picture: "Alice Brown" -> "AB". */
export function initials(name: string): string {
  const words: string[] = name.trim().split(/\s+/).filter((word) => word !== '')
  const first: string = words[0]?.charAt(0) ?? '?'
  const second: string = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? '') : ''
  return (first + second).toUpperCase()
}
