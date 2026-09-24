import "~/styles/globals.css"
import "virtual:uno.css"
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import type { QueryClient } from "@tanstack/react-query"
import { isMobile } from "react-device-detect"
import { Header } from "~/components/header"
import { GlobalOverlayScrollbar } from "~/components/common/overlay-scrollbar"
import { Footer } from "~/components/footer"
import { Toast } from "~/components/common/toast"
import { SearchBar } from "~/components/common/search-bar"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function NotFoundComponent() {
  const nav = Route.useNavigate()
  nav({
    to: "/",
  })
}

function RootComponent() {
  useOnReload()
  useSync()
  usePWA()
  return (
    <>
      <GlobalOverlayScrollbar
        className={$([
          !isMobile && "px-4",
          "h-full overflow-x-auto",
          "md:(px-10)",
          "lg:(px-24)",
        ])}
      >
        <header
          className={$([
            "grid items-center py-4 px-5",
            "lg:(py-6)",
            "sticky top-0 z-10 backdrop-blur-md",
          ])}
          style={{
            gridTemplateColumns: "50px auto 50px",
          }}
        >
          <Header />
        </header>
        <main className={$([
          "mt-2",
          "min-h-[calc(100vh-180px)]",
          "md:(min-h-[calc(100vh-175px)])",
          "lg:(min-h-[calc(100vh-194px)])",
        ])}
        >
          <Outlet />
        </main>
        <footer className="py-6 flex flex-col items-center justify-center text-sm text-neutral-500 font-mono">
          <Footer />
        </footer>
      </GlobalOverlayScrollbar>
      <Toast />
      <SearchBar />
      {import.meta.env.DEV && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </>
  )
}
