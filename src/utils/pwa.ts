import { registerSW } from "virtual:pwa-register"

export type PwaUpdateState = "idle" | "ready" | "applying" | "successful"

type ApplyUpdate = () => Promise<void>
type UpdateStateListener = (state: PwaUpdateState) => void

const PENDING_KEY = "newsnow:pwa-update-pending"
const SUCCESS_KEY = "newsnow:pwa-update-successful"

// 清理旧版本（useRegisterSW 时代）遗留的标记
localStorage.removeItem("updated")

// 浏览器默认只在页面加载时检查 SW 更新，定时检查让长时间打开的页面也能拿到更新
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000

const pendingAtStartup = localStorage.getItem(PENDING_KEY) === "true"
const successfulAtStartup = sessionStorage.getItem(SUCCESS_KEY) === "true"

if (successfulAtStartup) {
  sessionStorage.removeItem(SUCCESS_KEY)
  localStorage.removeItem(PENDING_KEY)
}

let updateState: PwaUpdateState = successfulAtStartup ? "successful" : "idle"
let applyUpdateImpl: ApplyUpdate | undefined
const listeners = new Set<UpdateStateListener>()

function setUpdateState(state: PwaUpdateState) {
  if (updateState === state) return
  updateState = state
  listeners.forEach(listener => listener(state))
}

function markPwaUpdateReady(apply: ApplyUpdate) {
  applyUpdateImpl = apply
  localStorage.setItem(PENDING_KEY, "true")
  setUpdateState("ready")
}

function markPwaUpdateSuccessful() {
  localStorage.removeItem(PENDING_KEY)
  setUpdateState("successful")
}

export async function applyPwaUpdate() {
  if (!applyUpdateImpl || updateState === "applying") return

  setUpdateState("applying")
  sessionStorage.setItem(SUCCESS_KEY, "true")
  localStorage.removeItem(PENDING_KEY)

  try {
    await applyUpdateImpl()
  } catch (error) {
    sessionStorage.removeItem(SUCCESS_KEY)
    localStorage.setItem(PENDING_KEY, "true")
    setUpdateState("ready")
    throw error
  }
}

export function subscribePwaUpdateState(listener: UpdateStateListener) {
  listener(updateState)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

let updateDetected = false

function applyUpdate() {
  applyPwaUpdate().catch((error) => {
    console.warn("service worker update failed", error)
  })
}

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateDetected = true
    markPwaUpdateReady(() => updateServiceWorker(true))
    // 上次启动时就已检测到更新但未能应用，这次直接更新
    if (pendingAtStartup) applyUpdate()
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    setInterval(() => {
      registration.update().catch(() => {
        // registration 可能已被注销，忽略即可
      })
    }, UPDATE_CHECK_INTERVAL)

    if (!pendingAtStartup) return

    queueMicrotask(() => {
      // 待应用的更新已经完成（SW 已是最新且没有等待中的新 SW）
      if (!updateDetected && !registration.waiting && !registration.installing) {
        markPwaUpdateSuccessful()
      }
    })
  },
  onRegisterError(error) {
    console.warn("service worker registration failed", error)
  },
})
