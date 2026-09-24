import type { NewsItem } from "@shared/types"
import * as cheerio from "cheerio"

const hot = defineSource(async () => {
  const baseUrl = "https://www.chongbuluo.com/"
  const html: string = await myFetch(`${baseUrl}forum.php?mod=guide&view=hot`)
  const $ = cheerio.load(html)
  const news: NewsItem[] = []

  $(".bmw table tr").each((_, elem) => {
    const xst = $(elem).find(".common .xst").text()
    const url = $(elem).find(".common a").attr("href")
    news.push({
      id: baseUrl + url,
      url: baseUrl + url,
      title: xst,
      extra: {
        hover: xst,
      },
    })
  })

  return news
})

const latest = defineRSSSource("https://www.chongbuluo.com/forum.php?mod=rss&view=newthread")

export default defineSource({
  "chongbuluo": hot,
  "chongbuluo-hot": hot,
  "chongbuluo-latest": latest,
})
