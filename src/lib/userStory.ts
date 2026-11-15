// The "user story" version of the application: the same pages with a guide through a plan
// ("What's next"), kept apart from the general pages under the address prefix /user-story.
//
// The rule: nothing of the user story shows on a general address. A page asks here whether it was
// opened under the prefix, and builds its links through here so that a person who came in under
// the prefix stays under it.

import { computed, type ComputedRef } from 'vue'
import { useRoute, type RouteLocationRaw, type RouteParamsRawGeneric } from 'vue-router'

/** Every address of the user story starts with this. */
export const USER_STORY_PREFIX: string = '/user-story'

/** The pages that have a user-story twin; the twin's route is named "user-story-<name>". */
export type StoryPage = 'plans' | 'plan' | 'plan-new' | 'invite'

export function useUserStory(): {
  /** The page was opened under /user-story. */
  inStory: ComputedRef<boolean>
  /** The way to a page: its user-story twin when we are in the user story, the general page otherwise. */
  storyTo: (page: StoryPage, params?: RouteParamsRawGeneric) => RouteLocationRaw
} {
  const route = useRoute()
  const inStory = computed<boolean>(
    () => route.path === USER_STORY_PREFIX || route.path.startsWith(USER_STORY_PREFIX + '/'),
  )

  function storyTo(page: StoryPage, params?: RouteParamsRawGeneric): RouteLocationRaw {
    return { name: inStory.value ? 'user-story-' + page : page, params }
  }

  return { inStory, storyTo }
}
