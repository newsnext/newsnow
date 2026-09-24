import type { NewsItem } from "@shared/types"
import { load } from "cheerio"
import dayjs from "dayjs/esm"

const quick = defineSource(async () => {
  const baseURL = "https://www.36kr.com"
  const url = `${baseURL}/newsflashes`
  const response = await myFetch(url) as any
  const $ = load(response)
  const news: NewsItem[] = []
  const $items = $(".newsflash-item")
  $items.each((_, el) => {
    const $el = $(el)
    const $a = $el.find("a.item-title")
    const url = $a.attr("href")
    const title = $a.text()
    const relativeDate = $el.find(".time").text()
    if (url && title && relativeDate) {
      news.push({
        url: `${baseURL}${url}`,
        title,
        id: url,
        extra: {
          date: parseRelativeDate(relativeDate, "Asia/Shanghai").valueOf(),
        },
      })
    }
  })

  return news
})

const renqi = defineSource(async () => {
  const baseURL = "https://36kr.com"
  const formatted = dayjs().format("YYYY-MM-DD")
  const url = `${baseURL}/hot-list/renqi/${formatted}/1`

  const response = await myFetch<any>(url, {
    headers: {
      "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Referer": "https://www.freebuf.com/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    },
  })

  const $ = load(response)
  const articles: NewsItem[] = []

  // 单条新闻选择器
  const $items = $(".article-item-info")

  $items.each((_, el) => {
    const $el = $(el)

    // 标题和链接
    const $a = $el.find("a.article-item-title.weight-bold")
    const href = $a.attr("href") || ""
    const title = $a.text().trim()

    const description = $el.find("a.article-item-description.ellipsis-2").text().trim()

    // 作者
    const author = $el.find(".kr-flow-bar-author").text().trim()

    // 热度
    const hot = $el.find(".kr-flow-bar-hot span").text().trim()

    if (href && title) {
      articles.push({
        url: href.startsWith("http") ? href : `${baseURL}${href}`,
        title,
        id: href.slice(3), // 简化处理
        // url.slice(url.lastIndexOf("/") + 1)
        extra: {
          info: `${author}  |  ${hot}`,
          hover: description,
        },
      })
    }
  })
  return articles.length ? articles : quick()
})

export default defineSource({
  "36kr": quick,
  "36kr-quick": quick,
  "36kr-renqi": renqi,
})
