import { useWindowScroll, useWindowSize } from '@vueuse/core'

export function useScrollProgress() {
  const { y } = useWindowScroll()
  const { height: viewportHeight } = useWindowSize()
  const docHeight = ref(0)

  if (import.meta.client) {
    const update = () => {
      docHeight.value = document.documentElement.scrollHeight
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(document.documentElement)
    onScopeDispose(() => ro.disconnect())
  }

  const progress = computed(() => {
    const max = docHeight.value - viewportHeight.value
    if (max <= 0) return 0
    return Math.min(1, Math.max(0, y.value / max))
  })

  return { progress }
}
