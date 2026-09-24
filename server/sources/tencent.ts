import { myFetch } from "#/utils/fetch"
import { defineSource } from "#/utils/source"

interface WapRes {
  ret: number
  msg: string
  data: {
    id: number
    name: string
    lead: string
    cover?: string
    shareTitle: string
    shareAbstract: string
    sharePic: string
    is724: boolean
    is724Paper: boolean
    head_cmsid: string
    feed_style: number
    head_article: {
      live_info: string
      title: string
      img: string
      pub_time: string
      media_name: string
    }
    paperInfo: any
    tabs: {
      id: string
      channel_id: string
      name: string
      source: string
      type: string
      articleList: any[]
      article_count: number
      sub_tab: string
    }[]
    banner: string
  }
}

/**
 * 综合早报
 */
const comprehensiveNews = defineSource(async () => {
  const url = "https://i.news.qq.com/web_backend/v2/getTagInfo?tagId=aEWqxLtdgmQ%3D"
  const res = await myFetch<WapRes>(url, {
    headers: {
      Referer: "https://news.qq.com/",
    },
  })
  return res.data.tabs[0].articleList.map(news => ({
    id: news.id,
    title: news.title,
    url: news.link_info.url,
    extra: {
      hover: news.desc,
    },
  }))
})

export default defineSource({
  "tencent-hot": comprehensiveNews,
})
