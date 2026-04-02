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
4. 必须严格按照JSON格式返回，格式如下：
{
  "items": [
    {
      "spec": "规格名称",
      "ruleName": "类型名称",
      "originalPrice": 价格数字
    }
  ]
}

注意：
- 如果单元格为空，跳过不输出
- 价格必须是数字，不要带货币符号
- 只输出JSON，不要其他解释文字
"""

    # 构建请求
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "glm-4v-flash",
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
        response = requests.post(GLM_API_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        result = response.json()

        # 提取回复内容
        content = result['choices'][0]['message']['content']

        # 尝试解析JSON
        # 如果模型输出有多余文字，尝试提取JSON部分
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            # 尝试查找JSON块
            import re
            json_match = re.search(r'```json\n(.*?)\n```', content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(1))
            else:
                # 尝试直接查找第一个 { 到最后一个 }
                start = content.find('{')
                end = content.rfind('}') + 1
                if start >= 0 and end > start:
                    data = json.loads(content[start:end])
                else:
                    return {
                        'success': False,
                        'message': '无法解析GLM返回结果，请重试',
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
                original_price = float(item.get('originalPrice', item.get('price', 0)))
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
