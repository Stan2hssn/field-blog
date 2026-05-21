export function useScrollSpy(selector = 'h2[id], h3[id]', triggerRatio = 0.3) {
  const activeId = ref<string | null>(null)

  if (import.meta.client) {
    let elements: HTMLElement[] = []

    const update = () => {
      if (!elements.length) return
      const trigger = window.innerHeight * triggerRatio
      let candidate: string | null = null
      for (const el of elements) {
        const top = el.getBoundingClientRect().top
        if (top <= trigger) {
          candidate = el.id
        } else {
          break
        }
      }
      if (!candidate && elements[0]) {
        candidate = elements[0].id
      }
      activeId.value = candidate
    }

    onMounted(() => {
      elements = Array.from(document.querySelectorAll<HTMLElement>(selector))
      update()
      window.addEventListener('scroll', update, { passive: true })
      window.addEventListener('resize', update)
    })

    onScopeDispose(() => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    })
  }

  return { activeId }
}
