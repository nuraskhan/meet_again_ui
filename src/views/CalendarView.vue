<script setup lang="ts">
// The calendar as a page of its own: the same panel that stands in the rail beside the feed, with
// the whole width to itself. On a phone and a narrow window, where there is no rail, this page is
// where the calendar lives.

import CalendarPanel from '@/components/CalendarPanel.vue'
</script>

<template>
  <div class="app-col app-col--wide" data-tst-id="calendar-page">
    <div class="app-head">
      <h1 class="app-head__title">Calendar</h1>
    </div>

    <CalendarPanel />
  </div>
</template>
