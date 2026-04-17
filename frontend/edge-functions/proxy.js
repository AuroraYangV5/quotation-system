export default {
  async fetch(request) {
    const url = new URL(request.url); // 将 /api/proxy/* 的请求转发到后端
    const targetPath = url.pathname.replace("/api/proxy", "");
    const targetUrl = `http://ai-future.top:8000${targetPath}${url.search}`;
    // 转发请求
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    const response = await fetch(proxyRequest);
    // 添加 CORS 头（如需要）
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  },
};
