import type { ComponentPropsWithoutRef, ComponentRef, ElementType, ForwardedRef } from "react"
import { useEffect, useMemo, useRef } from "react"
import { OverlayScrollbars } from "overlayscrollbars"
import type { EventListeners, InitializationTarget, PartialOptions } from "overlayscrollbars"

type OverlayScrollbarsComponentBaseProps<T extends ElementType = "div"> =
  ComponentPropsWithoutRef<T> & {
    /** Tag of the root element. */
    element?: T
    /** OverlayScrollbars options. */
    options?: PartialOptions | false | null
    /** OverlayScrollbars events. */
    events?: EventListeners | false | null
    /** Whether to defer the initialization to a point in time when the browser is idle. (or to the next frame if `window.requestIdleCallback` is not supported) */
    defer?: boolean | IdleRequestOptions
  }

type OverlayScrollbarsComponentProps<T extends ElementType = "div"> =
  OverlayScrollbarsComponentBaseProps<T> & {
    ref?: ForwardedRef<OverlayScrollbarsComponentRef<T>>
  }

interface OverlayScrollbarsComponentRef<T extends ElementType = "div"> {
  /** Returns the OverlayScrollbars instance or null if not initialized. */
  osInstance: () => OverlayScrollbars | null
  /** Returns the root element. */
  getElement: () => ComponentRef<T> | null
}

type Defer = [
  requestDefer: (callback: () => any, options?: OverlayScrollbarsComponentProps["defer"]) => void,
  cancelDefer: () => void,
]

export interface UseOverlayScrollbarsParams {
  /** OverlayScrollbars options. */
  options?: OverlayScrollbarsComponentProps["options"]
  /** OverlayScrollbars events. */
  events?: OverlayScrollbarsComponentProps["events"]
  /** Whether to defer the initialization to a point in time when the browser is idle. (or to the next frame if `window.requestIdleCallback` is not supported) */
  defer?: OverlayScrollbarsComponentProps["defer"]
}

export type UseOverlayScrollbarsInitialization = (target: InitializationTarget) => void

export type UseOverlayScrollbarsInstance = () => ReturnType<
  OverlayScrollbarsComponentRef["osInstance"]
>

function createDefer(): Defer {
  let idleId: number
  let rafId: number
  const wnd = window
  const idleSupported = typeof wnd.requestIdleCallback === "function"
  const rAF = wnd.requestAnimationFrame
  const cAF = wnd.cancelAnimationFrame
  const rIdle = idleSupported ? wnd.requestIdleCallback : rAF
  const cIdle = idleSupported ? wnd.cancelIdleCallback : cAF
  const clear = () => {
    cIdle(idleId)
    cAF(rafId)
  }

  return [
    (callback, options) => {
      clear()
      idleId = rIdle(
        idleSupported
          ? () => {
              clear()
              // inside idle its best practice to use rAF to change DOM for best performance
              rafId = rAF(callback)
            }
          : callback,
        typeof options === "object" ? options : { timeout: 2233 },
      )
    },
    clear,
  ]
}

/**
 * Hook for advanced usage of OverlayScrollbars. (When the OverlayScrollbarsComponent is not enough)
 * @param params Parameters for customization.
 * @returns A tuple with two values:
 * The first value is the initialization function, it takes one argument which is the `InitializationTarget`.
 * The second value is a function which returns the current OverlayScrollbars instance or `null` if not initialized.
 */
export function useOverlayScrollbars(params?: UseOverlayScrollbarsParams): [UseOverlayScrollbarsInitialization, OverlayScrollbars | null ] {
  const { options, events, defer } = params || {}
  const [requestDefer, cancelDefer] = useMemo<Defer>(createDefer, [])
  // const instanceRef = useRef<ReturnType<UseOverlayScrollbarsInstance>>(null)
  const [instance, setInstance] = useState<ReturnType<UseOverlayScrollbarsInstance>>(null)
  const deferRef = useRef(defer)
  const optionsRef = useRef(options)
  const eventsRef = useRef(events)

  useEffect(() => {
    deferRef.current = defer
  }, [defer])

  useEffect(() => {
    optionsRef.current = options

    if (OverlayScrollbars.valid(instance)) {
      instance.options(options || {}, true)
    }
  }, [options, instance])

  useEffect(() => {
    eventsRef.current = events

    if (OverlayScrollbars.valid(instance)) {
      instance.on(events || {}, true)
    }
  }, [events, instance])

  useEffect(
    () => () => {
      cancelDefer()
      instance?.destroy()
    },
    [cancelDefer, instance, setInstance],
  )

  return useMemo(
    () => [
      (target) => {
        // if already initialized do nothing
        const presentInstance = instance
        if (OverlayScrollbars.valid(presentInstance)) {
          return
        }

        const currDefer = deferRef.current
        const currOptions = optionsRef.current || {}
        const currEvents = eventsRef.current || {}
        const init = () => {
          setInstance(OverlayScrollbars(target, currOptions, currEvents))
        }

        if (currDefer) {
          requestDefer(init, currDefer)
        } else {
          init()
        }
      },
      instance,
    ],
    [instance, requestDefer],
  )
}
