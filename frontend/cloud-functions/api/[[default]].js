export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  // 把 /api/xxx 转发到后端
  const targetUrl = `http://ai-future.top:8000${url.pathname}${url.search}`;
  // 透传请求
  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    duplex: 'half',
  });
  try {
    const response = await fetch(proxyRequest);
    // 透传响应，加上 CORS 头
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    newHeaders.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    // 处理 OPTIONS 预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: newHeaders });
    }
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
