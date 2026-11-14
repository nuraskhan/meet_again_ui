<script setup lang="ts">
// The chats the user is in. Every chat belongs to a plan and is named after it.

import { onMounted, ref } from 'vue'
import { api } from '@/api'
import type { Chat } from '@/api/types'
import { date } from '@/lib/format'
import { toastError } from '@/stores/toast'

const chats = ref<Chat[]>([])
const loading = ref<boolean>(true)

onMounted(async () => {
  try {
    chats.value = await api.chats()
  } catch (caught) {
    toastError(caught)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="page">
    <div class="page__head">
      <h1 class="page__title">Chats</h1>
    </div>

    <p v-if="loading" class="muted">Loading…</p>

    <div v-else-if="chats.length > 0" class="stack">
      <RouterLink
        v-for="chat in chats"
        :key="chat.id"
        class="card card--link chat-row"
        :to="{ name: 'chat', params: { chatId: chat.id } }"
        data-tst-id="chat-row"
      >
        <span class="chat-row__icon" aria-hidden="true">💬</span>
        <span class="grow">
          <span class="chat-row__title">{{ chat.title }}</span>
          <span class="small muted chat-row__sub">
            {{ chat.memberCount }} {{ chat.memberCount === 1 ? 'person' : 'people' }} · since {{ date(chat.createdAt) }}
          </span>
        </span>
        <span class="muted" aria-hidden="true">→</span>
      </RouterLink>
    </div>

    <div v-else class="empty" data-tst-id="chats-empty">
      <p>No chats yet. A chat appears by itself when you send or receive an invitation.</p>
      <RouterLink class="btn chats__button" :to="{ name: 'plan-new' }">Invite friends</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.chat-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.chat-row__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--c-teal-soft);
  font-size: 1.3rem;
}

.chat-row__title {
  display: block;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.chat-row__sub {
  display: block;
}

.chats__button {
  margin-top: 16px;
}
</style>
