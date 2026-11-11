import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"

export default defineSource({
  baidunews: async () => {
    const keywords = "汽车 能源"
    const url = `https://www.baidu.com/s?ie=utf-8&bsst=1&rsv_dl=news_t_sk&tn=news&cl=2&medium=1&rtt=1&wd=${encodeURIComponent(keywords)}`
    const html: string = await myFetch(url, {
      responseType: "text",
    })
    const $ = cheerio.load(html)
    const news: NewsItem[] = []

    $(".result-op").each((_, el) => {
      const titleEl = $(el).find("h3 a").first()
      const title = titleEl.text().trim()
      const link = titleEl.attr("href")

      if (!title || !link) return

      const time = $(el).find("span.c-color-gray2").first().text().trim()
      const summary = $(el).find("span.c-color-text").first().text().trim()
      const source = $(el).find("div[class*=news-source]").first().text().trim()

      news.push({
        id: link,
        title,
        url: link,
        pubDate: time || undefined,
        extra: {
          info: source || undefined,
          hover: summary || undefined,
        },
      })
    })

    return news
  },
})
