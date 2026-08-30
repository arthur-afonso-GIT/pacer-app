export type ThemePreference = 'system' | 'light' | 'dark'

export function applyThemePreference(preference: ThemePreference) {
  let media: MediaQueryList | undefined
  try {
    media = window.matchMedia('(prefers-color-scheme: dark)')
  } catch {
    media = undefined
  }
  const apply = () => {
    const dark =
      preference === 'dark' || (preference === 'system' && media?.matches)
    if (dark) document.documentElement.dataset.theme = 'dark'
    else delete document.documentElement.dataset.theme
  }
  apply()
  if (preference !== 'system' || !media) return () => undefined
  media.addEventListener('change', apply)
  return () => media.removeEventListener('change', apply)
}
