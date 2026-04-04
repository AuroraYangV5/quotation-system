"""
GLM-4V-Flash 图片OCR识别模块
调用智谱AI GLM-4V-Flash API识别图片中的表格数据
"""
import os
import base64
import json
import requests
from typing import List, Dict, Optional
import uuid


GLM_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"


def encode_image(image_path: str) -> str:
    """将图片编码为base64"""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode('utf-8')


def parse_image(image_path: str) -> Dict:
    """
    使用GLM-4V-Flash识别图片中的价格表格
    返回格式与Excel解析相同
    """
    api_key = os.getenv("ZHIPU_API_KEY")
    if not api_key:
        return {
            'success': False,
            'message': '未配置 ZHIPU_API_KEY 环境变量，请先设置智谱AI API Key',
            'data': None
        }

    # 编码图片
    base64_image = encode_image(image_path)

    # 构建prompt，让模型返回JSON格式
    prompt = """
请识别这张价格表图片中的所有商品规格和原价。

输出要求：
1. 提取表格中的每一行数据
2. 第一列通常是规格(如 76, 89, 114 等)，其他列是不同类型(如 卡箍, 弯头, 三通 等)和价格
3. 每行每个规格-类型-价格组合输出一条记录
4. **所有字段都必须是字符串类型**，包括价格
5. 必须严格按照JSON格式返回，格式如下：
{
  "items": [
    {
      "spec": "规格名称",
      "ruleName": "类型名称",
      "originalPrice": "价格字符串"
    }
  ]
}

注意：
- 如果单元格为空，跳过不输出
- 价格只保留数字，不要带货币符号，但必须输出为字符串，不能是数字类型
- **必须只输出纯粹的JSON**，绝对不允许有任何额外文字、说明、markdown标记、反引号、代码块
- 直接输出JSON，说完就结束，什么都不要多加
"""

    # 构建请求
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "glm-4.1v-thinking-flash",
        "max_tokens": 16384,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ]
    }

    try:
        response = requests.post(GLM_API_URL, headers=headers, json=payload, timeout=300)
        response.raise_for_status()
        result = response.json()

        # 提取回复内容
        content = result['choices'][0]['message']['content']

        # 尝试提取并修复JSON
        import re
        # 第一步：提取出JSON部分
        json_candidate = None
        # 查找代码块中的JSON
        json_match = re.search(r'```(?:json)?\n(.*?)\n```', content, re.DOTALL)
        if json_match:
            json_candidate = json_match.group(1)
        else:
            # 查找第一个 { 到最后一个 }
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                json_candidate = content[start:end]

        if json_candidate is None:
            return {
                'success': False,
                'message': 'GLM未返回JSON格式内容',
                'data': None
            }

        # 第二步：修复常见的JSON格式错误
        fixed = json_candidate
        # 1. 移除行尾注释（// ...）
        fixed = re.sub(r'//.*$', '', fixed, flags=re.MULTILINE)
        # 2. 移除多行注释（/* ... */）
        fixed = re.sub(r'/\*.*?\*/', '', fixed, flags=re.DOTALL)
        # 3. 修复 trailing commas: ", }" → " }" 和 ", ]" → " ]"
        fixed = re.sub(r',\s*([\]}])', r'\1', fixed)
        # 4. 修复多行情况下的 trailing commas
        fixed = re.sub(r',\s*\n\s*([\]}])', r'\n\1', fixed)
        # 5. 修复单引号改双引号
        fixed = re.sub(r"'([^']*)':", r'"\1":', fixed)
        # 6. 移除空行
        fixed = re.sub(r'\n\s*\n', r'\n', fixed)

        # 尝试解析
        try:
            data = json.loads(fixed)
        except json.JSONDecodeError as e1:
            # 再试一次，更激进的修复
            try:
                # 删除所有换行，再尝试
                compact = re.sub(r'\s+', ' ', fixed)
                data = json.loads(compact)
            except json.JSONDecodeError as e2:
                return {
                    'success': False,
                    'message': f'JSON解析失败。原始错误: {str(e1)}',
                    'data': None
                }

        items = data.get('items', [])
        if not items:
            return {
                'success': False,
                'message': 'GLM未识别出任何商品数据，请检查图片清晰度',
                'data': None
            }

        # 转换为统一格式
        output_items = []
        for item in items:
            try:
                spec = str(item.get('spec', '')).strip()
                rule_name = str(item.get('ruleName', item.get('rule', '') or '')).strip()
                # originalPrice可以是字符串，这里转换为float
                price_val = item.get('originalPrice', item.get('price', '0'))
                if isinstance(price_val, str):
                    # 去除可能的非数字字符（逗号、空格、货币符号等）
                    price_str = ''.join(c for c in price_val if c.isdigit() or c == '.')
                    original_price = float(price_str) if price_str else 0
                else:
                    original_price = float(price_val) if price_val else 0
                if not spec or original_price <= 0:
                    continue
                output_items.append({
                    'id': str(uuid.uuid4())[:8],
                    'sheetName': '图片识别',
                    'tableIndex': 0,
                    'spec': spec,
                    'ruleName': rule_name,
                    'originalPrice': original_price
                })
            except Exception:
                continue

        if not output_items:
            return {
                'success': False,
                'message': '解析后无有效数据，请检查图片内容',
                'data': None
            }

        # 收集所有不重复的rule
        rules = list(set(item['ruleName'] for item in output_items if item['ruleName']))
        if not rules:
            rules = ["价格"]

        tables = [{
            'sheetName': '图片识别',
            'tableTitle': '图片识别价格表',
            'date': None,
            'rules': rules,
            'items': output_items
        }]

        return {
            'success': True,
            'message': f'成功识别 {len(output_items)} 个商品',
            'data': {
                'sheets': ['图片识别'],
                'tables': tables,
                'totalItems': len(output_items)
            }
        }

    except requests.exceptions.RequestException as e:
        return {
            'success': False,
            'message': f'API请求失败: {str(e)}',
            'data': None
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'识别出错: {str(e)}',
            'data': None
        }
