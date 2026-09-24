interface Res {
  data: {
    result: {
      id: string
      title: string
      type: number
      uuid: string
    }[]
  }
}

export default defineSource(async () => {
  const timestamp = Date.now()
  const url = `https://gw-c.nowcoder.com/api/sparta/hot-search/top-hot-pc?size=20&_=${timestamp}&t=`
  const res: Res = await myFetch(url)
  return res.data.result
    .map((k) => {
      let url, id
      if (k.type === 74) {
        url = `https://www.nowcoder.com/feed/main/detail/${k.uuid}`
        id = k.uuid
      } else if (k.type === 0) {
        url = `https://www.nowcoder.com/discuss/${k.id}`
        id = k.id
      }
      return {
        id,
        title: k.title,
        url,
      }
    })
})
