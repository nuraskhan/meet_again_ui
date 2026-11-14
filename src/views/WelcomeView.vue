<script setup lang="ts">
// The page a visitor sees first. No data from the server: it only explains and invites to register.

import type { EventTypeCode } from '@/api/types'
import { EVENT_TYPE_LOOK } from '@/lib/format'

const TYPES: EventTypeCode[] = ['BATH', 'FOOD', 'COFFEE', 'BAR', 'WALK', 'CINEMA', 'SPORT', 'BOARD_GAMES']

const STEPS: { title: string; text: string }[] = [
  {
    title: 'Pick what to do',
    text: 'Bathhouse, a bite, a walk. The form is already filled in with a sensible distance and budget - change what you want.',
  },
  {
    title: 'Choose who is coming',
    text: 'Tick one friend or ten. Each of them gets the same invitation and answers with one tap.',
  },
  {
    title: 'Sort out the rest in the chat',
    text: 'A group chat for exactly these people appears by itself. No "who has whose number".',
  },
]
</script>

<template>
  <div class="welcome">
    <header class="welcome__bar">
      <RouterLink class="logo" :to="{ name: 'welcome' }">
        <span class="logo__mark" aria-hidden="true"></span>
        meet again
      </RouterLink>

      <nav class="row">
        <RouterLink class="btn btn--ghost btn--small" :to="{ name: 'login' }" data-tst-id="welcome-login">
          Log in
        </RouterLink>
        <RouterLink class="btn btn--small" :to="{ name: 'register' }" data-tst-id="welcome-register">
          Get started
        </RouterLink>
      </nav>
    </header>

    <main>
      <!-- ------------------------------------------------------------ hero -->
      <section class="hero">
        <div class="hero__text">
          <p class="hero__eyebrow">For friends who keep saying "we should hang out"</p>
          <h1 class="hero__title">
            Less planning.<br />
            More <em>actually meeting</em>.
          </h1>
          <p class="hero__lead">
            Send your friends a ready-made invitation - what, how far, how much - and get a group chat
            with everyone who was invited. One minute, not forty messages.
          </p>

          <div class="row hero__actions">
            <RouterLink class="btn btn--big" :to="{ name: 'register' }" data-tst-id="welcome-cta">
              Invite your friends
            </RouterLink>
            <RouterLink class="hero__secondary" :to="{ name: 'login' }">I already have an account</RouterLink>
          </div>
        </div>

        <!-- A picture of the product made of the product's own pieces; purely decorative. -->
        <div class="hero__art" aria-hidden="true">
          <div class="hero__sun"></div>

          <div class="invite">
            <div class="invite__head">
              <span class="invite__icon">🧖</span>
              <div>
                <div class="invite__kind">Bathhouse</div>
                <div class="invite__title">Saturday steam?</div>
              </div>
            </div>
            <ul class="invite__facts">
              <li>🗓 Sat, 18:00</li>
              <li>📍 within 10 mi</li>
              <li>💸 5 000 – 15 000 ₸</li>
            </ul>
            <div class="invite__people">
              <span class="invite__face invite__face--a">A</span>
              <span class="invite__face invite__face--b">B</span>
              <span class="invite__face invite__face--c">C</span>
              <span class="invite__going">2 of 3 are in</span>
            </div>
            <div class="invite__buttons">
              <span class="invite__yes">I'm in</span>
              <span class="invite__no">Can't</span>
            </div>
          </div>

          <div class="bubble bubble--left">Who is bringing the broom? 🌿</div>
          <div class="bubble bubble--right">Me. See you at six!</div>
        </div>
      </section>

      <!-- ------------------------------------------------------------ how it works -->
      <section class="how">
        <h2 class="welcome__heading">Three taps from "let's" to "see you there"</h2>

        <ol class="how__steps">
          <li v-for="(step, index) in STEPS" :key="step.title" class="how__step">
            <span class="how__number">{{ index + 1 }}</span>
            <h3 class="how__title">{{ step.title }}</h3>
            <p class="muted">{{ step.text }}</p>
          </li>
        </ol>
      </section>

      <!-- ------------------------------------------------------------ what for -->
      <section class="kinds">
        <h2 class="welcome__heading">Whatever you are in the mood for</h2>
        <p class="muted kinds__lead">Each one comes with its own pre-filled invitation.</p>

        <div class="kinds__list">
          <span v-for="type in TYPES" :key="type" class="chip kinds__chip">
            <span aria-hidden="true">{{ EVENT_TYPE_LOOK[type].icon }}</span>
            {{ EVENT_TYPE_LOOK[type].label }}
          </span>
        </div>
      </section>

      <!-- ------------------------------------------------------------ closing -->
      <section class="closing">
        <h2 class="closing__title">Your friends are one invitation away.</h2>
        <RouterLink class="btn btn--big closing__button" :to="{ name: 'register' }">
          Create a free account
        </RouterLink>
      </section>
    </main>

    <footer class="welcome__footer">meet again · made for people who would rather meet than plan</footer>
  </div>
</template>

<style scoped>
.welcome {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 20px;
  overflow-x: clip;
}

.welcome__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 0;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--c-ink);
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.logo:hover {
  color: var(--c-ink);
}

/* Two overlapping circles: two people meeting. */
.logo__mark {
  position: relative;
  width: 30px;
  height: 20px;
}

.logo__mark::before,
.logo__mark::after {
  content: '';
  position: absolute;
  top: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.logo__mark::before {
  left: 0;
  background: var(--c-accent);
}

.logo__mark::after {
  right: 0;
  background: var(--c-teal);
  mix-blend-mode: multiply;
}

@media (prefers-color-scheme: dark) {
  .logo__mark::after {
    mix-blend-mode: screen;
  }
}

.welcome__heading {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 3.6vw, 2.3rem);
  font-weight: 600;
  text-align: center;
}

/* ---------------------------------------------------------------- hero */

.hero {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  align-items: center;
  gap: 40px;
  padding: 48px 0 72px;
}

.hero__eyebrow {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--c-accent-soft);
  color: var(--c-accent);
  font-size: 0.85rem;
  font-weight: 700;
}

.hero__title {
  margin-top: 18px;
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 6.4vw, 4.4rem);
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -0.03em;
}

.hero__title em {
  font-style: italic;
  color: var(--c-accent);
}

.hero__lead {
  max-width: 34em;
  margin-top: 20px;
  color: var(--c-ink-soft);
  font-size: 1.15rem;
}

.hero__actions {
  gap: 18px;
  margin-top: 30px;
}

.hero__secondary {
  color: var(--c-ink);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: var(--c-line);
  text-underline-offset: 4px;
}

.hero__art {
  position: relative;
  min-height: 470px;
}

.hero__sun {
  position: absolute;
  top: 6%;
  right: 4%;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, var(--c-sun), var(--c-accent));
  opacity: 0.9;
}

.invite {
  position: absolute;
  top: 40px;
  left: 6%;
  width: min(320px, 82%);
  padding: 20px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-l);
  background: var(--c-surface);
  box-shadow: var(--shadow-pop);
  transform: rotate(-3deg);
}

.invite__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.invite__icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-m);
  background: var(--c-accent-soft);
  font-size: 1.5rem;
}

.invite__kind {
  color: var(--c-accent);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.invite__title {
  font-size: 1.15rem;
  font-weight: 700;
}

.invite__facts {
  display: grid;
  gap: 6px;
  margin: 16px 0;
  padding: 0;
  list-style: none;
  color: var(--c-ink-soft);
  font-size: 0.95rem;
}

.invite__people {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.invite__face {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  margin-right: -8px;
  border: 2px solid var(--c-surface);
  border-radius: 50%;
  color: #ffffff; /* on a saturated face colour in both themes */
  font-size: 0.75rem;
  font-weight: 700;
}

.invite__face--a {
  background: hsl(14 55% 42%);
}

.invite__face--b {
  background: hsl(168 55% 32%);
}

.invite__face--c {
  background: hsl(262 45% 48%);
}

.invite__going {
  margin-left: 18px;
  color: var(--c-ink-soft);
  font-size: 0.85rem;
}

.invite__buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.invite__yes,
.invite__no {
  padding: 9px 0;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 700;
  text-align: center;
}

.invite__yes {
  background: var(--c-teal);
  color: var(--c-on-teal);
}

.invite__no {
  border: 1px solid var(--c-line);
}

.bubble {
  position: absolute;
  max-width: 230px;
  padding: 10px 16px;
  border-radius: 18px;
  box-shadow: var(--shadow-card);
  font-size: 0.95rem;
}

.bubble--left {
  right: 2%;
  bottom: 56px;
  border: 1px solid var(--c-line);
  border-bottom-left-radius: 4px;
  background: var(--c-surface);
}

.bubble--right {
  right: 10%;
  bottom: 0;
  border-bottom-right-radius: 4px;
  background: var(--c-teal);
  color: var(--c-on-teal);
}

/* ---------------------------------------------------------------- how it works */

.how {
  padding: 56px 0;
  border-top: 1px solid var(--c-line);
}

.how__steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin: 36px 0 0;
  padding: 0;
  list-style: none;
}

.how__step {
  padding: 24px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-l);
  background: var(--c-surface);
}

.how__number {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--c-ink);
  color: var(--c-page);
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
}

.how__title {
  margin: 16px 0 8px;
  font-size: 1.15rem;
}

/* ---------------------------------------------------------------- kinds */

.kinds {
  padding: 56px 0;
  border-top: 1px solid var(--c-line);
  text-align: center;
}

.kinds__lead {
  margin-top: 10px;
}

.kinds__list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  max-width: 720px;
  margin: 28px auto 0;
}

.kinds__chip {
  padding: 10px 18px;
  font-size: 1rem;
}

/* ---------------------------------------------------------------- closing */

.closing {
  display: grid;
  justify-items: center;
  gap: 24px;
  margin: 16px 0 56px;
  padding: 56px 24px;
  border-radius: var(--radius-l);
  background: var(--c-ink);
  text-align: center;
}

.closing__title {
  max-width: 16em;
  color: var(--c-page);
  font-family: var(--font-display);
  font-size: clamp(1.7rem, 4vw, 2.6rem);
  font-weight: 600;
}

.welcome__footer {
  padding: 0 0 36px;
  color: var(--c-ink-faint);
  font-size: 0.85rem;
  text-align: center;
}

/* ---------------------------------------------------------------- narrow screens */

@media (max-width: 860px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 24px 0 48px;
  }

  .hero__art {
    min-height: 400px;
  }

  .hero__sun {
    width: 240px;
    height: 240px;
  }

  .how__steps {
    grid-template-columns: 1fr;
  }
}
</style>
