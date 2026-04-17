export async function onRequest(context) {
  const { request, params } = context;
  const path = params.path ? params.path.join("/") : "";
  const targetUrl = `http://ai-future.top:8000/api/${path}`;
  const res = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== "GET" ? request.body : undefined,
  });
  return new Response(res.body, { status: res.status, headers: res.headers });
}
