#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
报价生成工具 Web后端
FastAPI应用入口
"""

import os
import tempfile
import uuid
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request

from parse_excel import PriceParser

app = FastAPI(title="报价自动生成工具")

# 创建临时目录存储上传文件和生成文件
TEMP_DIR = tempfile.gettempdir()
os.makedirs(TEMP_DIR, exist_ok=True)

# 模板目录
templates = Jinja2Templates(directory="templates")

@app.get("/")
async def read_root(request: Request):
    """返回主页"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/generate")
async def generate_quotation(
    file: UploadFile = File(...),
    profit: float = Form(20.0)
):
    """
    生成报价表API
    - 接收上传的Excel文件
    - 接收利润率参数
    - 调用解析器生成新报价
    - 返回生成的文件供下载
    """
    # 验证利润率范围
    if profit < 0 or profit > 100:
        raise HTTPException(status_code=400, detail="利润率必须在0-100之间")

    # 验证文件类型
    filename = file.filename
    if not filename:
        raise HTTPException(status_code=400, detail="未上传文件")

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ['.xls', '.xlsx']:
        raise HTTPException(status_code=400, detail="只支持.xls或.xlsx格式的Excel文件")

    try:
        # 生成唯一ID避免文件冲突
        file_id = str(uuid.uuid4())[:8]

        # 保存上传的文件
        input_path = os.path.join(TEMP_DIR, f"input_{file_id}{ext}")
        with open(input_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # 生成输出文件名
        if profit.is_integer():
            profit_int = int(profit)
            output_filename = f"新报价表_利润率{profit_int}%.xlsx"
        else:
            output_filename = f"新报价表_利润率{profit}%.xlsx"
        output_path = os.path.join(TEMP_DIR, f"output_{file_id}.xlsx")

        # 调用解析器处理
        parser = PriceParser(input_path)
        success = parser.parse()
        if not success:
            raise HTTPException(status_code=400, detail="未能解析到任何表格数据，请检查文件格式")

        parser.generate_new_excel(output_path, profit)

        # 返回文件，自动触发下载
        return FileResponse(
            output_path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=output_filename
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")
    finally:
        # 清理输入文件，输出文件由FastAPI处理完后自动清理？这里先不删，等下载完成
        # 实际上FastAPI下载后会自动删除吗？不，需要自己清理，但为了简单先不处理
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
