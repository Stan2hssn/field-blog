export function useScrollSpy(selector = 'h2[id], h3[id]') {
  const activeId = ref<string | null>(null)

  if (import.meta.client) {
    let observer: IntersectionObserver | null = null
    const observed = new Map<Element, string>()

    onMounted(() => {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id = observed.get(entry.target)
            if (entry.isIntersecting && id) {
              activeId.value = id
            }
          }
        },
        { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
      )

      const elements = document.querySelectorAll<HTMLElement>(selector)
      for (const el of elements) {
        if (el.id) {
          observed.set(el, el.id)
          observer.observe(el)
        }
      }
    })

    onScopeDispose(() => {
      observer?.disconnect()
      observed.clear()
    })
  }

  return { activeId }
}
