import type { NewsItem } from "@shared/types"

interface QQNewsItem {
  id: string
  title: string
  url: string
  source: string
  time: string
  abstract?: string
  timestamp?: number
}

interface QQSearchResponse {
  isEmpty: number
  hasMore: number
  total_num: number
  secList?: {
    component: string
    newsList?: QQNewsItem[]
  }[]
}

export default defineSource({
  qqnewssearch: async () => {
    const keywords = "AI 机器人"
    const url = `https://i.news.qq.com/gw/pc_search/result?page=0&query=${encodeURIComponent(keywords)}&is_pc=1&hippy_custom_version=25&search_type=all&search_count_limit=10&appver=15.5_qqnews_7.1.80`

    const res: QQSearchResponse = await myFetch(url, {
      headers: {
        Referer: "https://news.qq.com/",
        Origin: "https://news.qq.com",
      },
    })

    const news: NewsItem[] = []

    if (res.isEmpty || !res.secList) return news

    for (const sec of res.secList) {
      // Only extract news articles, skip videos and百科
      if (sec.component !== "pictext" && sec.component !== "spotlight_show") continue
      if (!sec.newsList) continue

      for (const item of sec.newsList) {
        if (!item.title || !item.url) continue
        news.push({
          id: item.id,
          title: item.title,
          url: item.url,
          pubDate: item.timestamp ? item.timestamp * 1000 : (item.time ? Number(item.time) * 1000 : undefined),
          extra: {
            info: item.source || undefined,
            hover: item.abstract?.substring(0, 200) || undefined,
          },
        })
      }
    }

    return news
  },
})
