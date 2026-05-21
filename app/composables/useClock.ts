export function useClock(timezone = 'Europe/Paris') {
  const now = ref(new Date())

  if (import.meta.client) {
    const tick = () => { now.value = new Date() }
    const interval = setInterval(tick, 60_000)
    onScopeDispose(() => clearInterval(interval))
  }

  const time = computed(() =>
    new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      hour12: false,
    }).format(now.value).replace(':', 'h'),
  )

  return { now, time }
}
