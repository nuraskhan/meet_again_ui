<script setup lang="ts">
// Friends: find people, answer requests, see who is already a friend.

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '@/api'
import type { AppNotification, Friend, FriendRequest, ProfileCard } from '@/api/types'
import { onSignal } from '@/stores/signal'
import UserAvatar from '@/components/UserAvatar.vue'
import { date } from '@/lib/format'
import { toastError, toastOk } from '@/stores/toast'

const friends = ref<Friend[]>([])
const incoming = ref<FriendRequest[]>([])
const outgoing = ref<FriendRequest[]>([])
const loading = ref<boolean>(true)

const searchText = ref<string>('')
const found = ref<ProfileCard[]>([])
const searched = ref<boolean>(false)
const searching = ref<boolean>(false)

/** What is being changed right now ("request-12", "friend-7"), to disable its buttons. */
const busy = ref<string>('')
/** The friend whose removal is being confirmed. */
const removing = ref<number | null>(null)

const friendIds = computed<Set<number>>(() => new Set(friends.value.map((friend) => friend.userId)))
const askedIds = computed<Set<number>>(() => new Set(outgoing.value.map((request) => request.userId)))
const askingMeIds = computed<Set<number>>(() => new Set(incoming.value.map((request) => request.userId)))

onMounted(load)

// A request came, or one of mine was accepted: show it without a reload.
const stopListening: () => void = onSignal<AppNotification>('notification', (notification) => {
  if (notification.kind === 'FRIEND_REQUEST' || notification.kind === 'FRIEND_ACCEPTED') {
    void load()
  }
})
onBeforeUnmount(stopListening)

async function load(): Promise<void> {
  try {
    const [friendList, incomingList, outgoingList] = await Promise.all([
      api.friends(),
      api.incomingFriendRequests(),
      api.outgoingFriendRequests(),
    ])
    friends.value = friendList
    incoming.value = incomingList
    outgoing.value = outgoingList
  } catch (caught) {
    toastError(caught)
  } finally {
    loading.value = false
  }
}

async function search(): Promise<void> {
  if (searchText.value.trim() === '') {
    found.value = []
    searched.value = false
    return
  }
  searching.value = true
  try {
    found.value = await api.searchPeople(searchText.value)
    searched.value = true
  } catch (caught) {
    toastError(caught)
  } finally {
    searching.value = false
  }
}

async function add(person: ProfileCard): Promise<void> {
  await change('add-' + person.userId, async () => {
    await api.sendFriendRequest(person.userId)
    toastOk('Request sent to ' + person.displayName)
  })
}

async function answer(request: FriendRequest, accept: boolean): Promise<void> {
  await change('request-' + request.requestId, async () => {
    if (accept) {
      await api.acceptFriendRequest(request.requestId)
      toastOk('You and ' + request.displayName + ' are friends now')
    } else {
      await api.declineFriendRequest(request.requestId)
      toastOk('Request declined')
    }
  })
}

async function remove(friend: Friend): Promise<void> {
  await change('friend-' + friend.userId, async () => {
    await api.removeFriend(friend.userId)
    toastOk(friend.displayName + ' is no longer your friend')
  })
  removing.value = null
}

/** Runs one change and reloads the lists, whatever the outcome. */
async function change(what: string, action: () => Promise<void>): Promise<void> {
  busy.value = what
  try {
    await action()
  } catch (caught) {
    toastError(caught)
  } finally {
    await load()
    busy.value = ''
  }
}
</script>

<template>
  <main class="page">
    <div class="page__head">
      <h1 class="page__title">Friends</h1>
    </div>

    <!-- ------------------------------------------------------------ find -->
    <section class="card">
      <form class="find" role="search" data-tst-id="friends-search-form" @submit.prevent="search">
        <input
          v-model="searchText"
          class="input grow"
          type="search"
          placeholder="Find people by name or e-mail"
          aria-label="Find people by name or e-mail"
          data-tst-id="friends-search"
        />
        <button class="btn" type="submit" :disabled="searching" data-tst-id="friends-search-submit">
          {{ searching ? 'Searching…' : 'Search' }}
        </button>
      </form>

      <ul v-if="found.length > 0" class="people find__results">
        <li v-for="person in found" :key="person.userId" class="people__row" data-tst-id="friends-found">
          <UserAvatar :name="person.displayName" :user-id="person.userId" :avatar-url="person.avatarUrl" />
          <span class="grow">
            <RouterLink class="people__name" :to="{ name: 'person', params: { userId: person.userId } }">
              {{ person.displayName }}
            </RouterLink>
            <span v-if="person.city" class="small muted people__sub">{{ person.city }}</span>
          </span>

          <span v-if="friendIds.has(person.userId)" class="badge badge--yes">Friend</span>
          <span v-else-if="askedIds.has(person.userId)" class="badge badge--wait">Request sent</span>
          <span v-else-if="askingMeIds.has(person.userId)" class="badge badge--wait">Asked you</span>
          <button
            v-else
            class="btn btn--small"
            type="button"
            :disabled="busy === 'add-' + person.userId"
            data-tst-id="friends-add"
            @click="add(person)"
          >
            Add friend
          </button>
        </li>
      </ul>

      <p v-else-if="searched" class="small muted find__results" data-tst-id="friends-search-empty">
        Nobody found. Try another part of the name, or the exact e-mail.
      </p>
    </section>

    <p v-if="loading" class="muted section">Loading…</p>

    <template v-else>
      <!-- ---------------------------------------------------------- requests to me -->
      <section v-if="incoming.length > 0" class="section" data-tst-id="friends-incoming">
        <h2 class="section__title">Want to be your friend</h2>

        <ul class="card people">
          <li v-for="request in incoming" :key="request.requestId" class="people__row" data-tst-id="friend-request">
            <UserAvatar :name="request.displayName" :user-id="request.userId" :avatar-url="request.avatarUrl" />
            <RouterLink class="grow people__name" :to="{ name: 'person', params: { userId: request.userId } }">
              {{ request.displayName }}
            </RouterLink>
            <span class="row">
              <button
                class="btn btn--yes btn--small"
                type="button"
                :disabled="busy === 'request-' + request.requestId"
                data-tst-id="friend-request-accept"
                @click="answer(request, true)"
              >
                Accept
              </button>
              <button
                class="btn btn--ghost btn--small"
                type="button"
                :disabled="busy === 'request-' + request.requestId"
                data-tst-id="friend-request-decline"
                @click="answer(request, false)"
              >
                Decline
              </button>
            </span>
          </li>
        </ul>
      </section>

      <!-- ---------------------------------------------------------- friends -->
      <section class="section">
        <h2 class="section__title">Your friends · {{ friends.length }}</h2>

        <ul v-if="friends.length > 0" class="card people">
          <li v-for="friend in friends" :key="friend.userId" class="people__row" data-tst-id="friend">
            <UserAvatar :name="friend.displayName" :user-id="friend.userId" :avatar-url="friend.avatarUrl" />
            <span class="grow">
              <RouterLink class="people__name" :to="{ name: 'person', params: { userId: friend.userId } }">
                {{ friend.displayName }}
              </RouterLink>
              <span class="small muted people__sub">
                {{ friend.city ? friend.city + ' · ' : '' }}friends since {{ date(friend.friendsSince) }}
              </span>
            </span>

            <span v-if="removing === friend.userId" class="row">
              <button
                class="btn btn--danger btn--small"
                type="button"
                :disabled="busy === 'friend-' + friend.userId"
                data-tst-id="friend-remove-confirm"
                @click="remove(friend)"
              >
                Remove
              </button>
              <button class="btn btn--ghost btn--small" type="button" @click="removing = null">Keep</button>
            </span>
            <button
              v-else
              class="people__more"
              type="button"
              :aria-label="'Remove ' + friend.displayName + ' from friends'"
              data-tst-id="friend-remove"
              @click="removing = friend.userId"
            >
              ✕
            </button>
          </li>
        </ul>

        <div v-else class="empty" data-tst-id="friends-empty">
          <p>No friends here yet. Search above and send the first request.</p>
        </div>
      </section>

      <!-- ---------------------------------------------------------- my requests -->
      <section v-if="outgoing.length > 0" class="section" data-tst-id="friends-outgoing">
        <h2 class="section__title">Waiting for their answer</h2>

        <ul class="card people">
          <li v-for="request in outgoing" :key="request.requestId" class="people__row">
            <UserAvatar :name="request.displayName" :user-id="request.userId" :avatar-url="request.avatarUrl" />
            <RouterLink class="grow people__name" :to="{ name: 'person', params: { userId: request.userId } }">
              {{ request.displayName }}
            </RouterLink>
            <span class="badge badge--wait">Sent {{ date(request.createdAt) }}</span>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped>
.find {
  display: flex;
  gap: 10px;
}

.find__results {
  margin-top: 14px;
}

.people {
  display: grid;
  margin: 0;
  list-style: none;
}

.card.people {
  padding: 6px 18px;
}

.find__results.people {
  padding: 0;
}

.people__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}

.people__row + .people__row {
  border-top: 1px solid var(--c-line);
}

.people__name {
  color: inherit;
  display: block;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.people__sub {
  display: block;
}

.people__more {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-ink-faint);
  cursor: pointer;
}

.people__more:hover {
  background: var(--c-danger-soft);
  color: var(--c-danger);
}

@media (max-width: 480px) {
  .find {
    flex-direction: column;
  }
}
</style>
