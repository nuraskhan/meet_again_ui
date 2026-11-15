<script setup lang="ts">
// The page a visitor sees first. No data from the server: it only explains and invites to register.

import type { Component } from 'vue'
import { Calendar, Clock, Compass, MapPin, MessageCircle, Star, Utensils, Wallet } from 'lucide-vue-next'
import HangeloLogo from '@/components/HangeloLogo.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const STEPS: { title: string; text: string }[] = [
  {
    title: 'Write a plan',
    text: 'Pick what you want to do, a few dates, how far and how much. It takes a minute.',
  },
  {
    title: 'Invite friends, or open it to everyone',
    text: 'Choose people from your list, send a link, or let anyone join from the feed.',
  },
  {
    title: 'Agree on a time and a place',
    text: "See who is coming, talk in the plan's chat, and pick from places that suit everyone.",
  },
]

const FEATURES: { icon: Component; title: string; text: string }[] = [
  {
    icon: Calendar,
    title: 'Several dates to choose from',
    text: 'Offer a few times and let people say which works.',
  },
  {
    icon: MessageCircle,
    title: 'A group chat for every plan',
    text: 'Created with the plan, for the details.',
  },
  {
    icon: MapPin,
    title: 'Places that suit everyone',
    text: 'Suggestions based on where each guest is coming from.',
  },
  {
    icon: Compass,
    title: 'A public feed',
    text: 'Join plans near you, or make yours open to anyone.',
  },
]

const YEAR: number = new Date().getFullYear()
</script>

<template>
  <div class="app-bare">
    <div class="welcome">
      <header class="welcome__bar">
        <RouterLink class="welcome__logo" :to="{ name: 'welcome' }" aria-label="Hangelo">
          <HangeloLogo />
        </RouterLink>

        <span class="app-grow"></span>

        <ThemeToggle />
        <RouterLink class="hg-btn hg-btn--quiet" :to="{ name: 'login' }" data-tst-id="welcome-login">
          Log in
        </RouterLink>
        <RouterLink class="hg-btn hg-btn--neutral" :to="{ name: 'register' }" data-tst-id="welcome-register">
          Create account
        </RouterLink>
      </header>

      <main>
        <!-- ------------------------------------------------------------ hero -->
        <section class="welcome__hero">
          <div class="welcome__pitch">
            <h1 class="welcome__title">See your friends in person, not just online</h1>
            <p class="welcome__lead">
              Write a plan, invite people, and agree on a time and a place with the fewest messages.
            </p>

            <div class="welcome__actions">
              <RouterLink
                class="hg-btn hg-btn--primary hg-btn--lg welcome__cta"
                :to="{ name: 'register' }"
                data-tst-id="welcome-cta"
              >
                Create account
              </RouterLink>
              <RouterLink class="hg-link" :to="{ name: 'login' }">I already have an account</RouterLink>
            </div>
          </div>

          <!-- A picture of the product made of the product's own pieces; purely decorative.
               The same picture stands beside the form in AuthView. -->
          <div class="welcome__art-box" aria-hidden="true">
            <div class="welcome__art">
              <div class="hg-card hg-card--lg welcome__art-plan">
                <div class="hg-plan hg-plan--compact">
                  <span class="hg-plan__kind">
                    <Utensils class="hg-icon" :stroke-width="1.5" />
                    Dinner
                  </span>
                  <h3 class="hg-plan__title">Dinner on Friday</h3>
                  <ul class="hg-plan__facts">
                    <li class="hg-plan__fact"><Clock class="hg-icon" :stroke-width="1.5" />Fri, 20 Nov, 19:00</li>
                    <li class="hg-plan__fact"><MapPin class="hg-icon" :stroke-width="1.5" />Up to 5 mi</li>
                    <li class="hg-plan__fact"><Wallet class="hg-icon" :stroke-width="1.5" />$20–40</li>
                  </ul>
                </div>
                <div class="welcome__art-people">
                  <span class="hg-stack">
                    <span class="hg-avatar hg-avatar--32">AZ</span>
                    <span class="hg-avatar hg-avatar--32">TK</span>
                    <span class="hg-avatar hg-avatar--32">AS</span>
                    <span class="hg-avatar hg-avatar--32">DM</span>
                    <span class="hg-avatar hg-avatar--32 hg-stack__more">+2</span>
                  </span>
                  <span>6 coming</span>
                </div>
              </div>

              <div class="hg-chat welcome__art-chat">
                <div class="hg-run">
                  <span class="hg-avatar hg-avatar--32">TK</span>
                  <div class="hg-run__body">
                    <p class="hg-run__name">Timur</p>
                    <p class="hg-bubble hg-bubble--first">Navat at seven works for me.</p>
                  </div>
                </div>
                <div class="hg-run hg-run--own">
                  <div class="hg-run__body">
                    <p class="hg-bubble hg-bubble--own hg-bubble--first">Booked, under my name.</p>
                  </div>
                </div>
              </div>

              <div class="hg-card hg-place welcome__art-place">
                <h3 class="hg-place__name">Navat</h3>
                <span class="hg-place__cat">
                  Central Asian
                  <span class="hg-place__rating"><Star class="hg-icon" :stroke-width="1.5" />4.6</span>
                </span>
                <span class="hg-place__dist"><MapPin class="hg-icon" :stroke-width="1.5" />2.4 mi from you</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ------------------------------------------------------------ how it works -->
        <section class="welcome__section">
          <h2 class="welcome__heading">How it works</h2>

          <ol class="welcome__steps">
            <li v-for="(step, index) in STEPS" :key="step.title">
              <div class="welcome__step-number hg-num" aria-hidden="true">{{ index + 1 }}</div>
              <h3 class="welcome__item-title">{{ step.title }}</h3>
              <p class="hg-soft">{{ step.text }}</p>
            </li>
          </ol>
        </section>

        <!-- ------------------------------------------------------------ what you get -->
        <section class="welcome__section">
          <h2 class="welcome__heading">What you get</h2>

          <ul class="welcome__features">
            <li v-for="feature in FEATURES" :key="feature.title" class="welcome__feature">
              <component :is="feature.icon" class="hg-icon hg-icon--24" :stroke-width="1.5" aria-hidden="true" />
              <h3 class="welcome__item-title">{{ feature.title }}</h3>
              <p class="welcome__feature-text">{{ feature.text }}</p>
            </li>
          </ul>
        </section>

        <!-- ------------------------------------------------------------ closing -->
        <section class="welcome__closing">
          <h2 class="welcome__closing-title">Make the plan. Meet in person.</h2>
          <RouterLink class="hg-btn hg-btn--neutral hg-btn--lg welcome__cta" :to="{ name: 'register' }">
            Create account
          </RouterLink>
        </section>
      </main>

      <footer class="welcome__footer">
        <RouterLink class="welcome__logo" :to="{ name: 'welcome' }" aria-label="Hangelo">
          <HangeloLogo />
        </RouterLink>
        <span class="hg-num">{{ YEAR }}</span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.welcome {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--s-7);
  overflow-x: clip;
}

.welcome__bar {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-4) 0;
}

.welcome__logo {
  display: inline-flex;
  color: var(--c-ink);
}

/* ---------------------------------------------------------------- hero */

.welcome__hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-7);
  padding: var(--s-8) 0;
}

.welcome__pitch {
  flex: 1 1 420px;
  min-width: 0;
}

.welcome__title {
  max-width: 560px;
  margin-bottom: var(--s-4);
  font: var(--t-display);
  letter-spacing: -0.02em;
}

.welcome__lead {
  max-width: 480px;
  margin-bottom: var(--s-6);
  color: var(--c-ink-soft);
  font: var(--t-title-3);
  font-weight: 400;
}

.welcome__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-4);
}

.welcome__art-box {
  flex: 1 1 520px;
  min-width: 0;
}

/* Three pieces laid over each other; the offsets are the designers'. */
.welcome__art {
  position: relative;
  height: 440px;
}

.welcome__art-plan {
  position: absolute;
  top: 0;
  left: 0;
  width: 340px;
  border-color: transparent;
  box-shadow: var(--shadow-2);
}

.welcome__art-people {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin-top: var(--s-4);
}

.welcome__art-chat {
  position: absolute;
  top: 210px;
  left: 230px;
  width: 300px;
}

.welcome__art-place {
  position: absolute;
  top: 330px;
  left: 40px;
  width: 260px;
  box-shadow: var(--shadow-1);
}

/* ---------------------------------------------------------------- sections */

.welcome__section {
  padding: var(--s-7) 0;
  border-top: 1px solid var(--c-line);
}

.welcome__heading {
  margin-bottom: var(--s-6);
  font: var(--t-title-2);
}

.welcome__steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-5);
}

.welcome__step-number {
  margin-bottom: var(--s-3);
  color: var(--c-ink-soft);
  font: var(--t-title-1);
}

.welcome__item-title {
  font: var(--t-title-3);
}

.welcome__steps .welcome__item-title {
  margin-bottom: var(--s-2);
}

.welcome__features {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--s-5);
}

.welcome__feature {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.welcome__feature-text {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

/* ---------------------------------------------------------------- closing */

.welcome__closing {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-5);
  margin: var(--s-7) 0;
  padding: var(--s-8) var(--s-7);
  border-radius: var(--r-l);
  background: var(--c-surface-soft);
}

.welcome__closing-title {
  font: var(--t-title-1);
  letter-spacing: -0.015em;
}

.welcome__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--s-6) 0 var(--s-7);
  color: var(--c-ink-soft);
}

/* ---------------------------------------------------------------- narrower screens */

@media (max-width: 1023px) {
  .welcome {
    padding: 0 var(--s-5);
  }

  .welcome__features {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .welcome {
    padding: 0 var(--s-4);
  }

  .welcome__hero {
    gap: var(--s-6);
    padding: var(--s-6) 0 var(--s-7);
  }

  /* On a phone the hero wraps under the pitch anyway; a basis of 420px must not hold it wide. */
  .welcome__pitch,
  .welcome__art-box {
    flex-basis: 100%;
  }

  .welcome__cta {
    width: 100%;
  }

  /* The overlapping picture is wider than a phone: its pieces go one under another. */
  .welcome__art {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    height: auto;
  }

  .welcome__art-plan,
  .welcome__art-chat,
  .welcome__art-place {
    position: static;
    width: 100%;
  }

  .welcome__steps,
  .welcome__features {
    grid-template-columns: 1fr;
  }

  .welcome__closing {
    padding: var(--s-6) var(--s-5);
  }
}

/* A phone: the bar has room for the logo, the theme switch and one way in. "Create account" is
   the big button right under it, so the bar keeps only "Log in". */
@media (max-width: 520px) {
  [data-tst-id='welcome-register'] {
    display: none;
  }
}
</style>
