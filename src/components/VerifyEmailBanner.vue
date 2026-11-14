<script setup lang="ts">
// A strip under the top bar while the user's e-mail is not confirmed: what it is for, and a button
// to get the letter again.

import { computed, ref } from 'vue'
import { api } from '@/api'
import { auth } from '@/stores/auth'
import { errorText } from '@/stores/toast'

const busy = ref<boolean>(false)
/** What happened after the button was pressed; empty before. */
const note = ref<string>('')
const failed = ref<boolean>(false)

// Shown only once the profile is loaded: before that we do not know, and must not flash the strip
// at someone whose address is confirmed.
const visible = computed<boolean>(() => auth.state.profile !== null && !auth.state.profile.emailVerified)

async function sendAgain(): Promise<void> {
  busy.value = true
  note.value = ''
  failed.value = false
  try {
    await api.sendEmailVerification()
    note.value = 'Sent. Check your inbox (and the spam folder).'
  } catch (caught) {
    failed.value = true
    note.value = errorText(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="verify" role="status" data-tst-id="verify-banner">
    <div class="verify__inner">
      <p class="verify__text">
        <strong>Confirm your e-mail</strong> to get reminders about your plans. We sent a link to
        {{ auth.state.profile?.email }}.
      </p>

      <button
        class="btn btn--ghost btn--small verify__button"
        type="button"
        :disabled="busy"
        data-tst-id="verify-banner-send"
        @click="sendAgain"
      >
        {{ busy ? 'Sending…' : 'Send it again' }}
      </button>

      <p
        v-if="note !== ''"
        class="small verify__note"
        :class="{ 'verify__note--failed': failed }"
        data-tst-id="verify-banner-note"
      >
        {{ note }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.verify {
  border-bottom: 1px solid color-mix(in srgb, var(--c-wait) 35%, var(--c-line));
  background: var(--c-wait-soft);
  color: var(--c-ink);
}

.verify__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  max-width: 880px;
  margin: 0 auto;
  padding: 10px 16px;
}

.verify__text {
  flex: 1 1 320px;
  font-size: 0.92rem;
  overflow-wrap: anywhere;
}

.verify__button {
  background: var(--c-surface);
}

.verify__note {
  flex: 1 1 100%;
  color: var(--c-teal);
  font-weight: 600;
}

.verify__note--failed {
  color: var(--c-danger);
}
</style>
