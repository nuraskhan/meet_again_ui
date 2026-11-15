<script setup lang="ts">
// The recorded walk-through of the product, as a player on the page.
//
// WHY the player is not there until the person presses play: a YouTube frame, merely by being on
// the page, contacts YouTube and lets it note the visit. Until someone chooses to watch, the page
// shows its own poster and asks nobody anything. On play the frame is loaded from
// youtube-nocookie.com, the address YouTube provides for embedding without tracking cookies before
// the video is started.

import { ref } from 'vue'
import { ExternalLink, Play } from 'lucide-vue-next'

const props = defineProps<{
  /** The id of the video on YouTube: the part after "v=" in its address. */
  videoId: string
  /** What the video is, for the poster and for a screen reader. */
  title: string
}>()

const playing = ref<boolean>(false)

const embed: string =
  'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(props.videoId) + '?autoplay=1&rel=0'
const watch: string = 'https://www.youtube.com/watch?v=' + encodeURIComponent(props.videoId)
</script>

<template>
  <figure class="video" data-tst-id="demo-video">
    <div class="video__frame">
      <iframe
        v-if="playing"
        class="video__player"
        :src="embed"
        :title="title"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
      ></iframe>

      <button
        v-else
        class="video__poster"
        type="button"
        :aria-label="'Play: ' + title"
        data-tst-id="demo-video-play"
        @click="playing = true"
      >
        <span class="video__play"><Play class="hg-icon" :stroke-width="1.5" aria-hidden="true" /></span>
        <span class="video__title">{{ title }}</span>
        <span class="video__hint">Plays here, from YouTube</span>
      </button>
    </div>

    <figcaption class="video__caption">
      <a class="video__link" :href="watch" target="_blank" rel="noopener noreferrer" data-tst-id="demo-video-link">
        Open on YouTube
        <ExternalLink class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
      </a>
    </figcaption>
  </figure>
</template>

<style scoped>
.video {
  width: 100%;
  margin: 0;
}

.video__frame {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid var(--c-line);
  border-radius: var(--r-l);
  background: var(--c-surface-soft);
}

.video__player {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

/* The poster: the whole area is the play button. */
.video__poster {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--s-3);
  width: 100%;
  border: 0;
  background:
    radial-gradient(circle at 50% 42%, var(--c-accent-soft), transparent 60%),
    var(--c-surface-soft);
  color: var(--c-ink);
  cursor: pointer;
}

.video__play {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: var(--r-full);
  background: var(--c-accent);
  color: var(--c-on-accent);
  box-shadow: var(--shadow-2);
  transition: transform var(--dur-2) var(--ease);
}

.video__play .hg-icon {
  width: 28px;
  height: 28px;
  /* A play triangle looks off-centre when it is centred: nudged to the right. */
  margin-left: 3px;
}

.video__poster:hover .video__play,
.video__poster:focus-visible .video__play {
  transform: scale(1.06);
}

.video__title {
  font: var(--t-title-3);
}

.video__hint {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.video__caption {
  display: flex;
  justify-content: center;
  margin-top: var(--s-3);
}

.video__link {
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  font: var(--t-small);
}

.video__link .hg-icon {
  width: 14px;
  height: 14px;
}

@media (prefers-reduced-motion: reduce) {
  .video__play {
    transition: none;
  }
}
</style>
