<script setup lang="ts">
// The calendar: one month in which the user sees everything that decides whether a day is free -
// their plans, the days they marked themselves (busy, free, away on a trip) and whether friends
// marked anything. Choosing a day shows it in words under (or beside) the grid, and days are
// marked from there.
//
// Self-contained: it loads what it shows. `compact` is for the narrow rail beside the feed.
//
// Days are plain dates, proposed times of plans are real moments: see lib/dates.ts for how the
// two are kept apart.

import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-vue-next'
import { api } from '@/api'
import type { Availability, AvailabilityKind, EventDto, EventTypeCode, FriendAvailability, SaveAvailabilityRequest } from '@/api/types'
import EventTypeIcon from '@/components/EventTypeIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import {
  addDays,
  availabilityPhrase,
  clockTime,
  covers,
  dayOfInstant,
  dayRange,
  fromYmd,
  isYmd,
  longDay,
  monthDays,
  monthTitle,
  today,
  toYmd,
} from '@/lib/dates'
import { toastError, toastOk } from '@/stores/toast'

const props = withDefaults(
  defineProps<{
    /** A narrow place (the 320px rail): lower day cells, everything in one column. */
    compact?: boolean
  }>(),
  { compact: false },
)

const WEEKDAYS: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const KINDS: AvailabilityKind[] = ['BUSY', 'FREE', 'TRIP']
const KIND_LABEL: Record<AvailabilityKind, string> = { BUSY: 'Busy', FREE: 'Free', TRIP: 'Trip' }

/** A day cell has room for this many bands; a third mark on one day is seen in the details. */
const MAX_BANDS: number = 2

/**
 * A plan is a line under the date, one line per plan, in the colour of its activity. Up to this
 * many lines fit; a day with more plans shows their number instead, on a tint of the same colour.
 * (It used to be a dot with a number beside the date: "2" next to "21" read as part of the date.)
 */
const MAX_PLAN_LINES: number = 3

/** The colour a plan's line has, by its activity: the same hues as the pictures of the activities. */
const PLAN_COLOUR: Record<EventTypeCode, string> = {
  BATH: '#b5651d',
  FOOD: '#c0392b',
  COFFEE: '#6f4e37',
  BAR: '#7d3c98',
  WALK: '#2e7d4f',
  CINEMA: '#34495e',
  SPORT: '#1f6f8b',
  BOARD_GAMES: '#b8860b',
  OTHER: '#8a5a2b',
}

/** The server's limits are not known here; these only keep a pasted novel out. */
const MAX_CITY_LENGTH: number = 100
const MAX_NOTE_LENGTH: number = 200

// ------------------------------------------------------------------ the month shown

/** The day the component was opened on; "today" in the grid. */
const now: string = today()

const year = ref<number>(fromYmd(now).getFullYear())
/** 0 = January. */
const month = ref<number>(fromYmd(now).getMonth())
const selected = ref<string>(now)

const root = ref<HTMLElement | null>(null)

/** Every day of the grid, the leading and trailing days of the neighbour months included. */
const days = computed<string[]>(() => monthDays(year.value, month.value))
const title = computed<string>(() => monthTitle(year.value, month.value))
/** "2030-01": what a day of the shown month begins with. */
const monthPrefix = computed<string>(() => toYmd(new Date(year.value, month.value, 1)).slice(0, 7))

function step(by: number): void {
  const moved = new Date(year.value, month.value + by, 1)
  show(moved.getFullYear(), moved.getMonth())
}

function show(toYear: number, toMonth: number): void {
  year.value = toYear
  month.value = toMonth
  // The details always describe a day that is in sight: today if the month has it, else its first.
  if (!selected.value.startsWith(monthPrefix.value)) {
    selected.value = now.startsWith(monthPrefix.value) ? now : monthPrefix.value + '-01'
  }
}

function goToday(): void {
  selected.value = now
  show(fromYmd(now).getFullYear(), fromYmd(now).getMonth())
}

/** The arrow keys walk the grid, as in any calendar; Tab alone would be 42 stops. */
function onDayKey(event: KeyboardEvent, day: string): void {
  const by: number | undefined = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]
  if (by === undefined || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return
  }
  const target: HTMLElement | null | undefined = root.value?.querySelector<HTMLElement>(
    '[data-date="' + addDays(day, by) + '"]',
  )
  if (target) {
    event.preventDefault()
    target.focus()
  }
}

// ------------------------------------------------------------------ what is loaded

const loading = ref<boolean>(true)
const plans = ref<EventDto[]>([])
const mine = ref<Availability[]>([])
const friends = ref<FriendAvailability[]>([])

/** Counts the requests: an answer for a month that is no longer shown is dropped. */
let asked: number = 0

onMounted(() => load(false))
watch([year, month], () => load(false))

/** @param quiet true = keep the grid in place (after a change of one's own marks), no skeleton */
async function load(quiet: boolean): Promise<void> {
  const from: string | undefined = days.value[0]
  const to: string | undefined = days.value[days.value.length - 1]
  if (from === undefined || to === undefined) {
    return
  }
  const request: number = ++asked
  if (!quiet) {
    loading.value = true
  }
  try {
    const [own, others, events] = await Promise.all([
      api.availability(from, to),
      api.friendsAvailability(from, to),
      api.events(),
    ])
    if (request !== asked) {
      return
    }
    // Earliest first, so a band keeps its place in the cells from day to day.
    mine.value = [...own].sort((a, b) => a.fromDate.localeCompare(b.fromDate) || a.id - b.id)
    friends.value = others
    plans.value = events.filter((event) => event.status === 'ACTIVE')
  } catch (caught) {
    if (request === asked) {
      toastError(caught)
    }
  } finally {
    if (request === asked) {
      loading.value = false
    }
  }
}

// ------------------------------------------------------------------ the grid

interface PlanOnDay {
  event: EventDto
  /** Its proposed moments that fall on the day, earliest first. */
  times: string[]
}

/** The plans by the LOCAL day of each proposed time: a plan with three dates stands on three days. */
const plansByDay = computed<Map<string, PlanOnDay[]>>(() => {
  const byDay = new Map<string, PlanOnDay[]>()
  for (const event of plans.value) {
    for (const time of event.proposedTimes) {
      const day: string | null = dayOfInstant(time)
      if (day === null) {
        continue
      }
      const list: PlanOnDay[] = byDay.get(day) ?? []
      const known: PlanOnDay | undefined = list.find((entry) => entry.event.id === event.id)
      if (known === undefined) {
        list.push({ event, times: [time] })
      } else {
        known.times.push(time)
      }
      byDay.set(day, list)
    }
  }
  return byDay
})

interface Band {
  id: number
  kind: AvailabilityKind
  /** The first / the last day of the mark: the band gets a rounded end there. */
  start: boolean
  end: boolean
}

interface DayCell {
  date: string
  number: number
  inMonth: boolean
  today: boolean
  plans: number
  /** The colour of each plan of the day, in order; empty when there are too many for lines. */
  planLines: string[]
  /** The colour behind the number, when the plans are shown as a number. */
  planTint: string
  bands: Band[]
  /** How many friends marked something for the day. */
  friends: number
  /** Everything above in words, for a screen reader. */
  label: string
}

const cells = computed<DayCell[]>(() =>
  days.value.map((date: string): DayCell => {
    const marks: Availability[] = mine.value.filter((mark) => covers(mark, date))
    const dayPlans: PlanOnDay[] = plansByDay.value.get(date) ?? []
    const planCount: number = dayPlans.length
    const friendCount: number = new Set<number>(
      friends.value.filter((mark) => covers(mark, date)).map((mark) => mark.userId),
    ).size

    const words: string[] = [longDay(date)]
    if (date === now) words.push('today')
    if (planCount > 0) words.push(planCount === 1 ? '1 plan' : planCount + ' plans')
    for (const mark of marks) {
      words.push(mark.kind === 'TRIP' ? 'trip' + (mark.city ? ' to ' + mark.city : '') : KIND_LABEL[mark.kind])
    }
    if (friendCount > 0) words.push(friendCount === 1 ? '1 friend has a mark' : friendCount + ' friends have marks')

    return {
      date,
      number: fromYmd(date).getDate(),
      inMonth: date.startsWith(monthPrefix.value),
      today: date === now,
      plans: planCount,
      planLines: planCount > MAX_PLAN_LINES ? [] : dayPlans.map((plan) => PLAN_COLOUR[plan.event.eventType]),
      planTint: dayPlans.length > 0 ? PLAN_COLOUR[dayPlans[0]!.event.eventType] : '',
      bands: marks.slice(0, MAX_BANDS).map((mark) => ({
        id: mark.id,
        kind: mark.kind,
        start: mark.fromDate === date,
        end: mark.toDate === date,
      })),
      friends: friendCount,
      label: words.join(', '),
    }
  }),
)

// ------------------------------------------------------------------ the chosen day

const dayPlans = computed<PlanOnDay[]>(() => plansByDay.value.get(selected.value) ?? [])
const dayMarks = computed<Availability[]>(() => mine.value.filter((mark) => covers(mark, selected.value)))
const dayFriends = computed<FriendAvailability[]>(() =>
  friends.value.filter((mark) => covers(mark, selected.value)),
)

/** Why the day is taken, in sentences; empty = the day is free. */
const busyReasons = computed<string[]>(() => {
  const reasons: string[] = []
  if (dayPlans.value.length > 0) {
    reasons.push(dayPlans.value.length === 1 ? 'A plan falls on this day.' : 'Plans fall on this day.')
  }
  if (dayMarks.value.some((mark) => mark.kind === 'BUSY')) {
    reasons.push('You marked it as busy.')
  }
  const trip: Availability | undefined = dayMarks.value.find((mark) => mark.kind === 'TRIP')
  if (trip !== undefined) {
    reasons.push('You are away' + (trip.city ? ' in ' + trip.city : '') + '.')
  }
  return reasons
})

const freeText = computed<string>(() =>
  dayMarks.value.some((mark) => mark.kind === 'FREE')
    ? 'You marked this day as free.'
    : 'Nothing is planned or marked: the day is free.',
)

function times(entry: PlanOnDay): string {
  return entry.times.map(clockTime).join(', ')
}

// ------------------------------------------------------------------ removing a mark

/** The mark whose "Remove" was pressed: it asks once more, in its own line. */
const confirming = ref<number | null>(null)
const removing = ref<number | null>(null)

async function remove(mark: Availability): Promise<void> {
  removing.value = mark.id
  try {
    await api.removeAvailability(mark.id)
    toastOk('Mark removed')
    await load(true)
  } catch (caught) {
    toastError(caught)
  } finally {
    removing.value = null
    confirming.value = null
  }
}

// ------------------------------------------------------------------ marking days

const formOpen = ref<boolean>(false)
const saving = ref<boolean>(false)
/** What is wrong and with which field, found before sending; null = nothing. */
const formError = ref<{ field: 'dates' | 'city'; text: string } | null>(null)

const form = reactive<{ kind: AvailabilityKind; fromDate: string; toDate: string; city: string; note: string }>({
  kind: 'BUSY',
  fromDate: now,
  toDate: now,
  city: '',
  note: '',
})

function openForm(): void {
  form.kind = 'BUSY'
  form.fromDate = selected.value
  form.toDate = selected.value
  form.city = ''
  form.note = ''
  formError.value = null
  formOpen.value = true
}

// While the form is open a click on a day is the quickest way to say which day is meant.
watch(selected, (day: string) => {
  confirming.value = null
  if (formOpen.value) {
    form.fromDate = day
    form.toDate = day
  }
})

async function save(): Promise<void> {
  if (!isYmd(form.fromDate) || !isYmd(form.toDate)) {
    formError.value = { field: 'dates', text: 'Choose the first and the last day.' }
    return
  }
  if (form.toDate < form.fromDate) {
    formError.value = { field: 'dates', text: 'The last day is before the first.' }
    return
  }
  if (form.kind === 'TRIP' && form.city.trim() === '') {
    formError.value = { field: 'city', text: 'Say where the trip is to.' }
    return
  }
  formError.value = null

  const request: SaveAvailabilityRequest = { kind: form.kind, fromDate: form.fromDate, toDate: form.toDate }
  if (form.kind === 'TRIP') {
    request.city = form.city.trim()
  }
  if (form.note.trim() !== '') {
    request.note = form.note.trim()
  }

  saving.value = true
  try {
    await api.addAvailability(request)
    toastOk('Days marked')
    formOpen.value = false

    // Show what was just marked: its first day, in its month.
    const first: Date = fromYmd(request.fromDate)
    const sameMonth: boolean = first.getFullYear() === year.value && first.getMonth() === month.value
    selected.value = request.fromDate
    if (sameMonth) {
      await load(true)
    } else {
      // Changing the month loads it (the watcher above).
      year.value = first.getFullYear()
      month.value = first.getMonth()
    }
  } catch (caught) {
    toastError(caught)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section ref="root" class="calendar" :class="{ 'calendar--compact': props.compact }" data-tst-id="calendar">
    <div class="calendar__body">
      <!-- ---------------------------------------------------------- the month -->
      <div class="calendar__month">
        <div class="calendar__head">
          <h2 class="calendar__title" aria-live="polite">{{ title }}</h2>
          <button
            class="hg-btn hg-btn--quiet hg-btn--sm"
            type="button"
            data-tst-id="calendar-today"
            @click="goToday"
          >
            <span>Today</span>
          </button>
          <button
            class="hg-iconbtn"
            type="button"
            aria-label="Previous month"
            title="Previous month"
            data-tst-id="calendar-prev"
            @click="step(-1)"
          >
            <ChevronLeft class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          </button>
          <button
            class="hg-iconbtn"
            type="button"
            aria-label="Next month"
            title="Next month"
            data-tst-id="calendar-next"
            @click="step(1)"
          >
            <ChevronRight class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          </button>
        </div>

        <div class="calendar__weekdays" aria-hidden="true">
          <span v-for="weekday in WEEKDAYS" :key="weekday" class="calendar__weekday">{{ weekday }}</span>
        </div>

        <!-- Loading: the same grid, empty. -->
        <div v-if="loading" class="calendar__grid" aria-busy="true">
          <span class="hg-sr">Loading the month</span>
          <span v-for="day in days" :key="day" class="hg-skel calendar__skel" aria-hidden="true"></span>
        </div>

        <div v-else class="calendar__grid" role="group" :aria-label="title">
          <button
            v-for="cell in cells"
            :key="cell.date"
            class="calendar__day"
            :class="{ 'calendar__day--out': !cell.inMonth, 'calendar__day--today': cell.today }"
            type="button"
            :aria-pressed="cell.date === selected"
            :aria-current="cell.today ? 'date' : undefined"
            :aria-label="cell.label"
            :data-date="cell.date"
            data-tst-id="calendar-day"
            @click="selected = cell.date"
            @keydown="onDayKey($event, cell.date)"
          >
            <span class="calendar__day-top">
              <span class="calendar__number hg-num">{{ cell.number }}</span>
              <span class="calendar__signs">
                <span v-if="cell.friends > 0" class="calendar__dot calendar__dot--friends"></span>
              </span>
            </span>
            <!-- The plans of the day, under the date: a soft coloured line each; with more than
                 three, their number on the same soft colour. -->
            <span v-if="cell.plans > 0" class="calendar__plans" data-tst-id="calendar-day-plans">
              <span
                v-for="(colour, index) in cell.planLines"
                :key="index"
                class="calendar__plan-line"
                :style="{ '--plan': colour }"
              ></span>
              <span
                v-if="cell.planLines.length === 0"
                class="calendar__plan-count hg-num"
                :style="{ '--plan': cell.planTint }"
              >
                {{ cell.plans }}
              </span>
            </span>
            <!-- The user's own marks: a band per mark, unbroken from its first day to its last. -->
            <span class="calendar__bands">
              <span
                v-for="band in cell.bands"
                :key="band.id"
                class="calendar__band"
                :class="[
                  'calendar__band--' + band.kind,
                  { 'calendar__band--start': band.start, 'calendar__band--end': band.end },
                ]"
              ></span>
            </span>
          </button>
        </div>

        <!-- Each sign differs by its shape, not only by its colour. -->
        <ul class="calendar__legend" aria-label="Legend">
          <li class="calendar__legend-item">
            <span class="calendar__band calendar__band--BUSY calendar__swatch"></span>
            Busy
          </li>
          <li class="calendar__legend-item">
            <span class="calendar__band calendar__band--FREE calendar__swatch"></span>
            Free
          </li>
          <li class="calendar__legend-item">
            <span class="calendar__band calendar__band--TRIP calendar__swatch"></span>
            Trip
          </li>
          <li class="calendar__legend-item">
            <span class="calendar__plan-line calendar__swatch" :style="{ '--plan': PLAN_COLOUR.FOOD }"></span>
            Plan
          </li>
          <li class="calendar__legend-item">
            <span class="calendar__dot calendar__dot--friends"></span>
            Friends' marks
          </li>
        </ul>
      </div>

      <!-- ---------------------------------------------------------- the chosen day -->
      <div class="calendar__details" data-tst-id="calendar-details">
        <div class="calendar__details-head">
          <h3 class="calendar__details-title">{{ longDay(selected) }}</h3>
          <span
            v-if="!loading"
            class="hg-badge"
            :class="busyReasons.length === 0 ? 'hg-badge--success' : 'hg-badge--warning'"
            data-tst-id="calendar-status"
          >
            {{ busyReasons.length === 0 ? 'Free' : 'Busy' }}
          </span>
        </div>

        <template v-if="loading">
          <span class="hg-skel hg-skel--line calendar__skel-line"></span>
          <span class="hg-skel hg-skel--line calendar__skel-line calendar__skel-line--short"></span>
        </template>

        <template v-else>
          <p class="calendar__state">{{ busyReasons.length === 0 ? freeText : busyReasons.join(' ') }}</p>

          <!-- Plans of the day -->
          <ul v-if="dayPlans.length > 0" class="calendar__list" aria-label="Plans">
            <li v-for="entry in dayPlans" :key="entry.event.id">
              <RouterLink
                class="calendar__item calendar__item--link"
                :to="{ name: 'plan', params: { eventId: entry.event.id } }"
                data-tst-id="calendar-plan"
              >
                <EventTypeIcon :type="entry.event.eventType" :size="16" />
                <span class="calendar__item-text">
                  <b class="calendar__item-title">{{ entry.event.title }}</b>
                  <span class="calendar__item-sub hg-num">{{ times(entry) }}</span>
                </span>
              </RouterLink>
            </li>
          </ul>

          <!-- The user's own marks -->
          <ul v-if="dayMarks.length > 0" class="calendar__list" aria-label="Your marks">
            <li v-for="mark in dayMarks" :key="mark.id" class="calendar__item" data-tst-id="calendar-mark">
              <span class="calendar__band calendar__swatch" :class="'calendar__band--' + mark.kind"></span>
              <span class="calendar__item-text">
                <b class="calendar__item-title">
                  {{ KIND_LABEL[mark.kind] }}<template v-if="mark.city"> to {{ mark.city }}</template>
                </b>
                <span class="calendar__item-sub hg-num">{{ dayRange(mark.fromDate, mark.toDate) }}</span>
                <span v-if="mark.note" class="calendar__item-note">{{ mark.note }}</span>

                <!-- Asking once more happens here, in the line of the mark, not in a dialog. -->
                <span v-if="confirming === mark.id" class="calendar__confirm">
                  <span>Remove this mark?</span>
                  <button
                    class="hg-btn hg-btn--danger hg-btn--sm"
                    :class="{ 'is-loading': removing === mark.id }"
                    type="button"
                    :disabled="removing === mark.id"
                    data-tst-id="calendar-mark-remove-confirm"
                    @click="remove(mark)"
                  >
                    <span>Remove</span>
                  </button>
                  <button
                    class="hg-btn hg-btn--quiet hg-btn--sm"
                    type="button"
                    :disabled="removing === mark.id"
                    data-tst-id="calendar-mark-remove-cancel"
                    @click="confirming = null"
                  >
                    <span>Keep</span>
                  </button>
                </span>
              </span>
              <button
                v-if="confirming !== mark.id"
                class="hg-iconbtn"
                type="button"
                :aria-label="'Remove the mark ' + KIND_LABEL[mark.kind] + ', ' + dayRange(mark.fromDate, mark.toDate)"
                title="Remove"
                data-tst-id="calendar-mark-remove"
                @click="confirming = mark.id"
              >
                <Trash2 class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              </button>
            </li>
          </ul>

          <!-- Friends: what they marked, never why - their notes are not sent to anyone. -->
          <ul v-if="dayFriends.length > 0" class="calendar__list" aria-label="Friends">
            <li
              v-for="(mark, index) in dayFriends"
              :key="index"
              class="calendar__item"
              data-tst-id="calendar-friend-mark"
            >
              <RouterLink class="calendar__friend" :to="{ name: 'person', params: { userId: mark.userId } }">
                <UserAvatar :name="mark.displayName" :user-id="mark.userId" :avatar-url="mark.avatarUrl" :size="24" />
                <b class="calendar__item-title">{{ mark.displayName }}</b>
              </RouterLink>
              <span class="calendar__friend-says">
                — {{ availabilityPhrase(mark.kind, mark.city) }}
                <span v-if="mark.fromDate !== mark.toDate" class="calendar__item-sub hg-num">
                  {{ dayRange(mark.fromDate, mark.toDate) }}
                </span>
              </span>
            </li>
          </ul>
        </template>

        <!-- ---------------------------------------------------------- marking days -->
        <div v-if="!formOpen">
          <button class="hg-btn hg-btn--outline" type="button" data-tst-id="calendar-add" @click="openForm">
            <Plus class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
            <span>Mark days</span>
          </button>
        </div>

        <form v-else class="calendar__form" novalidate data-tst-id="calendar-form" @submit.prevent="save">
          <div class="calendar__form-head">
            <h3 class="calendar__details-title">Mark days</h3>
            <button
              class="hg-iconbtn"
              type="button"
              aria-label="Close without marking"
              title="Close"
              data-tst-id="calendar-form-close"
              @click="formOpen = false"
            >
              <X class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
            </button>
          </div>

          <div class="hg-seg calendar__kinds" role="radiogroup" aria-label="What the days are">
            <button
              v-for="kind in KINDS"
              :key="kind"
              class="hg-seg__opt"
              type="button"
              role="radio"
              :aria-checked="form.kind === kind"
              :data-tst-id="'calendar-kind-' + kind"
              @click="form.kind = kind"
            >
              {{ KIND_LABEL[kind] }}
            </button>
          </div>

          <div class="calendar__dates" :class="{ 'hg-field--error': formError?.field === 'dates' }">
            <label class="hg-field">
              <span class="hg-field__label">First day</span>
              <input v-model="form.fromDate" class="hg-input hg-num" type="date" required data-tst-id="calendar-from" />
            </label>
            <label class="hg-field">
              <span class="hg-field__label">Last day</span>
              <input
                v-model="form.toDate"
                class="hg-input hg-num"
                type="date"
                required
                :min="form.fromDate"
                data-tst-id="calendar-to"
              />
            </label>
          </div>

          <label
            v-if="form.kind === 'TRIP'"
            class="hg-field"
            :class="{ 'hg-field--error': formError?.field === 'city' }"
          >
            <span class="hg-field__label">Where to</span>
            <input
              v-model="form.city"
              class="hg-input"
              type="text"
              :maxlength="MAX_CITY_LENGTH"
              placeholder="City"
              required
              data-tst-id="calendar-city"
            />
            <span class="hg-field__msg">Friends see the city.</span>
          </label>

          <label class="hg-field">
            <span class="hg-field__label">Note</span>
            <input
              v-model="form.note"
              class="hg-input"
              type="text"
              :maxlength="MAX_NOTE_LENGTH"
              placeholder="Optional"
              data-tst-id="calendar-note"
            />
            <span class="hg-field__msg">Only you see this.</span>
          </label>

          <p v-if="formError !== null" class="app-error" role="alert" data-tst-id="calendar-form-error">
            {{ formError.text }}
          </p>

          <button
            class="hg-btn hg-btn--primary"
            :class="{ 'is-loading': saving }"
            type="submit"
            :disabled="saving"
            data-tst-id="calendar-save"
          >
            <span>Save</span>
          </button>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* The panel is laid out by its OWN width, not the window's: the same component stands in a 320px
   rail and across a whole page, and only a container query tells the two apart. */
.calendar {
  container-type: inline-size;
  min-width: 0;
}

.calendar__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--s-5);
  align-items: start;
}

.calendar__month {
  min-width: 0;
}

/* ---------------------------------------------------------------- the head */

.calendar__head {
  display: flex;
  align-items: center;
  gap: var(--s-1);
  margin-bottom: var(--s-3);
}

.calendar__title {
  flex: 1;
  min-width: 0;
  font: var(--t-title-3);
}

.calendar__weekdays,
.calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar__weekday {
  padding-bottom: var(--s-1);
  color: var(--c-ink-soft);
  font: var(--t-caption);
  text-align: center;
}

/* No gap between the columns: a band has to run from one day into the next without a break. */
.calendar__grid {
  row-gap: var(--s-1);
}

/* ---------------------------------------------------------------- a day */

.calendar__day {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  min-height: 56px;
  padding: var(--s-1) 0;
  border: 0;
  border-radius: var(--r-s);
  background: transparent;
  color: var(--c-ink);
  cursor: pointer;
  transition: background-color var(--dur-1) var(--ease);
}

.calendar--compact .calendar__day {
  min-height: 44px;
}

.calendar__day:hover {
  background: var(--c-surface-soft);
}

/* The chosen day: a frame drawn inside, so the grid does not move. */
.calendar__day[aria-pressed='true'] {
  background: var(--c-surface-soft);
  box-shadow: inset 0 0 0 2px var(--c-ink);
}

/* The outline of the page would be hidden by the neighbour cells: draw it inside. */
.calendar__day:focus-visible {
  outline-offset: -2px;
}

.calendar__day--out .calendar__number {
  color: var(--c-ink-faint);
}

.calendar__day-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
  padding: 0 var(--s-1);
}

.calendar__number {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  border-radius: var(--r-full);
  font: var(--t-small);
}

/* Today: the number on a filled circle - seen without the colour too. */
.calendar__day--today .calendar__number {
  background: var(--c-accent);
  color: var(--c-on-accent);
  font-weight: 600;
}

.calendar__signs {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.calendar__plan-sign {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font: var(--t-caption);
}

.calendar__dot {
  display: inline-block;
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: var(--r-full);
}

/* A plan: a soft line in the colour of its activity (--plan), under the date. The colour is
   softened by opacity, so a day with a plan is marked without shouting. */
.calendar__plans {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  padding: 0 var(--s-1);
}

.calendar__plan-line {
  display: block;
  height: 4px;
  border-radius: var(--r-full);
  background: var(--plan);
  opacity: 0.6;
}

/* More plans than lines fit: their number, on a tint of the colour. */
.calendar__plan-count {
  align-self: center;
  min-width: 20px;
  padding: 0 var(--s-1);
  border-radius: var(--r-full);
  background: color-mix(in srgb, var(--plan) 22%, transparent);
  color: var(--c-ink);
  font: var(--t-caption);
  line-height: 16px;
  text-align: center;
  opacity: 0.85;
}

/* Friends: an empty ring. */

.calendar__dot--friends {
  border: 2px solid var(--c-ink-soft);
}

/* ---------------------------------------------------------------- bands */

.calendar__bands {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 14px;
  justify-content: flex-end;
}

.calendar__band {
  display: block;
  height: 6px;
}

.calendar__band--start {
  margin-left: var(--s-1);
  border-top-left-radius: var(--r-full);
  border-bottom-left-radius: var(--r-full);
}

.calendar__band--end {
  margin-right: var(--s-1);
  border-top-right-radius: var(--r-full);
  border-bottom-right-radius: var(--r-full);
}

/* Busy: hatched. Free: two thin lines with a light middle. Trip: solid, in the accent. */
.calendar__band--BUSY {
  background:
    repeating-linear-gradient(135deg, var(--c-ink-soft) 0 2px, transparent 2px 5px),
    var(--c-surface-strong);
}

.calendar__band--FREE {
  border-top: 2px solid var(--c-success);
  border-bottom: 2px solid var(--c-success);
  background: var(--c-success-soft);
}

.calendar__band--TRIP {
  background: var(--c-accent);
}

/* ---------------------------------------------------------------- legend */

.calendar__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-1) var(--s-4);
  margin-top: var(--s-3);
  color: var(--c-ink-soft);
  font: var(--t-caption);
}

.calendar__legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
}

/* A piece of a band, to stand next to its name. */
.calendar__swatch {
  flex: none;
  width: 20px;
  border-radius: var(--r-full);
}

/* ---------------------------------------------------------------- the chosen day */

.calendar__details {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  min-width: 0;
}

.calendar__details-head,
.calendar__form-head {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.calendar__details-title {
  flex: 1;
  min-width: 0;
  font: var(--t-body-strong);
}

.calendar__state {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.calendar__list {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
}

.calendar__item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--s-2);
  min-width: 0;
  min-height: var(--size-control);
}

.calendar__item--link,
.calendar__item--link:hover {
  flex-wrap: nowrap;
  margin: 0 calc(var(--s-2) * -1);
  padding: var(--s-1) var(--s-2);
  border-radius: var(--r-s);
  color: var(--c-ink);
}

.calendar__item--link:hover {
  background: var(--c-surface-soft);
}

.calendar__item-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.calendar__item-title {
  font: var(--t-body-strong);
  overflow-wrap: anywhere;
}

.calendar__item-sub {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.calendar__item-note {
  font: var(--t-small);
  overflow-wrap: anywhere;
}

.calendar__confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
  margin-top: var(--s-1);
  font: var(--t-small);
}

.calendar__friend,
.calendar__friend:hover {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  min-width: 0;
  color: var(--c-ink);
}

.calendar__friend-says {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* ---------------------------------------------------------------- the form */

.calendar__form {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--s-3);
  padding: var(--s-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-m);
}

.calendar__kinds {
  display: flex;
}

/* Three equal parts that also fit the rail. */
.calendar__kinds .hg-seg__opt {
  flex: 1 1 0;
  min-width: 0;
  padding: 0 var(--s-2);
}

.calendar__dates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: var(--s-3);
}

/* ---------------------------------------------------------------- loading */

.calendar__skel {
  min-height: 56px;
  margin: 0 2px;
}

.calendar--compact .calendar__skel {
  min-height: 44px;
}

.calendar__skel-line {
  width: 80%;
}

.calendar__skel-line--short {
  width: 50%;
}

/* ---------------------------------------------------------------- with room: the day beside the month
   720px is where a 320px column of details still leaves the grid cells wider than they are tall. */

@container (min-width: 720px) {
  .calendar__body {
    grid-template-columns: minmax(0, 1fr) var(--size-rail);
    gap: var(--s-6);
  }

  .calendar:not(.calendar--compact) .calendar__day,
  .calendar:not(.calendar--compact) .calendar__skel {
    min-height: 72px;
  }
}
</style>
