import { useCallback, useEffect, useMemo } from "react"
import { useMedia } from "react-use"

export declare type ColorScheme = "dark" | "light" | "auto"

export const COLOR_SCHEME_STORAGE_KEY = "color-scheme"
export const DEFAULT_COLOR_SCHEME: ColorScheme = "dark"

const FALLBACK_THEME_COLOR = {
  dark: "#1c1c1e",
  light: "#e4e4e7",
}

const colorSchemeAtom = atomWithStorage<ColorScheme>(COLOR_SCHEME_STORAGE_KEY, DEFAULT_COLOR_SCHEME)

/**
 * 把主题真正落到 DOM 上：切换 `<html>` 的 dark class，并同步浏览器地址栏 / 状态栏颜色。
 * 与 index.html 的首屏脚本共用同一套约定（dark class + localStorage key），避免首屏闪白。
 */
export function applyColorScheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark)

  // 用固定色值而非 getComputedStyle：body 有 0.3s 过渡，取值会拿到过渡中的中间色
  const meta = document.querySelector<HTMLMetaElement>("meta[name=\"theme-color\"]")
  if (meta) meta.content = FALLBACK_THEME_COLOR[isDark ? "dark" : "light"]
}

export function useDark() {
  const [colorScheme, setColorScheme] = useAtom(colorSchemeAtom)
  const prefersDarkMode = useMedia("(prefers-color-scheme: dark)")
  const isDark = useMemo(() => colorScheme === "auto" ? prefersDarkMode : colorScheme === "dark", [colorScheme, prefersDarkMode])

  // 挂载时同样要同步一次：useUpdateEffect 会跳过首帧，导致已持久化的浅色主题不生效
  useEffect(() => {
    applyColorScheme(isDark)
  }, [isDark])

  const setDark = useCallback((value: ColorScheme) => {
    setColorScheme(value)
  }, [setColorScheme])

  const toggleDark = useCallback(() => {
    setColorScheme(isDark ? "light" : "dark")
  }, [isDark, setColorScheme])

  return { isDark, setDark, toggleDark }
}
