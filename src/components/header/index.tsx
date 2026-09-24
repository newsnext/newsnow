import { Link } from "@tanstack/react-router"
import { useIsFetching } from "@tanstack/react-query"
import type { SourceID } from "@shared/types"
import { NavBar } from "../navbar"
import { Menu } from "./menu"
import { currentSourcesAtom, goToTopAtom } from "~/atoms"

function GoTop() {
  const { ok, fn: goToTop } = useAtomValue(goToTopAtom)
  return (
    <button
      type="button"
      title="Go To Top"
      className={$("i-ph:arrow-fat-up-duotone", ok ? "op-50 btn" : "op-0")}
      onClick={goToTop}
    />
  )
}

function Github() {
  return (
    <button type="button" title="Github" className="i-ph:github-logo-duotone btn" onClick={() => window.open(Homepage)} />
  )
}

function Refresh() {
  const currentSources = useAtomValue(currentSourcesAtom)
  const { refresh } = useRefetch()
  const refreshAll = useCallback(() => refresh(...currentSources), [refresh, currentSources])

  const isFetching = useIsFetching({
    predicate: (query) => {
      const [type, id] = query.queryKey as ["source" | "entire", SourceID]
      return (type === "source" && currentSources.includes(id)) || type === "entire"
    },
  })

  return (
    <button
      type="button"
      title="Refresh"
      className={$("i-ph:arrow-counter-clockwise-duotone btn", isFetching && "animate-spin i-ph:circle-dashed-duotone")}
      onClick={refreshAll}
    />
  )
}

export function Header() {
  return (
    <>
      <span className="flex justify-self-start">
        <Link to="/" className="flex gap-2 items-center">
          <div className="h-10 w-10 bg-cover" title="logo" style={{ backgroundImage: "url(/icon.svg)" }} />
          <span className="text-2xl font-brand line-height-none!">
            <p>News</p>
            <p className="mt--1">
              <span className="color-primary-6">N</span>
              <span>ow</span>
            </p>
          </span>
        </Link>
        <a target="_blank" href={`${Homepage}/releases/tag/v${Version}`} className="btn text-sm ml-1 font-mono">
          {`v${Version}`}
        </a>
      </span>
      <span className="justify-self-center">
        <span className="hidden md:(inline-block)">
          <NavBar />
        </span>
      </span>
      <span className="justify-self-end flex gap-2 items-center text-xl text-primary-600 dark:text-primary">
        <GoTop />
        <Refresh />
        <Github />
        <Menu />
      </span>
    </>
  )
}
