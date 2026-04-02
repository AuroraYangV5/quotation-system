import request from '@/utils/request';
import type { ParseResponse, GenerateRequest } from '@/types';

// 上传文件并解析
export function parseFile(file: File): Promise<ParseResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/parse', {
    method: 'POST',
    body: formData,
  });
}

// 上传图片并OCR识别
export function recognizeImage(file: File): Promise<ParseResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/ocr-parse', {
    method: 'POST',
    body: formData,
  });
}

// 生成报价文件
export function generateQuotation(data: GenerateRequest): Promise<Blob> {
  return fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).then(res => {
    if (!res.ok) {
      throw new Error('生成失败');
    }
    return res.blob();
  });
}
