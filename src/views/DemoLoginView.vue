<script setup lang="ts">
// A "fast login" link: /fl/steve-jobs or /fl/steve-wozniak signs the visitor in as that
// demonstration account, with no password, and opens the application.
//
// For showing the product: the two accounts are friends with each other, so opened in two
// browsers they can invite one another at once. Anyone with the link gets in - that is what the
// link is for; nothing private belongs in those accounts. The server decides whether demo logins
// are on, and which accounts exist.

import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import HangeloLogo from '@/components/HangeloLogo.vue'
import { auth } from '@/stores/auth'
import { errorText } from '@/stores/toast'

const props = defineProps<{ who: string }>()

const router = useRouter()

/** Why it did not work; empty while signing in. */
const problem = ref<string>('')

onMounted(async () => {
  try {
    await auth.loginDemo(props.who)
    await router.replace({ name: 'plans' })
  } catch (caught) {
    problem.value = errorText(caught)
  }
})
</script>

<template>
  <main class="app-bare demo">
    <div class="demo__box" data-tst-id="demo-login">
      <HangeloLogo :size="40" />
      <p v-if="problem === ''" class="demo__text" aria-live="polite">Signing you in to the demo…</p>
      <template v-else>
        <p class="app-error" role="alert" data-tst-id="demo-login-error">{{ problem }}</p>
        <RouterLink class="hg-btn hg-btn--outline" :to="{ name: 'login' }">Log in</RouterLink>
      </template>
    </div>
  </main>
</template>

<style scoped>
.demo {
  align-items: center;
  justify-content: center;
}

.demo__box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-5);
}

.demo__text {
  color: var(--c-ink-soft);
}
</style>
