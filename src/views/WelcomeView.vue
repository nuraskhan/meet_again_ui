<script setup lang="ts">
// The page a visitor sees first. No data from the server: it only explains and invites to register.
// One centred sentence and one button, then how it works: three steps, each beside a piece of the
// product itself.

import type { Component } from 'vue'
import {
  ArrowDown,
  ArrowUpRight,
  Clock,
  Coffee,
  Heart,
  MapPin,
  Mountain,
  Plane,
  Star,
  Utensils,
  Wallet,
} from 'lucide-vue-next'
import HangeloLogo from '@/components/HangeloLogo.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

// The words of this page follow the product research (the Business Cup document): its tagline, its
// value proposition, the four things a group has to reconcile, and the two figures it quotes.

const STEPS: { title: string; text: string }[] = [
  {
    title: 'Start a plan',
    text: 'Say what you feel like doing, offer a few dates and send the link to your friends. It takes a minute.',
  },
  {
    title: 'Everyone says what works for them',
    text: 'Free times, budget, favourite activities and how far they will travel. Once, instead of in dozens of messages.',
  },
  {
    title: 'Get one plan that fits',
    text: "Hangelo suggests a time and a place that suit the group, and says why. Talk it over in the plan's chat and confirm.",
  },
]

/** What one guest answers: the four things that make a group hard to gather. */
const ANSWERS: { icon: Component; tone: string; label: string; value: string }[] = [
  { icon: Clock, tone: 'sky', label: 'Free', value: 'Fri or Sat evening' },
  { icon: Wallet, tone: 'mint', label: 'Budget', value: 'Up to $40' },
  { icon: Heart, tone: 'coral', label: 'Likes', value: 'Dinner, bowling' },
  { icon: MapPin, tone: 'sun', label: 'Travels', value: 'Up to 5 mi' },
]

/** Pew Research Center, January 2025: American adults who have close friends. */
const FIGURES: { value: string; text: string }[] = [
  { value: '61%', text: 'text a close friend at least a few times a week' },
  { value: '29%', text: 'see a close friend in person that often' },
]

/** The arrow at the bottom of the first screen: down to the steps. */
function showSteps(): void {
  const reduce: boolean = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('welcome-how')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

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
          <!-- Pieces of the product scattered around the sentence, on a screen wide enough to
               have room beside it; purely decorative. -->
          <div class="welcome__scatter" aria-hidden="true">
            <div class="hg-card welcome__bit welcome__bit--plan">
              <div class="hg-plan hg-plan--compact">
                <span class="hg-plan__kind">
                  <Mountain class="hg-icon welcome__kind welcome__kind--hike" :stroke-width="1.5" />
                  Hike
                </span>
                <h3 class="hg-plan__title">Hike on Sunday</h3>
                <ul class="hg-plan__facts">
                  <li class="hg-plan__fact"><Clock class="hg-icon" :stroke-width="1.5" />Sun, 22 Nov, 09:00</li>
                  <li class="hg-plan__fact"><MapPin class="hg-icon" :stroke-width="1.5" />Up to 15 mi</li>
                </ul>
              </div>
            </div>

            <div class="hg-card welcome__bit welcome__bit--answer">
              <span class="hg-avatar hg-avatar--40 welcome__tone welcome__tone--coral">AS</span>
              <span class="welcome__bit-text">
                <span class="welcome__bit-title">Aisha</span>
                <span class="welcome__bit-sub">Dinner on Friday</span>
              </span>
              <span class="hg-badge hg-badge--success">Coming</span>
            </div>

            <div class="hg-chat welcome__bit welcome__bit--chat">
              <div class="hg-run">
                <span class="hg-avatar hg-avatar--32 welcome__tone welcome__tone--mint">DM</span>
                <div class="hg-run__body">
                  <p class="hg-run__name">Dana</p>
                  <p class="hg-bubble hg-bubble--first">Who is bringing the snacks?</p>
                </div>
              </div>
              <div class="hg-run hg-run--own">
                <div class="hg-run__body">
                  <p class="hg-bubble hg-bubble--own hg-bubble--first">Me. Again.</p>
                </div>
              </div>
            </div>

            <div class="hg-card welcome__bit welcome__bit--people">
              <span class="hg-plan__kind">
                <Coffee class="hg-icon welcome__kind welcome__kind--coffee" :stroke-width="1.5" />
                Coffee, Sat, 11:00
              </span>
              <span class="welcome__bit-people">
                <span class="hg-stack">
                  <span class="hg-avatar hg-avatar--32 welcome__tone welcome__tone--sun">AZ</span>
                  <span class="hg-avatar hg-avatar--32 welcome__tone welcome__tone--sky">TK</span>
                  <span class="hg-avatar hg-avatar--32 welcome__tone welcome__tone--coral">AS</span>
                  <span class="hg-avatar hg-avatar--32 hg-stack__more">+3</span>
                </span>
                <span>6 coming</span>
              </span>
            </div>
          </div>

          <HangeloLogo :word="false" :size="56" />
          <h1 class="welcome__title welcome__title--wide">
            <span class="welcome__line">From “We should hang out”</span>
            <span class="welcome__line">to “See you there.”</span>
          </h1>
          <p class="welcome__lead">
            Hangelo turns your friends’ different schedules, budgets, interests and locations into one confirmed plan.
          </p>

          <RouterLink class="hg-btn hg-btn--primary hg-btn--lg" :to="{ name: 'register' }" data-tst-id="welcome-cta">
            Create account
            <ArrowUpRight class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          </RouterLink>
          <RouterLink class="hg-link" :to="{ name: 'login' }">I already have an account</RouterLink>

          <button class="hg-btn hg-btn--quiet welcome__down" type="button" @click="showSteps">
            How it works
            <ArrowDown class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          </button>
        </section>

        <!-- ------------------------------------------------------------ how it works -->
        <!-- Each step stands beside a picture made of the product's own pieces; the pictures are
             purely decorative. -->
        <!-- No visible title: the button at the bottom of the first screen already says it. -->
        <section id="welcome-how" class="welcome__how" aria-label="How it works">
          <ol class="welcome__steps">
            <li v-for="(step, index) in STEPS" :key="step.title" class="welcome__step">
              <div class="welcome__shot" aria-hidden="true">
                <div v-if="index === 0" class="hg-card hg-card--lg welcome__piece">
                  <div class="hg-plan hg-plan--compact">
                    <span class="hg-plan__kind">
                      <Utensils class="hg-icon welcome__kind welcome__kind--dinner" :stroke-width="1.5" />
                      Dinner
                    </span>
                    <h3 class="hg-plan__title">Dinner on Friday</h3>
                    <ul class="hg-plan__facts">
                      <li class="hg-plan__fact"><Clock class="hg-icon" :stroke-width="1.5" />Fri, 20 Nov, 19:00</li>
                      <li class="hg-plan__fact"><MapPin class="hg-icon" :stroke-width="1.5" />Up to 5 mi</li>
                      <li class="hg-plan__fact"><Wallet class="hg-icon" :stroke-width="1.5" />$20–40</li>
                    </ul>
                  </div>
                </div>

                <div v-else-if="index === 1" class="hg-card welcome__piece welcome__answers">
                  <div class="welcome__answers-who">
                    <span class="hg-avatar hg-avatar--32 welcome__tone welcome__tone--coral">AS</span>
                    <span class="welcome__bit-title">Aisha</span>
                    <span class="app-grow"></span>
                    <span class="hg-badge hg-badge--success">Answered</span>
                  </div>
                  <div v-for="answer in ANSWERS" :key="answer.label" class="welcome__answer">
                    <span class="welcome__answer-icon welcome__tone" :class="`welcome__tone--${answer.tone}`">
                      <component :is="answer.icon" class="hg-icon" :stroke-width="1.5" />
                    </span>
                    <span class="welcome__answer-label">{{ answer.label }}</span>
                    <span class="welcome__answer-value">{{ answer.value }}</span>
                  </div>
                </div>

                <div v-else class="welcome__piece welcome__agree">
                  <div class="hg-card hg-card--lg">
                    <div class="hg-plan hg-plan--compact">
                      <span class="hg-plan__kind">
                        <Star class="hg-icon welcome__star" :stroke-width="1.5" />
                        Best match
                      </span>
                      <h3 class="hg-plan__title">Dinner at Navat</h3>
                      <ul class="hg-plan__facts">
                        <li class="hg-plan__fact"><Clock class="hg-icon" :stroke-width="1.5" />Fri, 20 Nov, 19:00</li>
                        <li class="hg-plan__fact"><Wallet class="hg-icon" :stroke-width="1.5" />$20–40</li>
                      </ul>
                    </div>
                    <div class="welcome__match">
                      <span class="hg-badge hg-badge--success">Works for 4 of 5</span>
                      <span class="welcome__match-why">Dana is free only on Saturday.</span>
                    </div>
                  </div>

                  <div class="hg-chat">
                    <div class="hg-run">
                      <span class="hg-avatar hg-avatar--32 welcome__tone welcome__tone--mint">DM</span>
                      <div class="hg-run__body">
                        <p class="hg-run__name">Dana</p>
                        <p class="hg-bubble hg-bubble--first">Moved my thing. I am in!</p>
                      </div>
                    </div>
                    <div class="hg-run hg-run--own">
                      <div class="hg-run__body">
                        <p class="hg-bubble hg-bubble--own hg-bubble--first">See you there.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="welcome__words">
                <div class="welcome__step-number hg-num" aria-hidden="true">{{ index + 1 }}</div>
                <h3 class="welcome__step-title">{{ step.title }}</h3>
                <p class="welcome__step-text">{{ step.text }}</p>
              </div>
            </li>
          </ol>
        </section>

        <!-- ------------------------------------------------------------ why -->
        <section class="welcome__why" aria-labelledby="welcome-why">
          <h2 id="welcome-why" class="welcome__step-title">We talk all the time. We meet far less.</h2>

          <dl class="welcome__figures">
            <div v-for="figure in FIGURES" :key="figure.value" class="welcome__figure">
              <dt class="welcome__figure-value hg-num">{{ figure.value }}</dt>
              <dd class="welcome__figure-text">{{ figure.text }}</dd>
            </div>
          </dl>

          <p class="welcome__source">
            American adults who have close friends. Pew Research Center, January 2025.
          </p>
        </section>

        <!-- ------------------------------------------------------------ what comes next -->
        <!-- Not in the product yet, and says so. -->
        <section class="welcome__soon" aria-labelledby="welcome-soon">
          <span class="welcome__answer-icon welcome__tone welcome__tone--sky" aria-hidden="true">
            <Plane class="hg-icon" :stroke-width="1.5" />
          </span>
          <div class="welcome__soon-words">
            <h2 id="welcome-soon" class="welcome__soon-title">
              Know when you’re close.
              <span class="hg-badge hg-badge--warning">Coming soon</span>
            </h2>
            <p class="hg-soft">
              Tell friends in another city that you are visiting, and make a plan to meet while you are there.
            </p>
          </div>
        </section>

        <!-- ------------------------------------------------------------ closing -->
        <section class="welcome__closing">
          <h2 class="welcome__title">Less planning. More hanging out.</h2>
          <p class="welcome__lead">Not another group chat. Not another calendar. Just the plan.</p>
          <RouterLink class="hg-btn hg-btn--neutral hg-btn--lg" :to="{ name: 'register' }">
            Create account
            <ArrowUpRight class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
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
/* The people and the activities in the pictures of this page are coloured, so that the page is not
   all grey. These colours live only here: in the application itself an avatar without a photo
   stays grey. Each is a mid tone that reads on the light and on the dark theme alike. */
.welcome {
  --welcome-sun: #ffd84d;
  --welcome-on-sun: #4a3800;
  --welcome-coral: #ff9e8a;
  --welcome-on-coral: #5a1608;
  --welcome-mint: #8ee0b5;
  --welcome-on-mint: #0b4a2b;
  --welcome-sky: #9ccbff;
  --welcome-on-sky: #0b3566;
  --welcome-hike: #2fa36b;
  --welcome-dinner: #f0654a;
  --welcome-coffee: #d9912b;
  --welcome-star: #f5b800;
}

.welcome__tone--sun {
  background: var(--welcome-sun);
  color: var(--welcome-on-sun);
}

.welcome__tone--coral {
  background: var(--welcome-coral);
  color: var(--welcome-on-coral);
}

.welcome__tone--mint {
  background: var(--welcome-mint);
  color: var(--welcome-on-mint);
}

.welcome__tone--sky {
  background: var(--welcome-sky);
  color: var(--welcome-on-sky);
}

.welcome__kind--hike {
  color: var(--welcome-hike);
}

.welcome__kind--dinner {
  color: var(--welcome-dinner);
}

.welcome__kind--coffee {
  color: var(--welcome-coffee);
}

.welcome__star {
  color: var(--welcome-star);
  fill: var(--welcome-star);
}

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

/* The first screen holds nothing but the mark, one sentence and the way in. */
.welcome__hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--s-5);
  min-height: calc(100vh - 72px);
  min-height: calc(100dvh - 72px);
  padding: var(--s-8) 0 calc(var(--s-8) * 2);
  text-align: center;
}

.welcome__lead {
  max-width: 460px;
  margin-top: calc(var(--s-2) * -1);
  color: var(--c-ink-soft);
  font: var(--t-title-3);
  font-weight: 400;
  text-wrap: balance;
}

.welcome__down {
  position: absolute;
  bottom: var(--s-5);
  left: 50%;
  transform: translateX(-50%);
}

/* The scattered pieces: hidden until the screen has room beside the sentence (see the bottom). */
.welcome__scatter {
  display: none;
}

.welcome__bit {
  position: absolute;
  width: 240px;
  text-align: left;
}

.welcome__bit--plan {
  top: 9%;
  left: 0;
  transform: rotate(-4deg);
}

.welcome__bit--answer {
  top: 15%;
  right: 0;
  display: flex;
  align-items: center;
  gap: var(--s-3);
  width: 270px;
  transform: rotate(3deg);
}

.welcome__bit--chat {
  bottom: 19%;
  left: var(--s-5);
  transform: rotate(2deg);
}

.welcome__bit--people {
  right: var(--s-5);
  bottom: 22%;
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  width: 220px;
  transform: rotate(-3deg);
}

.welcome__bit-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.welcome__bit-title {
  font: var(--t-body-strong);
}

.welcome__bit-sub {
  overflow: hidden;
  color: var(--c-ink-soft);
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--t-small);
}

.welcome__bit-people {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

@media (min-width: 1100px) {
  .welcome__scatter {
    display: block;
  }
}

.welcome__title {
  max-width: 620px;
  font: var(--t-display);
  letter-spacing: -0.02em;
  text-wrap: balance;
}

/* The headline of the first screen breaks where its sense does, wherever a half fits in a line. */
.welcome__title--wide {
  max-width: 760px;
}

.welcome__line {
  display: inline-block;
}

/* ---------------------------------------------------------------- how it works */

.welcome__how {
  /* Where the arrow of the first screen stops: with some air above the first step. */
  scroll-margin-top: var(--s-4);
}

.welcome__steps {
  display: flex;
  flex-direction: column;
  gap: calc(var(--s-8) * 1.5);
  max-width: 960px;
  margin: 0 auto;
}

.welcome__step {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: var(--s-8);
}

.welcome__shot {
  display: grid;
  place-items: center;
  min-height: 400px;
  padding: var(--s-6);
  border-radius: var(--r-l);
  background: var(--c-surface-soft);
}

.welcome__piece {
  width: 100%;
  max-width: 320px;
}

.welcome__answers {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.welcome__answers-who {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding-bottom: var(--s-3);
  border-bottom: 1px solid var(--c-line);
}

.welcome__answer {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.welcome__answer-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--r-full);
}

.welcome__answer-icon .hg-icon {
  width: 16px;
  height: 16px;
}

.welcome__answer-label {
  width: 56px;
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.welcome__answer-value {
  font: var(--t-body-strong);
}

.welcome__match {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s-1);
  margin-top: var(--s-4);
  padding-top: var(--s-3);
  border-top: 1px solid var(--c-line);
}

.welcome__match-why {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.welcome__agree {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

/* The incoming bubble is the colour of the box it lies in here; one step stronger shows it. */
.welcome__agree .hg-bubble:not(.hg-bubble--own) {
  background: var(--c-surface-strong);
}

.welcome__step-number {
  margin-bottom: var(--s-3);
  color: var(--c-ink-faint);
  font: var(--t-body-strong);
}

.welcome__step-title {
  margin-bottom: var(--s-4);
  font: var(--t-title-1);
  letter-spacing: -0.015em;
  text-wrap: balance;
}

.welcome__step-text {
  max-width: 420px;
  color: var(--c-ink-soft);
  font: var(--t-title-3);
  font-weight: 400;
}

/* ---------------------------------------------------------------- why */

.welcome__why {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: calc(var(--s-8) * 2.5);
  text-align: center;
}

.welcome__figures {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--s-6) calc(var(--s-8) * 1.5);
  margin: var(--s-6) 0;
}

.welcome__figure {
  width: 240px;
}

.welcome__figure-value {
  font: var(--t-display);
  font-size: 72px;
  line-height: 76px;
  letter-spacing: -0.03em;
}

/* The smaller number is the point of the two. */
.welcome__figure:last-child .welcome__figure-value {
  color: var(--c-accent-text);
}

.welcome__figure-text {
  margin: var(--s-2) 0 0;
  color: var(--c-ink-soft);
  font: var(--t-title-3);
  font-weight: 400;
  text-wrap: balance;
}

.welcome__source {
  color: var(--c-ink-faint);
  font: var(--t-small);
}

/* ---------------------------------------------------------------- what comes next */

.welcome__soon {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  max-width: 640px;
  margin: calc(var(--s-8) * 1.5) auto 0;
  padding: var(--s-5);
  border-radius: var(--r-l);
  background: var(--c-surface-soft);
}

.welcome__soon-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
  margin-bottom: var(--s-1);
  font: var(--t-title-3);
}

/* ---------------------------------------------------------------- closing */

.welcome__closing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-5);
  padding: calc(var(--s-8) * 2.5) 0 calc(var(--s-8) * 2);
  text-align: center;
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

  .welcome__step {
    gap: var(--s-6);
  }
}

@media (max-width: 767px) {
  .welcome {
    padding: 0 var(--s-4);
  }

  /* One column: the picture, then its words. */
  .welcome__steps {
    gap: var(--s-8);
  }

  .welcome__step {
    grid-template-columns: 1fr;
    gap: var(--s-5);
  }

  .welcome__shot {
    min-height: 0;
    padding: var(--s-6) var(--s-4);
  }

  .welcome__closing {
    padding: calc(var(--s-8) * 1.5) 0 var(--s-8);
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
