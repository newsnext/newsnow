export function Footer() {
  return (
    <>
      <a
        href={`${Homepage}/blob/main/LICENSE`}
        target="_blank"
        rel="noopener noreferrer"
      >
        MIT 开源许可
      </a>

      <span>
        Copyright © 2016-2030{" "}
        <a
          href="https://zhuque.net.cn"
          target="_blank"
          rel="noopener noreferrer"
        >
          zhuque.net.cn
        </a>
        . All Rights Reserved. 朱雀新媒体创作系统 版权所有
      </span>

      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
      >
        粤ICP备2026043601号-1
      </a>

      <span>
        <span>基于 NewsNow 开源项目构建 · 原作者：</span>
        <a
          href={Author.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {Author.name}
        </a>
      </span>
    </>
  )
}
