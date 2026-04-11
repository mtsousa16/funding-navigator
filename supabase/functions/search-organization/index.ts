Deno.serve(async (req) => {
  const url = new URL(req.url)
  const query = url.searchParams.get("q") || ""

  const targetUrl = `https://www.fordfoundation.org/work/our-grants/?search=${query}`

  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  })

  const html = await response.text()

  return new Response(JSON.stringify({
    query,
    html_length: html.length
  }), {
    headers: { "Content-Type": "application/json" }
  })
})