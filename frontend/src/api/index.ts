import request from '@/utils/request';
import type { ParseResponse, GenerateRequest } from '@/types';

// 上传文件并解析（传统方式）
export function parseFile(file: File): Promise<ParseResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/parse', {
    method: 'POST',
    body: formData,
  });
}

import type { ConfigurableField } from '../pages/UploadPage';

// 上传Excel并使用GLM-4V-Flash AI解析，可以指定选中的Sheet索引和自定义提取字段
export function parseFileByGLM(
  file: File,
  selectedSheetIndices: number[],
  fields: ConfigurableField[]
): Promise<ParseResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const selectedStr = selectedSheetIndices.join(',');
  const fieldsJson = encodeURIComponent(JSON.stringify(fields));
  const url = `/api/parse-by-glm?selected_sheets=${selectedStr}&fields=${fieldsJson}`;
  return request(url, {
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
  return fetch(`/api/generate`, {
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
