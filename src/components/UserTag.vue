<script setup lang="ts">
// The tag by a person's name: a short word we give ("Team", "Founder"). It is set by hand in the
// database only - nobody can give one to themselves from the application. No tag = nothing shown.

defineProps<{
  tag: string | null | undefined
}>()
</script>

<template>
  <span v-if="tag" class="hg-badge user-tag" data-tst-id="user-tag">{{ tag }}</span>
</template>

<style scoped>
/* In the accent, so it is not taken for the "Plus" badge, which a person takes themselves. */
.user-tag {
  flex: none;
  border-color: transparent;
  background: var(--c-accent-soft);
  color: var(--c-accent-text);
  vertical-align: middle;
}
</style>
