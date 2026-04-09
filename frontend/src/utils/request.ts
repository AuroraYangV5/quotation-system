// 基于fetch封装的request工具，统一错误处理

import { toast } from '@/components/ui/use-toast';

export interface RequestOptions extends RequestInit {
  body?: any;
}

class RequestError extends Error {
  code: number;
  data: any;

  constructor(message: string, code: number, data?: any) {
    super(message);
    this.name = 'RequestError';
    this.code = code;
    this.data = data;
  }
}

// 显示错误通知
function showError(message: string) {
  console.error('Request Error:', message);
  toast({
    variant: "destructive",
    title: "错误",
    description: message,
  });
}

async function request<T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, ...init } = options;

  const config: RequestInit = {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  };

  if (body) {
    if (body instanceof FormData) {
      // FormData不需要设置Content-Type，浏览器会自动设置
      delete config.headers;
      config.body = body;
    } else {
      config.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `请求失败: ${response.status} ${response.statusText}`;
      let errorData = null;
      try {
        errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        // ignore
      }
      throw new RequestError(errorMessage, response.status, errorData);
    }

    const data = await response.json();
    return data;
  } catch (e) {
    if (e instanceof RequestError) {
      showError(e.message);
      throw e;
    }
    const msg = '网络错误，请检查连接';
    showError(msg);
    throw new RequestError(msg, 0);
  }
}

export default request;
