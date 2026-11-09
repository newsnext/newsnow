import { useDark } from "~/hooks/useDark"

/**
 * 主题切换按钮：暗色为默认主题，点击在 暗色 ⇄ 浅色 之间切换。
 * 选择结果写入 localStorage（key: color-scheme），刷新后保持。
 */
export function ThemeToggle() {
  const { isDark, toggleDark } = useDark()
  const label = isDark ? "切换到浅色模式" : "切换到深色模式"

  return (
    // 移动端顶栏空间有限，隐藏按钮，改由下拉菜单里的「浅色/深色模式」切换
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      className="btn hidden md:inline-block"
      onClick={toggleDark}
    >
      <span
        className={$(
          "inline-block align-middle transition-transform duration-300",
          isDark ? "i-ph:sun-dim-duotone" : "i-ph:moon-stars-duotone",
        )}
      />
    </button>
  )
}
