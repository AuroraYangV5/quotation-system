#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
报价生成系统 Web后端
FastAPI应用入口
"""

import os
import tempfile
import uuid
import xlrd
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="报价自动生成系统")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# 创建临时目录存储上传文件和生成文件
TEMP_DIR = tempfile.gettempdir()
os.makedirs(TEMP_DIR, exist_ok=True)


# Pydantic模型
class GeneratedItem(BaseModel):
    sheetName: str
    spec: str
    ruleName: str
    originalPrice: float
    profitPercent: float


class SheetInfo(BaseModel):
    sheetName: str
    tableTitle: Optional[str]
    date: Optional[str]


class GenerateRequest(BaseModel):
    items: List[GeneratedItem]
    sheetInfos: List[SheetInfo]


# 解析结果模型
class ParseItem(BaseModel):
    id: str
    sheetName: str
    tableIndex: int
    spec: str
    ruleName: str
    originalPrice: float


class ParseTable(BaseModel):
    sheetName: str
    tableTitle: Optional[str]
    date: Optional[str]
    rules: List[str]
    items: List[ParseItem]


class ParseResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict]


@app.post("/api/parse", response_model=ParseResponse)
async def parse_excel(file: UploadFile = File(...)):
    """
    解析Excel文件，返回结构化数据供前端预览编辑
    """
    filename = file.filename
    if not filename:
        return ParseResponse(success=False, message="未上传文件", data=None)

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ['.xls', '.xlsx']:
        return ParseResponse(success=False, message="只支持.xls或.xlsx格式的Excel文件", data=None)

    try:
        # 生成唯一ID避免文件冲突
        file_id = str(uuid.uuid4())[:8]

        # 保存上传的文件
        input_path = os.path.join(TEMP_DIR, f"input_{file_id}{ext}")
        with open(input_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # 使用xlrd解析
        wb = xlrd.open_workbook(input_path)

        tables: List[ParseTable] = []
        total_items = 0

        for sheet_idx in range(wb.nsheets):
            sheet = wb.sheet_by_index(sheet_idx)
            sheet_name = sheet.name
            title = None
            date = None

            # 找标题和日期
            for row_idx in range(min(3, sheet.nrows)):
                for col_idx in range(min(5, sheet.ncols)):
                    cell_val = sheet.cell_value(row_idx, col_idx)
                    if cell_val and '价格' in str(cell_val) and not title:
                        title = str(cell_val).strip()
                    if cell_val and str(cell_val).count('.') >= 1 and not date:
                        try:
                            float(str(cell_val))
                            date = str(cell_val)
                        except:
                            pass

            if not title:
                title = sheet_name

            # 检测表格区域
            spec_found = False
            tables_in_sheet = []
            for row_idx in range(0, min(10, sheet.nrows)):
                cell_val = str(sheet.cell_value(row_idx, 0)).strip()
                if '规格' in cell_val or cell_val == '规格':
                    # 找到表头
                    rules = []
                    for col_idx in range(1, sheet.ncols):
                        cell_val = str(sheet.cell_value(row_idx, col_idx)).strip()
                        if cell_val and cell_val != '':
                            if '地址' in cell_val or '电话' in cell_val:
                                continue
                            rules.append(cell_val)

                    if len(rules) > 0:
                        tables_in_sheet.append({
                            'start_row': row_idx,
                            'spec_col': 0,
                            'rules': rules,
                            'rule_col_start': 1
                        })
                        spec_found = True
                    continue

                # 处理规格不在第一列的情况
                if not spec_found:
                    for col_idx in range(1, min(10, sheet.ncols)):
                        cell_val = str(sheet.cell_value(row_idx, col_idx)).strip()
                        if '规格' in cell_val or cell_val == '规格':
                            rules = []
                            for c_idx in range(0, sheet.ncols):
                                if c_idx == col_idx:
                                    continue
                                cell_val = str(sheet.cell_value(row_idx, c_idx)).strip()
                                if cell_val and cell_val != '':
                                    if '地址' in cell_val or '电话' in cell_val:
                                        continue
                                    rules.append(cell_val)
                            if len(rules) > 0:
                                tables_in_sheet.append({
                                    'start_row': row_idx,
                                    'spec_col': col_idx,
                                    'rules': rules,
                                    'rule_col_start': 0
                                })
                                spec_found = True
                            break

            # 如果没找到规格表头，默认检测
            if not spec_found and len(tables_in_sheet) == 0:
                for row_idx in range(0, min(5, sheet.nrows)):
                    has_content = False
                    for col_idx in range(1, sheet.ncols):
                        if sheet.cell_value(row_idx, col_idx):
                            has_content = True
                            break
                    if has_content:
                        rules = []
                        for col_idx in range(1, sheet.ncols):
                            cell_val = str(sheet.cell_value(row_idx, col_idx)).strip()
                            if cell_val and cell_val != '':
                                if '地址' in cell_val or '电话' in cell_val:
                                    continue
                                rules.append(cell_val)
                        if len(rules) > 0:
                            tables_in_sheet.append({
                                'start_row': row_idx,
                                'spec_col': 0,
                                'rules': rules,
                                'rule_col_start': 1
                            })
                        break

            # 解析每个表格数据，同一个sheet中的多个table合并到一个sheet
            all_items_in_sheet: List[ParseItem] = []
            for table_idx, table_info in enumerate(tables_in_sheet):
                start_data_row = table_info['start_row'] + 1
                spec_col = table_info['spec_col']
                rules = table_info['rules']
                rule_col_start = table_info['rule_col_start']

                for row_idx in range(start_data_row, sheet.nrows):
                    # 跳过空行
                    row_is_empty = True
                    for col_idx in range(sheet.ncols):
                        if sheet.cell_value(row_idx, col_idx):
                            row_is_empty = False
                            break
                    if row_is_empty:
                        continue

                    # 获取规格
                    spec_cell = sheet.cell_value(row_idx, spec_col)
                    spec_str = str(spec_cell).strip()
                    if '地址' in spec_str or '电话' in spec_str or len(spec_str) > 30:
                        continue
                    if spec_str == '':
                        continue

                    # 获取每个规则的价格
                    for i, rule in enumerate(rules):
                        col_idx = rule_col_start + i
                        if col_idx >= sheet.ncols:
                            continue
                        cell_val = sheet.cell_value(row_idx, col_idx)
                        try:
                            if isinstance(cell_val, float):
                                price = cell_val
                            else:
                                price = float(str(cell_val)) if str(cell_val).strip() else 0
                        except:
                            price = 0
                        if price <= 0:
                            continue

                        item_id = f"{sheet_name}-{table_idx}-{row_idx}-{i}"
                        all_items_in_sheet.append(ParseItem(
                            id=item_id,
                            sheetName=sheet_name,
                            tableIndex=table_idx,
                            spec=spec_str,
                            ruleName=rule,
                            originalPrice=price
                        ))
                        total_items += 1

            # 如果当前sheet有数据，添加为一个sheet（合并多个表格）
            if len(all_items_in_sheet) > 0:
                # 收集所有不重复的rules（其实不需要，因为items已经每个都带ruleName了）
                # 前端只需要items，按sheet分组就行
                tables.append(ParseTable(
                    sheetName=sheet_name,
                    tableTitle=title,
                    date=date,
                    rules=[],
                    items=all_items_in_sheet
                ))

        if len(tables) == 0 or total_items == 0:
            return ParseResponse(
                success=False,
                message="未能解析到任何价格数据，请检查文件格式",
                data=None
            )

        sheets = list(set(t.sheetName for t in tables))

        return ParseResponse(
            success=True,
            message=f"解析成功，共 {len(tables)} 个表格，{total_items} 个价格项",
            data={
                'sheets': sheets,
                'tables': [t.dict() for t in tables],
                'totalItems': total_items
            }
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return ParseResponse(success=False, message=f"解析失败: {str(e)}", data=None)


@app.post("/api/generate")
async def generate_excel(request: GenerateRequest):
    """
    根据前端编辑后的价格数据生成Excel文件并返回下载
    """
    try:
        if len(request.items) == 0:
            raise HTTPException(status_code=400, detail="没有商品数据")

        # 生成输出文件
        file_id = str(uuid.uuid4())[:8]
        output_path = os.path.join(TEMP_DIR, f"报价表_{file_id}.xlsx")
        output_filename = "报价表.xlsx"

        # 创建新工作簿
        wb = Workbook()
        default_ws = wb.active
        wb.remove(default_ws)

        # 样式定义
        title_font = Font(bold=True, size=16)
        header_font = Font(bold=True, size=12)
        center_align = Alignment(horizontal='center', vertical='center')
        left_align = Alignment(horizontal='left', vertical='center')
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        header_fill = PatternFill(start_color='D3D3D3', end_color='D3D3D3', fill_type='solid')
        title_fill = PatternFill(start_color='F0F0F0', end_color='F0F0F0', fill_type='solid')
        alt_row_fill = PatternFill(start_color='F8F8F8', end_color='F8F8F8', fill_type='solid')

        # 按sheet分组
        from collections import defaultdict
        items_by_sheet: defaultdict[str, List[GeneratedItem]] = defaultdict(list)
        sheet_item_map: dict[str, dict[str, list[tuple[str, float]]]] = defaultdict(lambda: defaultdict(list))
        for item in request.items:
            sheet_name = item.sheetName if hasattr(item, 'sheetName') else item.spec
            # 按规格分组，同一个规格一行，多个规则分列
            sheet_item_map[sheet_name][item.spec].append((item.ruleName, item.originalPrice, item.profitPercent))

        items_by_sheet = sheet_item_map

        sheet_info_map = {si.sheetName: si for si in request.sheetInfos}

        for sheet_name, spec_dict in items_by_sheet.items():
            ws = wb.create_sheet(title=sheet_name)
            sheet_info = sheet_info_map.get(sheet_name)
            title = sheet_info.tableTitle if sheet_info and sheet_info.tableTitle else sheet_name
            date = sheet_info.date if sheet_info else None

            current_row = 1
            # 获取所有不重复的规格和规则
            specs = sorted(spec_dict.keys())
            # 收集所有规则
            rules = set()
            for spec_items in spec_dict.values():
                for (rule, _, _) in spec_items:
                    rules.add(rule)
            rules = sorted(rules)

            total_cols = len(rules) + 1
            end_col_letter = get_column_letter(total_cols)

            # 标题
            ws.merge_cells(f'A{current_row}:{end_col_letter}{current_row}')
            cell = ws[f'A{current_row}']
            cell.value = f"{title} 报价表"
            cell.font = title_font
            cell.alignment = center_align
            cell.fill = title_fill
            ws.row_dimensions[current_row].height = 30
            current_row += 1

            # 说明行 - 收集所有利润率
            all_profits = []
            for spec_items in spec_dict.values():
                for (_, _, profit) in spec_items:
                    all_profits.append(profit)
            unique_profits = set(all_profits)
            if len(unique_profits) == 1:
                profit_str = f"利润率: +{list(unique_profits)[0]}%"
            else:
                profit_str = f"自定义利润率 (多个不同值)"
            ws.merge_cells(f'A{current_row}:C{current_row}')
            cell = ws[f'A{current_row}']
            cell.value = profit_str
            cell.alignment = left_align
            if date:
                date_cell = ws.cell(row=current_row, column=total_cols)
                date_cell.value = date
                date_cell.alignment = Alignment(horizontal='right', vertical='center')
            current_row += 1

            # 表头
            spec_header_cell = ws.cell(row=current_row, column=1)
            spec_header_cell.value = '规格'
            spec_header_cell.font = header_font
            spec_header_cell.alignment = center_align
            spec_header_cell.border = thin_border
            spec_header_cell.fill = header_fill

            for col_idx, rule in enumerate(rules, start=2):
                cell = ws.cell(row=current_row, column=col_idx)
                cell.value = rule
                cell.font = header_font
                cell.alignment = center_align
                cell.border = thin_border
                cell.fill = header_fill

            current_row += 1

            # 写入数据按规格分组，同一规格一行显示所有规则价格
            for row_idx, spec in enumerate(specs):
                spec_items = spec_dict[spec]
                # 规格列
                cell = ws.cell(row=current_row, column=1)
                cell.value = spec
                cell.alignment = center_align
                cell.border = thin_border
                if row_idx % 2 == 1:
                    cell.fill = alt_row_fill

                # 价格列
                for col_idx, rule in enumerate(rules, start=2):
                    found = next((item for item in spec_items if item[0] == rule), None)
                    if found:
                        _, original_price, profit_percent = found
                        multiplier = 1 + profit_percent / 100
                        price = round(original_price * multiplier, 1)
                        cell = ws.cell(row=current_row, column=col_idx)
                        cell.value = price
                        cell.alignment = center_align
                        cell.border = thin_border
                        if row_idx % 2 == 1:
                            cell.fill = alt_row_fill
                    else:
                        cell = ws.cell(row=current_row, column=col_idx)
                        cell.value = ''
                        cell.border = thin_border
                        if row_idx % 2 == 1:
                            cell.fill = alt_row_fill

                current_row += 1

            # 自动调整列宽
            for col in ws.columns:
                max_length = 0
                column = col[0].column
                for cell in col:
                    if cell.value:
                        cell_length = len(str(cell.value))
                        if cell_length > max_length:
                            max_length = cell_length
                adjusted_width = max_length * 1.5 + 3
                ws.column_dimensions[get_column_letter(column)].width = adjusted_width

        # 保存
        wb.save(output_path)

        return FileResponse(
            output_path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=output_filename
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
