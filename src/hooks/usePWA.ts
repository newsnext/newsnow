import { useToast } from "./useToast"

export function usePWA() {
  const toaster = useToast()

  useEffect(() => {
    const update = () => {
      applyPwaUpdate().catch((error) => {
        console.warn("service worker update failed", error)
      })
    }
    return subscribePwaUpdateState((state) => {
      if (state === "ready") {
        toaster("有更新，5 秒后自动更新", {
          action: {
            label: "立刻更新",
            onClick: update,
          },
          onDismiss: update,
        })
      } else if (state === "successful") {
        toaster("更新成功，赶快体验吧", {
          action: {
            label: "查看更新",
            onClick: () => {
              window.open(`${Homepage}/releases/tag/v${Version}`)
            },
          },
        })
      }
    })
  }, [toaster])
}
