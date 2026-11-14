<script setup lang="ts">
// A banner at the top of the page while the user's e-mail is not confirmed: what it is for, and a
// button to get the letter again.

import { computed, ref } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import { api } from '@/api'
import { auth } from '@/stores/auth'
import { errorText } from '@/stores/toast'

const busy = ref<boolean>(false)
/** What happened after the button was pressed; empty before. */
const note = ref<string>('')
const failed = ref<boolean>(false)

// Shown only once the profile is loaded: before that we do not know, and must not flash the banner
// at someone whose address is confirmed.
const visible = computed<boolean>(() => auth.state.profile !== null && !auth.state.profile.emailVerified)

async function sendAgain(): Promise<void> {
  busy.value = true
  note.value = ''
  failed.value = false
  try {
    await api.sendEmailVerification()
    note.value = 'Sent. Check your inbox.'
  } catch (caught) {
    failed.value = true
    note.value = errorText(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="hg-banner verify" role="status" data-tst-id="verify-banner">
    <TriangleAlert class="hg-icon" :stroke-width="1.5" aria-hidden="true" />

    <p class="hg-banner__text">
      Confirm your e-mail to get reminders about your plans. We sent a link to
      <b>{{ auth.state.profile?.email }}</b
      >.
    </p>

    <!-- After a successful send the button gives way to the note; after a failure it stays, to
         try again. -->
    <span v-if="note !== '' && !failed" class="hg-banner__note" data-tst-id="verify-banner-note">
      {{ note }}
    </span>
    <template v-else>
      <span v-if="note !== ''" class="hg-banner__note verify__failed" data-tst-id="verify-banner-note">
        {{ note }}
      </span>
      <button
        class="hg-btn hg-btn--quiet hg-btn--sm"
        :class="{ 'is-loading': busy }"
        type="button"
        :disabled="busy"
        data-tst-id="verify-banner-send"
        @click="sendAgain"
      >
        <span>Send again</span>
      </button>
    </template>
  </div>
</template>

<style scoped>
.verify {
  flex-wrap: wrap;
  margin-bottom: var(--s-5);
}

.hg-banner__text {
  min-width: 200px;
  overflow-wrap: anywhere;
}

.verify__failed {
  color: var(--c-danger);
}
</style>
