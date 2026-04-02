"""
图片OCR识别模块 - 识别价格表图片中的规格和价格
"""
import cv2
import numpy as np
from PIL import Image
import pytesseract
from typing import List, Dict, Tuple, Optional
import re
import uuid


def preprocess_image(image_path: str) -> np.ndarray:
    """
    图像预处理：提高识别准确率
    - 转换灰度
    - 对比度增强
    - 降噪
    - 二值化
    """
    # 读取图像
    img = cv2.imread(image_path)

    # 转为灰度图
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 对比度增强
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # 高斯模糊去噪
    blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)

    # Otsu 自动二值化
    _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # 轻度去噪
    denoised = cv2.medianBlur(binary, 3)

    return denoised


def get_text_blocks(image: np.ndarray) -> List[Dict]:
    """
    使用pytesseract识别文字，返回每个文本块的位置和内容
    """
    result = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

    blocks = []
    for i in range(len(result['text'])):
        text = result['text'][i].strip()
        if not text:
            continue
        if len(text) < 1:
            continue

        conf = int(result['conf'][i])
        if conf < 15:  # 降低置信度阈值，保留更多文字
            continue

        x = result['left'][i]
        y = result['top'][i]
        w = result['width'][i]
        h = result['height'][i]

        blocks.append({
            'text': text,
            'x': x,
            'y': y,
            'w': w,
            'h': h,
            'center_y': y + h // 2,
            'center_x': x + w // 2,
        })

    # 按y坐标排序
    blocks.sort(key=lambda b: b['center_y'])
    return blocks


def cluster_rows(blocks: List[Dict], y_tolerance: int = 25) -> List[List[Dict]]:
    """
    根据y坐标聚类，将相近y的文本块分为同一行
    """
    if not blocks:
        return []

    rows = []
    current_row = [blocks[0]]

    for block in blocks[1:]:
        last_center_y = current_row[-1]['center_y']
        if abs(block['center_y'] - last_center_y) <= y_tolerance:
            current_row.append(block)
        else:
            # 按x排序当前行
            current_row.sort(key=lambda b: b['center_x'])
            rows.append(current_row)
            current_row = [block]

    if current_row:
        current_row.sort(key=lambda b: b['center_x'])
        rows.append(current_row)

    return rows


def cluster_cols(rows: List[List[Dict]], x_tolerance: int = 20) -> List[List[Dict]]:
    """
    根据x坐标聚列表，将相近x的文本分为同一列
    返回按列组织的数据：cols[colIdx][rowIdx] = text
    """
    # 收集所有列中心
    all_centers = []
    for row in rows:
        for block in row:
            all_centers.append(block['center_x'])

    if not all_centers:
        return []

    # 贪心聚列
    all_centers = sorted(all_centers)
    clusters = [[all_centers[0]]]
    for cx in all_centers[1:]:
        last_cluster = clusters[-1]
        if cx - last_cluster[-1] <= x_tolerance:
            last_cluster.append(cx)
        else:
            clusters.append([cx])

    # 计算每列的平均中心x
    col_centers = [np.mean(c) for c in clusters]

    # 将每行的块分配到列
    cols: List[List[Optional[str]]] = [[] for _ in col_centers]
    for row in rows:
        for block in row:
            cx = block['center_x']
            # 找到最近的列中心
            idx = min(range(len(col_centers)), key=lambda i: abs(col_centers[i] - cx))
            # 填充占位到当前行数
            for c in cols:
                if len(c) < len(cols[0]):
                    c.append(None)
            cols[idx][-1] = block['text']

    return cols


def extract_spec_and_price(
    rows: List[List[Dict]]
) -> List[Tuple[str, Optional[str], float]]:
    """
    从行数据中提取规格、类型、价格
    使用启发式规则：
    1. 如果能识别到表头，"规格"列作为规格，价格在其他列
    2. 识别不到表头时，数字识别为价格，带数字+单位识别为规格
    3. 其他文字识别为类型(ruleName)
    """
    result = []

    # 先找表头
    spec_col_idx = -1
    price_cols = []

    # 检测第一行是不是表头
    if len(rows) > 0:
        first_row = rows[0]
        for i, block in enumerate(first_row):
            text = block['text'].lower()
            if '规格' in text or '尺寸' in text:
                spec_col_idx = i
            if '价' in text or 'price' in text:
                price_cols.append(i)

        # 如果没找到价格列，最后一列默认是价格
        if len(price_cols) == 0 and len(first_row) > 1:
            price_cols = [len(first_row) - 1]

    # 从第二行开始处理数据
    start_row_idx = 1 if spec_col_idx >= 0 or len(price_cols) > 0 else 0

    for row in rows[start_row_idx:]:
        if len(row) < 1:
            continue

        spec = ""
        rule_name = ""
        price: Optional[float] = None

        if spec_col_idx >= 0 and len(price_cols) > 0:
            # 有表头识别模式
            for i, block in enumerate(row):
                text = block['text']
                if i == spec_col_idx:
                    spec = text
                elif i in price_cols:
                    # 提取价格数字
                    price_match = re.search(r'\d+(\.\d+)?', text.replace(',', ''))
                    if price_match:
                        try:
                            price = float(price_match.group())
                        except ValueError:
                            pass
                else:
                    if rule_name:
                        rule_name += " "
                    rule_name += text

        else:
            # 启发式模式
            spec = ""
            rule_name = ""
            price: Optional[float] = None
            # 找数字价格
            price_candidates = []
            spec_candidates = []
            for block in row:
                text = block['text']
                # 找纯数字价格
                price_match = re.search(r'\d+(\.\d+)?', text.replace(',', ''))
                if price_match:
                    try:
                        p = float(price_match.group())
                        # 合理的价格范围：一般0.1 - 10000
                        if 0.1 <= p <= 10000:
                            price_candidates.append((p, block['center_x']))
                    except ValueError:
                        pass

                # 包含数字的可能是规格
                if re.search(r'\d', text):
                    spec_candidates.append(text)
                else:
                    if rule_name:
                        rule_name += " "
                    rule_name += text

            if len(spec_candidates) > 0:
                spec = spec_candidates[0]
            if len(price_candidates) > 0:
                # 最靠右的那个是价格
                price_candidates.sort(key=lambda x: x[1], reverse=True)
                price = price_candidates[0][0]

        # 清理数据
        spec = spec.strip()
        rule_name = rule_name.strip()
        if not spec or price is None:
            continue  # 跳过不完整的行

        result.append((spec, rule_name if rule_name else None, price))

    return result


def parse_image(image_path: str) -> Dict:
    """
    解析图片，返回与Excel解析相同格式的数据
    """
    # 预处理
    processed = preprocess_image(image_path)

    # OCR识别
    blocks = get_text_blocks(processed)

    if not blocks:
        return {
            'success': False,
            'message': '未能识别出任何文字，请确保图片清晰',
            'data': None
        }

    # 按行聚类
    rows = cluster_rows(blocks)

    # 提取数据
    items_data = extract_spec_and_price(rows)

    if len(items_data) == 0:
        return {
            'success': False,
            'message': '未能识别出规格价格数据，请检查图片方向和清晰度',
            'data': None
        }

    # 转换为JSON格式，与Excel解析一致
    items = []
    for spec, rule_name, price in items_data:
        items.append({
            'id': str(uuid.uuid4())[:8],
            'sheetName': '图片识别',
            'tableIndex': 0,
            'spec': spec,
            'ruleName': rule_name or "",
            'originalPrice': price
        })

    # 收集所有不重复的rule
    rules = list(set(item['ruleName'] for item in items if item['ruleName']))
    if not rules:
        rules = ["价格"]

    tables = [{
        'sheetName': '图片识别',
        'tableTitle': '图片识别价格表',
        'date': None,
        'rules': rules,
        'items': items
    }]

    return {
        'success': True,
        'message': f'成功识别 {len(items)} 个商品',
        'data': {
            'sheets': ['图片识别'],
            'tables': tables,
            'totalItems': len(items)
        }
    }
