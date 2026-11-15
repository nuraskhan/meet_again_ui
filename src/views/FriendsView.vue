<script setup lang="ts">
// Friends: find people, answer requests, see who is already a friend.

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Search, UserMinus, Users } from 'lucide-vue-next'
import { api } from '@/api'
import type { AppNotification, Friend, FriendRequest, ProfileCard } from '@/api/types'
import { onSignal } from '@/stores/signal'
import UserAvatar from '@/components/UserAvatar.vue'
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
/** Who asked me, by the person: a found person who already asked is answered right in the results. */
const askingMe = computed<Map<number, FriendRequest>>(
  () => new Map(incoming.value.map((request) => [request.userId, request])),
)

// The interface is in English, so dates are too - whatever the language of the browser.
const dayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })

/** "Sat, 14 Nov": a request is days old, the year would only be noise. */
function day(iso: string): string {
  return dayFormat.format(new Date(iso))
}

/** "Mar 2026": for a friendship the month is precise enough. */
function month(iso: string): string {
  return monthFormat.format(new Date(iso))
}

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
  <div class="app-col">
    <div class="app-head">
      <h1 class="app-head__title">
        Friends
        <span v-if="!loading" class="hg-soft hg-num friends__count">{{ friends.length }}</span>
      </h1>
    </div>

    <!-- ------------------------------------------------------------ find -->
    <form class="friends__find" role="search" data-tst-id="friends-search-form" @submit.prevent="search">
      <div class="hg-field__control app-grow">
        <span class="hg-field__lead">
          <Search class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        </span>
        <input
          v-model="searchText"
          class="hg-input hg-input--lead"
          type="search"
          placeholder="Find people by name or e-mail"
          aria-label="Find people by name or e-mail"
          data-tst-id="friends-search"
        />
      </div>
      <button
        class="hg-btn hg-btn--neutral"
        :class="{ 'is-loading': searching }"
        type="submit"
        :disabled="searching"
        data-tst-id="friends-search-submit"
      >
        <span>Search</span>
      </button>
    </form>

    <ul v-if="found.length > 0" class="hg-list friends__found">
      <li
        v-for="person in found"
        :key="person.userId"
        class="hg-row hg-row--72 friends__row"
        data-tst-id="friends-found"
      >
        <UserAvatar :name="person.displayName" :user-id="person.userId" :avatar-url="person.avatarUrl" />
        <RouterLink class="hg-row__text friends__who" :to="{ name: 'person', params: { userId: person.userId } }">
          <span class="hg-row__title">{{ person.displayName }}</span>
          <span v-if="person.city" class="hg-row__sub">{{ person.city }}</span>
        </RouterLink>

        <span class="hg-row__trail">
          <span v-if="friendIds.has(person.userId)" class="friends__note">Already friends</span>
          <span v-else-if="askedIds.has(person.userId)" class="hg-badge hg-badge--warning">Request sent</span>
          <template v-else-if="askingMe.has(person.userId)">
            <!-- Their own test ids: the same request is also in "Requests for you" below. -->
            <button
              class="hg-btn hg-btn--primary hg-btn--sm"
              type="button"
              :disabled="busy === 'request-' + askingMe.get(person.userId)!.requestId"
              data-tst-id="friends-found-accept"
              @click="answer(askingMe.get(person.userId)!, true)"
            >
              Accept
            </button>
            <button
              class="hg-btn hg-btn--outline hg-btn--sm"
              type="button"
              :disabled="busy === 'request-' + askingMe.get(person.userId)!.requestId"
              data-tst-id="friends-found-decline"
              @click="answer(askingMe.get(person.userId)!, false)"
            >
              Decline
            </button>
          </template>
          <button
            v-else
            class="hg-btn hg-btn--primary hg-btn--sm"
            :class="{ 'is-loading': busy === 'add-' + person.userId }"
            type="button"
            :disabled="busy === 'add-' + person.userId"
            data-tst-id="friends-add"
            @click="add(person)"
          >
            <span>Add</span>
          </button>
        </span>
      </li>
    </ul>

    <p v-else-if="searched" class="hg-soft friends__found" data-tst-id="friends-search-empty">
      Nobody found. Try another part of the name, or the exact e-mail.
    </p>

    <!-- Loading: the shape of the list, so the page does not jump when it arrives. -->
    <ul v-if="loading" class="hg-list" aria-busy="true" aria-label="Loading friends">
      <li v-for="n in 4" :key="n" class="hg-row hg-row--72 friends__row">
        <span class="hg-skel hg-skel--circle friends__skel-avatar"></span>
        <span class="hg-row__text friends__skel-text">
          <span class="hg-skel hg-skel--line friends__skel-title"></span>
          <span class="hg-skel hg-skel--line friends__skel-sub"></span>
        </span>
      </li>
    </ul>

    <template v-else>
      <!-- ---------------------------------------------------------- requests to me -->
      <section v-if="incoming.length > 0" class="app-section" data-tst-id="friends-incoming">
        <h2 class="friends__title">Requests for you</h2>

        <ul class="hg-list friends__requests">
          <li
            v-for="request in incoming"
            :key="request.requestId"
            class="hg-row hg-row--72 hg-row--new friends__row"
            data-tst-id="friend-request"
          >
            <UserAvatar :name="request.displayName" :user-id="request.userId" :avatar-url="request.avatarUrl" />
            <RouterLink
              class="hg-row__text friends__who"
              :to="{ name: 'person', params: { userId: request.userId } }"
            >
              <span class="hg-row__title">{{ request.displayName }}</span>
              <span class="hg-row__sub">wants to be your friend · {{ day(request.createdAt) }}</span>
            </RouterLink>
            <span class="hg-row__trail">
              <button
                class="hg-btn hg-btn--primary hg-btn--sm"
                type="button"
                :disabled="busy === 'request-' + request.requestId"
                data-tst-id="friend-request-accept"
                @click="answer(request, true)"
              >
                Accept
              </button>
              <button
                class="hg-btn hg-btn--outline hg-btn--sm"
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

      <!-- ---------------------------------------------------------- my requests -->
      <section v-if="outgoing.length > 0" class="app-section" data-tst-id="friends-outgoing">
        <h2 class="friends__title">Your requests</h2>

        <ul class="hg-list">
          <li v-for="request in outgoing" :key="request.requestId" class="hg-row hg-row--72 friends__row">
            <UserAvatar :name="request.displayName" :user-id="request.userId" :avatar-url="request.avatarUrl" />
            <RouterLink
              class="hg-row__text friends__who"
              :to="{ name: 'person', params: { userId: request.userId } }"
            >
              <span class="hg-row__title">{{ request.displayName }}</span>
              <span class="hg-row__sub">Sent {{ day(request.createdAt) }}</span>
            </RouterLink>
            <span class="hg-row__trail">
              <span class="hg-badge hg-badge--warning">Not answered</span>
            </span>
          </li>
        </ul>
      </section>

      <!-- ---------------------------------------------------------- friends -->
      <section>
        <h2 class="friends__title">Friends</h2>

        <ul v-if="friends.length > 0" class="hg-list">
          <li
            v-for="friend in friends"
            :key="friend.userId"
            class="hg-row hg-row--72 friends__row"
            data-tst-id="friend"
          >
            <UserAvatar :name="friend.displayName" :user-id="friend.userId" :avatar-url="friend.avatarUrl" />
            <RouterLink class="hg-row__text friends__who" :to="{ name: 'person', params: { userId: friend.userId } }">
              <span class="hg-row__title">{{ friend.displayName }}</span>
              <span class="hg-row__sub">
                {{ friend.city ? friend.city + ' · ' : '' }}Friends since {{ month(friend.friendsSince) }}
              </span>
            </RouterLink>

            <span class="hg-row__trail">
              <!-- Removing is asked about in place: a dialog would be too much for one row. -->
              <span v-if="removing === friend.userId" class="hg-confirm">
                <span class="hg-confirm__q friends__confirm-q">Remove?</span>
                <button
                  class="hg-btn hg-btn--danger-filled hg-btn--sm"
                  :class="{ 'is-loading': busy === 'friend-' + friend.userId }"
                  type="button"
                  :disabled="busy === 'friend-' + friend.userId"
                  data-tst-id="friend-remove-confirm"
                  @click="remove(friend)"
                >
                  <span>Remove</span>
                </button>
                <button class="hg-btn hg-btn--quiet hg-btn--sm" type="button" @click="removing = null">Keep</button>
              </span>
              <button
                v-else
                class="hg-iconbtn"
                type="button"
                :aria-label="'Remove ' + friend.displayName + ' from friends'"
                title="Remove from friends"
                data-tst-id="friend-remove"
                @click="removing = friend.userId"
              >
                <UserMinus class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              </button>
            </span>
          </li>
        </ul>

        <div v-else class="hg-empty" data-tst-id="friends-empty">
          <Users class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          <h3 class="hg-empty__title">No friends here yet</h3>
          <p class="hg-empty__text">Search above and send the first request.</p>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.friends__count {
  font-weight: 400;
}

.friends__find {
  display: flex;
  gap: var(--s-2);
  margin-bottom: var(--s-4);
}

.friends__found {
  margin-bottom: var(--s-6);
}

.friends__title {
  margin-bottom: var(--s-2);
  font: var(--t-title-2);
}

.friends__requests {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
}

.friends__row {
  border-radius: var(--r-m);
}

/* The name is a link to the person, but reads as text: the stylesheet colours every link. */
.friends__who,
.friends__who:hover {
  color: var(--c-ink);
}

.friends__note {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.friends__skel-avatar {
  flex: none;
  width: var(--size-control);
  height: var(--size-control);
}

.friends__skel-text {
  gap: var(--s-2);
}

.friends__skel-title {
  width: 40%;
}

.friends__skel-sub {
  width: 25%;
}

@media (max-width: 767px) {
  /* The page already has a gutter on a phone: a narrower row padding leaves room for the name. */
  .friends__row {
    padding: 0 var(--s-2);
  }
}

@media (max-width: 479px) {
  /* Two buttons and a question leave no room for the name; the red button says it all. */
  .friends__confirm-q {
    display: none;
  }
}
</style>
