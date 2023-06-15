async function fetchWrapper(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`
    )
  }
  return response
}

export default fetchWrapper
