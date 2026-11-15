<script setup lang="ts">
// /admin/analytica: how the site is visited. For admins only - for anyone else the server says
// "not found", and so does this page.
//
// What is shown: the headline figures as tiles; visits per day as bars (one measure, one colour -
// its title names it, so there is no legend); the pages opened most as a table. Days are UTC days.
// The same numbers as the bars stand in a table under them, for reading exactly and for a screen
// reader.

import { computed, onMounted, ref, watch } from 'vue'
import { BarChart3 } from 'lucide-vue-next'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import type { Analytics, AnalyticsDay } from '@/api/types'
import { toastError } from '@/stores/toast'

const PERIODS: number[] = [7, 30, 90]

const days = ref<number>(30)
const figures = ref<Analytics | null>(null)
const loading = ref<boolean>(true)
/** Not an admin (or not signed in as one): the page does not exist for this person. */
const missing = ref<boolean>(false)
/** The day under the pointer or the keyboard focus: its numbers are shown above the bars. */
const hovered = ref<AnalyticsDay | null>(null)

onMounted(load)
watch(days, load)

async function load(): Promise<void> {
  loading.value = true
  try {
    figures.value = await api.analytics(days.value)
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      missing.value = true
    } else {
      toastError(caught)
    }
  } finally {
    loading.value = false
  }
}

/** The tallest day: the bars are drawn against it. At least 1, so empty days are flat, not broken. */
const peak = computed<number>(() => Math.max(1, ...(figures.value?.byDay ?? []).map((day) => day.visits)))

/** The height of a day's bar, in percent of the plot. */
function height(day: AnalyticsDay): string {
  return (day.visits / peak.value) * 100 + '%'
}

// "Nov 15": a day is a plain date; it is built from its parts so that no time zone moves it.
const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

function dayLabel(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number)
  return dayFormat.format(new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1))
}

const numberFormat = new Intl.NumberFormat('en-US')

function count(value: number): string {
  return numberFormat.format(value)
}

interface Tile {
  id: string
  label: string
  value: number
  note: string
}

const tiles = computed<Tile[]>(() => {
  const all: Analytics | null = figures.value
  if (all === null) {
    return []
  }
  return [
    { id: 'visits', label: 'Page views', value: all.visits, note: 'in ' + all.days + ' days' },
    { id: 'visitors', label: 'Visitors', value: all.visitors, note: 'different browsers' },
    { id: 'signed-in', label: 'Signed-in views', value: all.signedInVisits, note: 'of the page views' },
    { id: 'new-users', label: 'New accounts', value: all.newUsers, note: count(all.users) + ' in all' },
    { id: 'plans', label: 'New plans', value: all.plans, note: 'in ' + all.days + ' days' },
  ]
})
</script>

<template>
  <div class="app-col app-col--wide">
    <div v-if="missing" class="hg-empty" data-tst-id="analytics-missing">
      <BarChart3 class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
      <h1 class="hg-empty__title">No such page</h1>
      <p class="hg-empty__text">This page is for the administrators of the site.</p>
      <RouterLink class="hg-btn hg-btn--outline" :to="{ name: 'plans' }">My plans</RouterLink>
    </div>

    <template v-else>
      <div class="app-head">
        <h1 class="app-head__title">Analytics</h1>
        <!-- One row of filters above everything they change. -->
        <div class="hg-seg" role="radiogroup" aria-label="Period">
          <button
            v-for="period in PERIODS"
            :key="period"
            class="hg-seg__opt"
            type="button"
            role="radio"
            :aria-checked="days === period"
            :data-tst-id="'analytics-days-' + period"
            @click="days = period"
          >
            {{ period }} days
          </button>
        </div>
      </div>

      <div v-if="loading && figures === null" class="stats__tiles" aria-busy="true" aria-label="Loading">
        <span v-for="n in 5" :key="n" class="hg-skel stats__tile-skel"></span>
      </div>

      <template v-else-if="figures !== null">
        <!-- ---------------------------------------------------- the headline figures -->
        <dl class="stats__tiles" data-tst-id="analytics-tiles">
          <div v-for="tile in tiles" :key="tile.id" class="hg-card stats__tile" :data-tst-id="'analytics-' + tile.id">
            <dt class="stats__tile-label">{{ tile.label }}</dt>
            <dd class="stats__tile-value hg-num">{{ count(tile.value) }}</dd>
            <dd class="stats__tile-note">{{ tile.note }}</dd>
          </div>
        </dl>

        <!-- ---------------------------------------------------- visits by day -->
        <section class="hg-card stats__card" data-tst-id="analytics-chart">
          <div class="stats__card-head">
            <h2 class="stats__title">Page views by day</h2>
            <p class="stats__readout hg-num" aria-live="polite">
              <template v-if="hovered !== null">
                <b>{{ dayLabel(hovered.day) }}</b> · {{ count(hovered.visits) }} views ·
                {{ count(hovered.visitors) }} visitors
              </template>
              <template v-else>Days are UTC days · the tallest day: {{ count(peak) }}</template>
            </p>
          </div>

          <div class="stats__plot" role="img" :aria-label="'Page views for each of the last ' + figures.days + ' days'">
            <!-- The scale: the top of the plot is the tallest day. -->
            <span class="stats__scale stats__scale--top hg-num">{{ count(peak) }}</span>
            <span class="stats__scale stats__scale--bottom hg-num">0</span>
            <div class="stats__bars">
              <!-- A bar's hit area is its whole column, taller and wider than the mark itself. -->
              <button
                v-for="day in figures.byDay"
                :key="day.day"
                class="stats__column"
                type="button"
                :aria-label="dayLabel(day.day) + ': ' + day.visits + ' views, ' + day.visitors + ' visitors'"
                @mouseenter="hovered = day"
                @mouseleave="hovered = null"
                @focus="hovered = day"
                @blur="hovered = null"
              >
                <!-- A day nobody came on has no bar at all: a sliver would read as "a little". -->
                <span v-if="day.visits > 0" class="stats__bar" :style="{ height: height(day) }"></span>
              </button>
            </div>
          </div>
          <div class="stats__axis hg-num">
            <span>{{ dayLabel(figures.byDay[0]?.day ?? '') }}</span>
            <span>{{ dayLabel(figures.byDay[figures.byDay.length - 1]?.day ?? '') }}</span>
          </div>

          <!-- The same numbers as a table: for exact reading, and for those who cannot see bars. -->
          <details class="stats__details">
            <summary>Show as a table</summary>
            <table class="stats__table">
              <thead>
                <tr><th scope="col">Day</th><th scope="col">Views</th><th scope="col">Visitors</th></tr>
              </thead>
              <tbody>
                <tr v-for="day in figures.byDay" :key="day.day">
                  <th scope="row">{{ dayLabel(day.day) }}</th>
                  <td class="hg-num">{{ count(day.visits) }}</td>
                  <td class="hg-num">{{ count(day.visitors) }}</td>
                </tr>
              </tbody>
            </table>
          </details>
        </section>

        <!-- ---------------------------------------------------- the pages opened most -->
        <section class="hg-card stats__card" data-tst-id="analytics-pages">
          <h2 class="stats__title">Pages opened most</h2>
          <p v-if="figures.topPages.length === 0" class="stats__none">Nobody has opened a page in these days.</p>
          <table v-else class="stats__table">
            <thead>
              <tr><th scope="col">Page</th><th scope="col">Views</th><th scope="col">Visitors</th></tr>
            </thead>
            <tbody>
              <tr v-for="page in figures.topPages" :key="page.path" data-tst-id="analytics-page">
                <th scope="row" class="stats__path">{{ page.path }}</th>
                <td class="hg-num">{{ count(page.visits) }}</td>
                <td class="hg-num">{{ count(page.visitors) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="stats__footnote">
            A page is its pattern (/plans/:eventId), not its address: one row for all plans. A visitor is a
            browser; no IP address and no browser details are kept.
          </p>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.stats__tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--s-4);
  margin: 0 0 var(--s-5);
}

.stats__tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
}

.stats__tile-skel {
  height: 96px;
  border-radius: var(--r-m);
}

.stats__tile-label {
  color: var(--c-ink-soft);
  font: var(--t-caption);
}

/* The number is the tile: large, in ink - not in the accent, which is for actions. */
.stats__tile-value {
  margin: 0;
  font: var(--t-title-1);
  letter-spacing: -0.015em;
}

.stats__tile-note {
  margin: 0;
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.stats__card {
  margin-bottom: var(--s-5);
  padding: var(--s-5);
}

.stats__card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-2);
  margin-bottom: var(--s-4);
}

.stats__title {
  font: var(--t-title-3);
}

.stats__readout {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.stats__readout b {
  color: var(--c-ink);
}

/* The plot: a recessive frame (only a baseline), the scale at the left, the bars on it. */
.stats__plot {
  position: relative;
  height: 200px;
  padding-left: var(--s-6);
}

.stats__scale {
  position: absolute;
  left: 0;
  color: var(--c-ink-faint);
  font: var(--t-caption);
}

.stats__scale--top {
  top: -6px;
}

.stats__scale--bottom {
  bottom: -6px;
}

.stats__bars {
  display: flex;
  align-items: stretch;
  gap: 2px; /* a sliver of the surface between neighbours */
  height: 100%;
  border-bottom: 1px solid var(--c-line);
}

.stats__column {
  display: flex;
  flex: 1 1 0;
  align-items: flex-end;
  justify-content: center;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: default;
}

.stats__column:hover,
.stats__column:focus-visible {
  background: var(--c-surface-soft);
}

/* One measure, one colour. Rounded at the data end, square on the baseline. */
.stats__bar {
  display: block;
  width: 100%;
  max-width: 28px;
  min-height: 1px;
  border-radius: 4px 4px 0 0;
  background: var(--c-accent);
  transition: height var(--dur-2) var(--ease);
}

.stats__column:hover .stats__bar,
.stats__column:focus-visible .stats__bar {
  background: var(--c-accent-strong);
}

.stats__axis {
  display: flex;
  justify-content: space-between;
  margin-top: var(--s-2);
  padding-left: var(--s-6);
  color: var(--c-ink-faint);
  font: var(--t-caption);
}

.stats__details {
  margin-top: var(--s-4);
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.stats__details summary {
  width: fit-content;
  cursor: pointer;
}

.stats__table {
  width: 100%;
  margin-top: var(--s-3);
  border-collapse: collapse;
  color: var(--c-ink);
  font: var(--t-body);
}

.stats__table th,
.stats__table td {
  padding: var(--s-2) var(--s-3);
  border-bottom: 1px solid var(--c-line);
  text-align: right;
}

.stats__table th:first-child {
  text-align: left;
}

.stats__table thead th {
  color: var(--c-ink-soft);
  font: var(--t-caption);
}

.stats__table tbody th {
  font-weight: 400;
}

.stats__path {
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
}

.stats__none,
.stats__footnote {
  margin-top: var(--s-3);
  color: var(--c-ink-soft);
  font: var(--t-small);
}

@media (max-width: 767px) {
  .stats__card {
    padding: var(--s-4);
  }

  .stats__plot {
    height: 160px;
  }
}
</style>
