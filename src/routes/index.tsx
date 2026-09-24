import { createFileRoute } from "@tanstack/react-router"
import { focusSourcesAtom } from "~/atoms"
import { Column } from "~/components/column"

export const Route = createFileRoute("/")({
  component: IndexComponent,
})

function IndexComponent() {
  const focusSources = useAtomValue(focusSourcesAtom)
  const id = useMemo(() => focusSources.length ? "focus" : "hottest", [])
  return <Column id={id} />
}
