// How values are shown. One place, so a price or a date looks the same on every screen.

import type { EventTypeCode } from '@/api/types'

/** The picture and the short name of every event type. */
export const EVENT_TYPE_LOOK: Record<EventTypeCode, { icon: string; label: string }> = {
  BATH: { icon: '🧖', label: 'Bathhouse' },
  FOOD: { icon: '🍜', label: 'Eat together' },
  COFFEE: { icon: '☕', label: 'Coffee' },
  BAR: { icon: '🍸', label: 'Bar' },
  WALK: { icon: '🚶', label: 'Walk' },
  CINEMA: { icon: '🎬', label: 'Cinema' },
  SPORT: { icon: '⚽', label: 'Sport' },
  BOARD_GAMES: { icon: '🎲', label: 'Board games' },
  OTHER: { icon: '✨', label: 'Something else' },
}

/** The currency sign shown after a price. The server stores prices as plain numbers. */
const CURRENCY = '₸'

const numberFormat = new Intl.NumberFormat('en-US')

function money(value: number): string {
  // 15000 -> "15 000": a thin space reads better than a comma next to the currency sign.
  return numberFormat.format(value).replace(/,/g, ' ')
}

/** "Free", "up to 5 000 ₸", "5 000 – 15 000 ₸". */
export function priceRange(min: number, max: number): string {
  if (max === 0) {
    return 'Free'
  }
  if (min === 0) {
    return 'up to ' + money(max) + ' ' + CURRENCY
  }
  if (min === max) {
    return money(min) + ' ' + CURRENCY
  }
  return money(min) + ' – ' + money(max) + ' ' + CURRENCY
}

/** "within 5 km", "5 – 10 km". */
export function distanceRange(minKm: number, maxKm: number): string {
  if (minKm === 0) {
    return 'within ' + maxKm + ' km'
  }
  if (minKm === maxKm) {
    return minKm + ' km away'
  }
  return minKm + ' – ' + maxKm + ' km'
}

// The interface is in English, so dates are too - whatever the language of the browser.
const LOCALE = 'en-GB'

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

/** When an event starts, or the words for "not decided". */
export function startsAt(iso: string | null): string {
  return iso === null ? 'Time to be agreed' : dateTime(iso)
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
