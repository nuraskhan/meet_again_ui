// The way through a plan, as a short list of steps: what the person has done and the one thing to
// do now. An organiser invites, says where they are, chooses the place; a guest answers and gets
// the place the organiser chose. Used by the guide on the plan page and by the "next" line on a plan card.

import type { EventDto, Invitee } from '@/api/types'

export type PlanStepId = 'answer' | 'invite' | 'where' | 'place' | 'wait'

export interface PlanStep {
  id: PlanStepId
  /** The step as a line of the list: "Invite people". */
  title: string
  /** One or two sentences shown while this is the step to do now. */
  hint: string
  done: boolean
  /** Not this person's move: they wait for someone else. Shown in the guide, never as a "next" on a card. */
  waiting?: boolean
}

/** A guest who is expected: coming, or not answered yet. */
function expected(invitee: Invitee): boolean {
  return invitee.status === 'ACCEPTED' || invitee.status === 'PENDING'
}

/** Where this browser remembers that the organiser has sent the link of a plan. */
function linkSentKey(eventId: number): string {
  return 'hangelo.linkSent.' + eventId
}

/**
 * The organiser shared or copied the link of the plan in this browser. Until a guest appears it is
 * the only sign that inviting is done; a browser without storage simply forgets it.
 */
export function wasLinkSent(eventId: number): boolean {
  try {
    return localStorage.getItem(linkSentKey(eventId)) !== null
  } catch {
    return false
  }
}

export function markLinkSent(eventId: number): void {
  try {
    localStorage.setItem(linkSentKey(eventId), '1')
  } catch {
    // No storage (a private window): the guide keeps offering the link, nothing worse.
  }
}

/**
 * The steps of a plan for one person, in order. Empty when there is nothing to guide: the plan is
 * over or cancelled, or the person declined, was removed, or is not part of it.
 *
 * @param linkSent the organiser has already sent the link (see wasLinkSent)
 */
export function planSteps(event: EventDto, userId: number | null, linkSent: boolean): PlanStep[] {
  if (event.status !== 'ACTIVE') {
    return []
  }

  // The plan has its venue: what everything before it was for.
  const placed: boolean = event.place !== null

  if (event.creatorId === userId) {
    // A typed place alone is not a point on the map: nothing can be suggested from a name.
    const typedOnly: boolean = event.myPreference !== null && event.myPreference.latitude === null
    const located: boolean = event.myPreference !== null && !typedOnly
    const suggested: boolean = event.suggestedAt !== null && event.suggestions.length > 0

    return [
      {
        id: 'invite',
        title: 'Invite people',
        hint:
          event.visibility === 'PUBLIC'
            ? 'Your plan is in the feed. Send the link too, so friends find it at once.'
            : 'Send the link to the people you want to come. They answer in one tap. Planning alone? Go straight to the place below.',
        // Someone planning alone who already has a place has nobody to invite.
        done: linkSent || event.invitees.length > 0 || placed,
      },
      {
        id: 'where',
        title: 'Say where you are',
        hint: typedOnly
          ? 'You typed a place, but it is not on the map yet. Drop a pin or use your location, so places near you can be found.'
          : 'Put yourself on the map and say how far you will go: places are suggested around that point.',
        // With the venue chosen the location has done its job, whether it was given or not.
        done: located || placed,
      },
      {
        id: 'place',
        title: 'Choose the place',
        hint: suggested
          ? 'The suggestions are below: press "Choose this place" on the one you like, or choose any other yourself.'
          : 'Ask for suggestions near you, or choose any place yourself. Your guests see it at once.',
        done: placed,
      },
    ]
  }

  const mine: Invitee | undefined = event.invitees.find((invitee) => invitee.userId === userId)
  if (mine === undefined || !expected(mine)) {
    return []
  }

  return [
    {
      id: 'answer',
      title: 'Answer the invitation',
      hint: event.creatorName + ' invites you. Say whether you are coming.',
      done: mine.status === 'ACCEPTED',
    },
    {
      id: 'wait',
      title: 'Get the place',
      hint:
        'You are in. ' +
        event.creatorName +
        ' chooses the place and it appears on this page. Nothing else is needed from you.',
      done: placed,
      waiting: true,
    },
  ]
}

/** The step to do now: the first one not done. Null when all are done or there are none. */
export function nextStep(steps: PlanStep[]): PlanStep | null {
  return steps.find((step) => !step.done) ?? null
}
