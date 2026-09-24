import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"

const source = defineSource(async () => {
  const response: any = await myFetch("https://sputniknews.cn/services/widget/lenta/")
  const $ = cheerio.load(response)
  const $items = $(".lenta__item")
  const news: NewsItem[] = []
  $items.each((_, el) => {
    const $el = $(el)
    const $a = $el.find("a")
    const url = $a.attr("href")
    const title = $a.find(".lenta__item-text").text()
    const date = $a.find(".lenta__item-date").attr("data-unixtime")
    if (url && title && date) {
      news.push({
        url: `https://sputniknews.cn${url}`,
        title,
        id: url,
        extra: {
          date: new Date(Number(`${date}000`)).getTime(),
        },
      })
    }
  })
  return news
})

export default source
