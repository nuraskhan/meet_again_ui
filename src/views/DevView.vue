<script setup lang="ts">
// For developers: a page of its own, /dev, linked from the top bar of the welcome page.
//
// The code of Hangelo is public, in two repositories on GitHub. This page is the way in: where to
// report a bug, where the open issues are, how to send a change - and the latest release.
//
// Releases: every deploy adds a card to RELEASES.md (the rule is in CLAUDE.md). Only the newest
// applied card is shown here; the rest are a click away in git.

import type { Component } from 'vue'
import { ArrowUpRight, Bug, GitPullRequest, ListChecks } from 'lucide-vue-next'
import HangeloLogo from '@/components/HangeloLogo.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { appliedDay, latestRelease, RELEASES_URL } from '@/lib/releases'
import type { Release } from '@/lib/releases'
import { auth } from '@/stores/auth'

const REPO_UI = 'https://github.com/nuraskhan/meet_again_ui'
const REPO_SERVER = 'https://github.com/nuraskhan/meet_again'

/**
 * The ways in. Each leads to BOTH repositories: a bug in what is seen on the screen belongs to the
 * web application, a bug in what the data does belongs to the server, and a person who has found
 * one should not have to guess that only one of them takes reports.
 */
interface Way {
  key: string
  icon: Component
  name: string
  text: string
  /** What is added to the address of a repository. */
  path: string
}

const WAYS: Way[] = [
  {
    key: 'bug',
    icon: Bug,
    name: 'Report a bug',
    text: 'Say what you did, what you expected and what happened. A screenshot helps.',
    path: '/issues/new',
  },
  {
    key: 'issues',
    icon: ListChecks,
    name: 'Open issues',
    text: 'See what is known and what is planned, add your voice, or pick one to work on.',
    path: '/issues',
  },
  {
    key: 'contribute',
    icon: GitPullRequest,
    name: 'Contribute',
    text: 'Fork, change, open a pull request. Anyone can; every one is reviewed before it is merged.',
    path: '/blob/main/CONTRIBUTING.md',
  },
]

const REPOS: { key: string; name: string; url: string; hint: string }[] = [
  { key: 'web', name: 'Web app', url: REPO_UI, hint: 'what you see: pages, buttons, layout' },
  { key: 'server', name: 'Server', url: REPO_SERVER, hint: 'what happens to the data: accounts, plans, chats, letters' },
]

const release: Release | null = latestRelease()
</script>

<template>
  <div class="app-bare">
    <div class="dev">
      <header class="dev__bar">
        <RouterLink
          class="dev__logo"
          :to="{ name: auth.isLoggedIn.value ? 'plans' : 'welcome' }"
          aria-label="Hangelo"
        >
          <HangeloLogo />
        </RouterLink>
        <span class="app-grow"></span>
        <ThemeToggle />
        <RouterLink
          class="hg-btn hg-btn--outline"
          :to="{ name: auth.isLoggedIn.value ? 'plans' : 'welcome' }"
          data-tst-id="dev-back"
        >
          {{ auth.isLoggedIn.value ? 'My plans' : 'About Hangelo' }}
        </RouterLink>
      </header>

      <main class="dev__main" data-tst-id="dev-page">
        <h1 class="dev__title">Built in the open</h1>
        <p class="dev__lead">
          The code of Hangelo is public on GitHub. Found a bug, miss a feature, want to build one? Come in.
        </p>

        <!-- Three ways in, each to either repository. Every link leaves the site, to GitHub. -->
        <div class="dev__cards">
          <article v-for="way in WAYS" :key="way.key" class="dev__card" :data-tst-id="'dev-' + way.key">
            <span class="hg-iconcircle">
              <component :is="way.icon" class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
            </span>
            <h2 class="dev__card-name">{{ way.name }}</h2>
            <p class="dev__card-text">{{ way.text }}</p>
            <div class="dev__card-links">
              <a
                v-for="repo in REPOS"
                :key="repo.key"
                class="hg-btn hg-btn--outline hg-btn--sm"
                :href="repo.url + way.path"
                target="_blank"
                rel="noopener noreferrer"
                :title="repo.name + ': ' + repo.hint"
                :aria-label="way.name + ': ' + repo.name + ' (' + repo.hint + ')'"
                :data-tst-id="'dev-' + way.key + '-' + repo.key"
              >
                {{ repo.name }}
                <ArrowUpRight class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              </a>
            </div>
          </article>
        </div>

        <p class="dev__which">
          Which one? <b>Web app</b> is what you see: pages, buttons, layout. <b>Server</b> is what happens to the
          data: accounts, plans, chats, letters. Not sure? Use Web app: it will be moved if needed.
        </p>

        <!-- The latest release: one card. -->
        <article v-if="release !== null" class="dev__release" data-tst-id="dev-release">
          <header class="dev__release-head">
            <span class="hg-badge dev__release-version hg-num" data-tst-id="dev-release-version">
              v{{ release.version }}
            </span>
            <h2 class="dev__release-title">Latest release</h2>
            <time v-if="release.applied !== null" class="dev__release-when hg-num" :title="release.applied">
              Applied {{ appliedDay(release.applied) }}
            </time>
          </header>

          <div class="dev__release-groups">
            <section v-for="part in release.changes" :key="part.group">
              <h3 class="dev__release-group-name">{{ part.group }}</h3>
              <ul class="dev__release-list">
                <li v-for="item in part.items" :key="item">{{ item }}</li>
              </ul>
            </section>
          </div>

          <a
            class="dev__release-all"
            :href="RELEASES_URL"
            target="_blank"
            rel="noopener noreferrer"
            data-tst-id="dev-release-all"
          >
            All releases on GitHub
            <ArrowUpRight class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          </a>
        </article>

        <p class="dev__repos">
          The code:
          <a :href="REPO_UI" target="_blank" rel="noopener noreferrer" data-tst-id="dev-repo-ui">web application</a>
          ·
          <a :href="REPO_SERVER" target="_blank" rel="noopener noreferrer" data-tst-id="dev-repo-server">server</a>
        </p>
      </main>
    </div>
  </div>
</template>

<style scoped>
.dev {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 var(--s-5) var(--s-8);
}

.dev__bar {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-4) 0;
}

.dev__logo {
  display: inline-flex;
}

.dev__main {
  max-width: 860px;
  margin: var(--s-7) auto 0;
  text-align: center;
}

.dev__title {
  font: var(--t-display);
  letter-spacing: -0.02em;
}

.dev__lead {
  margin-top: var(--s-3);
  color: var(--c-ink-soft);
}

.dev__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-4);
  margin-top: var(--s-6);
  text-align: left;
}

.dev__card {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  padding: var(--s-5);
  border: 1px solid var(--c-line);
  border-radius: var(--r-l);
  background: var(--c-surface);
}

/* The two repositories, at the bottom of the card whatever the length of its text. */
.dev__card-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin-top: auto;
  padding-top: var(--s-3);
}

.dev__card-links .hg-icon {
  width: 14px;
  height: 14px;
}

.dev__which {
  margin-top: var(--s-4);
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.dev__which b {
  color: var(--c-ink);
}

.dev__card-name {
  margin-top: var(--s-2);
  font: var(--t-title-3);
}

.dev__card-text {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

/* The latest release: one card under the three ways in. */
.dev__release {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  margin-top: var(--s-4);
  padding: var(--s-5);
  border: 1px solid var(--c-line);
  border-radius: var(--r-l);
  background: var(--c-surface);
  text-align: left;
}

.dev__release-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2) var(--s-3);
}

.dev__release-version {
  border-color: transparent;
  background: var(--c-accent-soft);
  color: var(--c-accent-text);
}

.dev__release-title {
  flex: 1 1 auto;
  font: var(--t-title-3);
}

.dev__release-when {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

/* The groups side by side where there is room, one under another where there is not. */
.dev__release-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--s-4) var(--s-6);
}

.dev__release-group-name {
  margin-bottom: var(--s-1);
  color: var(--c-ink-soft);
  font: var(--t-caption);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dev__release-list {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  padding-left: var(--s-4);
  list-style: disc;
  font: var(--t-small);
}

.dev__release-all {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--s-1);
  font: var(--t-small);
}

.dev__release-all .hg-icon {
  width: 14px;
  height: 14px;
}

.dev__repos {
  margin-top: var(--s-5);
  color: var(--c-ink-soft);
  font: var(--t-small);
}

@media (max-width: 767px) {
  .dev {
    padding: 0 var(--s-4) var(--s-7);
  }

  .dev__main {
    margin-top: var(--s-5);
  }

  .dev__title {
    font: var(--t-title-1);
  }

  .dev__cards {
    grid-template-columns: 1fr;
  }
}

</style>
