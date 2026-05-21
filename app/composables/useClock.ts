function getParisOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    timeZoneName: 'longOffset',
  }).formatToParts(date)
  const offsetStr = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0'
  const m = offsetStr.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
  if (!m) return 0
  const sign = m[1] === '+' ? 1 : -1
  const hours = Number.parseInt(m[2] ?? '0', 10)
  const minutes = m[3] ? Number.parseInt(m[3], 10) : 0
  return sign * (hours * 60 + minutes)
}

export function useClock(timezone = 'Europe/Paris', locale = 'en-US') {
  const now = ref(new Date())

  if (import.meta.client) {
    const tick = () => { now.value = new Date() }
    const interval = setInterval(tick, 60_000)
    onScopeDispose(() => clearInterval(interval))
  }

  const time = computed(() =>
    new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
      hour12: true,
    }).format(now.value),
  )

  const tzAbbr = computed(() => {
    if (timezone !== 'Europe/Paris') {
      const parts = new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        timeZoneName: 'short',
      }).formatToParts(now.value)
      return parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
    }
    return getParisOffsetMinutes(now.value) === 120 ? 'CEST' : 'CET'
  })

  return { now, time, tzAbbr }
}
