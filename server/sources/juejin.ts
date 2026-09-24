interface Res {
  data: {
    content: {
      title: string
      content_id: string
    }
  }[]
}

export default defineSource(async () => {
  const url = `https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot&spider=0`
  const res: Res = await myFetch(url)
  return res.data.map((k) => {
    const url = `https://juejin.cn/post/${k.content.content_id}`
    return {
      id: k.content.content_id,
      title: k.content.title,
      url,
    }
  })
})
