import { XMLParser } from "fast-xml-parser"
import type { NewsItem } from "@shared/types"

const baseURL = "https://bbs.pcbeta.com"

class CookieJar {
  private jar = new Map<string, string>()

  save(headers: Headers) {
    let list = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : []
    if (!list.length) {
      const single = headers.get("set-cookie")
      if (single) list = [single]
    }
    for (const cookie of list) {
      const pair = cookie.split(";")[0]
      const i = pair.indexOf("=")
      if (i <= 0) continue
      const key = pair.slice(0, i).trim()
      const value = pair.slice(i + 1).trim()
      if (value) this.jar.set(key, value)
      else this.jar.delete(key)
    }
  }

  toString() {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// bbs.pcbeta.com 有自适应反爬验证，可能出现两种挑战页：
// 1. 环境检测：POST /__access_review (action=environment)
// 2. 滑块验证：POST /__access_review (action=slide)，挑战参数在页面 data-* 属性里
// 验证通过后（按 IP 或 cookie 放行）重新请求即可拿到 RSS
async function fetchRSS(url: string) {
  const jar = new CookieJar()
  const get = async () => {
    const res = await myFetch.raw<string>(url, {
      responseType: "text" as any,
      ignoreResponseError: true,
      headers: jar.toString() ? { Cookie: jar.toString() } : undefined,
    })
    jar.save(res.headers)
    return res
  }
  const review = async (body: Record<string, string>) => {
    const res = await myFetch.raw(`${baseURL}/__access_review`, {
      method: "POST",
      ignoreResponseError: true,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(jar.toString() ? { Cookie: jar.toString() } : {}),
      },
      body: new URLSearchParams(body).toString(),
    })
    jar.save(res.headers)
    return res._data
  }

  let text = (await get())._data ?? ""
  for (let i = 0; i < 2 && !text.includes("<rss"); i++) {
    if (text.includes("action=environment")) {
      await review({
        action: "environment",
        platform: "MacIntel",
        webdriver: "0",
        headless: "0",
        cdp: "0",
      })
    } else if (text.includes("data-challenge")) {
      const challenge = /data-challenge="([^"]+)"/.exec(text)?.[1]
      const distance = /data-distance="([^"]+)"/.exec(text)?.[1]
      if (!challenge || !distance) break
      await review({
        action: "slide",
        distance,
        challenge,
        return_to: new URL(url).pathname + new URL(url).search,
        client_platform: "MacIntel",
        screen_resolution: "1920x1080",
        webgl_vendor: "blocked_or_unavailable",
        webgl_renderer: "blocked_or_unavailable",
      })
    } else {
      break
    }
    // 浏览器验证后也会有几百毫秒延迟再跳转
    await sleep(600)
    text = (await get())._data ?? ""
  }
  return text
}

function parseRSS(xmlText: string): NewsItem[] {
  const xml = new XMLParser({
    attributeNamePrefix: "",
    textNodeName: "#text",
    ignoreAttributes: false,
  })
  const result = xml.parse(xmlText)
  const items = result?.rss?.channel?.item
  const list: any[] = Array.isArray(items) ? items : items ? [items] : []
  return list.map(item => ({
    id: item.link,
    title: item.title,
    url: item.link,
    pubDate: item.pubDate,
    extra: {
      hover: item.description,
    },
  })).filter(item => item.id && item.title)
}

function pcbeta(fid: number) {
  return defineSource(async () => {
    const news = parseRSS(await fetchRSS(`${baseURL}/forum.php?mod=rss&fid=${fid}&auth=0`))
    if (!news.length) throw new Error("Cannot fetch rss data")
    return news
  })
}

export default defineSource({
  "pcbeta-windows11": pcbeta(563),
  "pcbeta-windows": pcbeta(521),
})
