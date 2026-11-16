// The releases of Hangelo, read from RELEASES.md at the root of the repository.
//
// WHY the file is read and not copied here: the list of releases is kept in git as a document
// people read on GitHub. A second copy for the page that shows them (/dev) would be forgotten on the first busy
// deploy, and the page would then show an old release as the latest. So there is one source, and
// the build takes it in as text.
//
// The format of a card is described at the top of RELEASES.md and in CLAUDE.md.

import source from '../../RELEASES.md?raw'

/** The groups a card may have, in the order they are shown. */
export const CHANGE_GROUPS = ['Added', 'Changed', 'Fixed', 'Removed'] as const
export type ChangeGroup = (typeof CHANGE_GROUPS)[number]

export interface Release {
  /** "0.2.0", without the "v". */
  version: string
  /** "2026-11-16 14:30 UTC" as written in the card; null = written but not deployed yet. */
  applied: string | null
  /** The changes by group; only the groups the card has. */
  changes: { group: ChangeGroup; items: string[] }[]
}

/** Where the whole list is read by people. */
export const RELEASES_URL = 'https://github.com/nuraskhan/meet_again_ui/blob/main/RELEASES.md'

/**
 * Every card of the text, in the order of the file (newest first).
 *
 * Forgiving on purpose: a line it does not understand is skipped, never an error - a slip in a
 * document must not break the page that shows it.
 */
export function parseReleases(text: string): Release[] {
  const releases: Release[] = []
  let current: Release | null = null
  let group: { group: ChangeGroup; items: string[] } | null = null

  for (const raw of text.split(/\r?\n/)) {
    const line: string = raw.trim()

    const head: RegExpMatchArray | null = line.match(/^## v(\d+\.\d+\.\d+)\b/)
    if (head !== null) {
      current = { version: head[1]!, applied: null, changes: [] }
      group = null
      releases.push(current)
      continue
    }
    if (current === null) {
      continue // the introduction, above the first card
    }

    const applied: RegExpMatchArray | null = line.match(/^Applied:\s*(.+)$/)
    if (applied !== null) {
      const value: string = applied[1]!.trim()
      current.applied = value.toLowerCase() === 'pending' ? null : value
      continue
    }

    const heading: RegExpMatchArray | null = line.match(/^### (.+)$/)
    if (heading !== null) {
      const name: ChangeGroup | undefined = CHANGE_GROUPS.find((known) => known === heading[1]!.trim())
      group = name === undefined ? null : { group: name, items: [] }
      if (group !== null) {
        current.changes.push(group)
      }
      continue
    }

    if (group !== null && line.startsWith('- ')) {
      group.items.push(line.slice(2).trim())
    }
  }

  return releases
}

/** The newest release that was really deployed; null if the file has none. */
export function latestRelease(): Release | null {
  return parseReleases(source).find((release) => release.applied !== null) ?? null
}

/** "Nov 16, 2026" from "2026-11-16 14:30 UTC": the day alone, for a line on a card. */
export function appliedDay(applied: string): string {
  const match: RegExpMatchArray | null = applied.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match === null) {
    return applied
  }
  // Built from the parts as a UTC date and printed in UTC: the day written in the file is the day
  // shown, whatever the time zone of the reader.
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(day)
}
