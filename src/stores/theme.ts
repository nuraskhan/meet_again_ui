// Light or dark. Until the person chooses, the application follows the system setting; once they
// press the switch, their choice is remembered in this browser and the system is no longer asked.
//
// The theme is the attribute data-theme on <html>, always set to the theme in effect: the
// stylesheet has rules that exist only under [data-theme="dark"], so "no attribute, the system is
// dark" must not be a third state. (index.html sets the same attribute before the page is drawn,
// so a dark page does not flash white while the application loads.)

import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'hangelo.theme'

const systemDark: MediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')

/** What the person chose; null while they follow the system. */
let chosen: Theme | null = readChoice()

/** The theme in effect now. */
export const theme = ref<Theme>(chosen ?? (systemDark.matches ? 'dark' : 'light'))

apply()

// The system switched (evening came): follow it, unless the person has a choice of their own.
systemDark.addEventListener('change', () => {
  if (chosen === null) {
    theme.value = systemDark.matches ? 'dark' : 'light'
    apply()
  }
})

/** The switch in the bar: the other theme, remembered. */
export function toggleTheme(): void {
  chosen = theme.value === 'dark' ? 'light' : 'dark'
  theme.value = chosen
  try {
    localStorage.setItem(STORAGE_KEY, chosen)
  } catch {
    // Storage is unavailable (private mode): the choice lasts until the page is reloaded.
  }
  apply()
}

function apply(): void {
  document.documentElement.setAttribute('data-theme', theme.value)
}

function readChoice(): Theme | null {
  try {
    const stored: string | null = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}
