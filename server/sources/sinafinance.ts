import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"

const finance7x24 = defineSource(async () => {
  // 真实 API 接口
  const url = "https://app.cj.sina.com.cn/api/news/pc?page=1&size=30&tag=0"

  // 获取接口数据
  const responseData = await myFetch(url)

  // 兼容处理：如果 myFetch 已经自动解析成了对象，就直接赋值；否则按字符串处理
  let data: any
  if (typeof responseData === "string") {
    const jsonString = responseData.replace(/^[^{]*/, "").replace(/[^}]*$/, "")
    data = JSON.parse(jsonString)
  } else {
    data = responseData // 已经是 JSON 对象，直接使用
  }

  const news: NewsItem[] = []
  const list = data?.result?.data?.feed?.list || []

  list.forEach((item: any) => {
    if (!item.rich_text || !item.id) return

    // rich_text 包含 HTML 标签（如 <a>），提取出纯文本作为标题
    const $ = cheerio.load(item.rich_text)
    const title = $.text().trim()

    // 还原真实的wap详情端链接
    const itemUrl = `https://wap.cj.sina.cn/pc/7x24/${item.id}`

    // 解析时间，强制指定为东八区时间 (+0800)
    const fixedDateStr = item.create_time.replace(/-/g, "/")
    const pubDate = new Date(`${fixedDateStr} GMT+0800`).valueOf()

    news.push({
      id: item.id.toString(),
      title,
      url: itemUrl,
      pubDate,
      extra: {
        date: pubDate,
      },
    })
  })

  // 按时间倒序排序，显式使用 Number() 确保算术运算的左右两侧都是数字
  return news.sort((a, b) => Number(b.pubDate || 0) - Number(a.pubDate || 0))
})

export default defineSource({
  "sinafinance": finance7x24,
  "sinafinance-7x24": finance7x24,
})
