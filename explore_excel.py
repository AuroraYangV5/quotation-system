import pandas as pd

# 读取Excel文件
excel_file = '/Users/ershiqi/workspace/aurora/code/self/handle-excel/简单的原价表.xls'

# 获取所有sheet名称
xl = pd.ExcelFile(excel_file)
sheet_names = xl.sheet_names

print("=" * 60)
print("Excel文件结构探索")
print("=" * 60)
print(f"\n文件路径: {excel_file}")
print(f"Sheet数量: {len(sheet_names)}")
print(f"Sheet名称列表: {sheet_names}")
print("\n")

# 遍历每个sheet，探索其结构
for sheet_name in sheet_names:
    print("=" * 60)
    print(f"Sheet: {sheet_name}")
    print("=" * 60)

    # 读取整个sheet
    df = pd.read_excel(excel_file, sheet_name=sheet_name, header=None)

    # 获取行列信息
    rows, cols = df.shape
    print(f"\n行列数: {rows} 行 × {cols} 列")
    print(f"数据类型:\n{df.dtypes}")

    # 显示前10行数据
    print("\n前10行数据:")
    print("-" * 60)
    print(df.head(10).to_string())
    print("-" * 60)

    # 如果数据行数大于10，也显示最后5行
    if rows > 10:
        print("\n最后5行数据:")
        print("-" * 60)
        print(df.tail(5).to_string())
        print("-" * 60)

    # 检查是否有非空单元格分布
    print(f"\n非空单元格数量: {df.count().sum()} / {rows * cols}")

    # 尝试查找商品、规则、价格信息的位置
    print("\n寻找可能包含商品、规则、价格信息的区域:")

    # 遍历前15行，看看哪里可能是表头开始
    for i in range(min(15, rows)):
        non_null = df.iloc[i].notna().sum()
        if non_null >= 3:
            print(f"  第{i+1}行 (索引{i}) 有 {non_null} 个非空值: {list(df.iloc[i][df.iloc[i].notna()].values)}")

    print("\n\n")
