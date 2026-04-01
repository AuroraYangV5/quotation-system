import pandas as pd

excel_file = '/Users/ershiqi/workspace/aurora/code/self/handle-excel/简单的原价表.xls'

# 详细探索
print("详细探索结果\n")

# 读取所有数据，不设置header
df = pd.read_excel(excel_file, sheet_name=0, header=None)

print("1. 基本信息")
print(f"   - Sheet名称: {pd.ExcelFile(excel_file).sheet_names[0]}")
print(f"   - 总行数: {df.shape[0]}")
print(f"   - 总列数: {df.shape[1]}")
print(f"   - 总单元格数: {df.shape[0] * df.shape[1]}")
print(f"   - 非空单元格数: {df.count().sum()}\n")

print("2. 完整数据展示（所有行）:")
print("-" * 70)
for i in range(df.shape[0]):
    row = df.iloc[i]
    values = []
    for j, v in enumerate(row):
        if pd.notna(v):
            values.append(f"[{j}]:{v}")
    print(f"行 {i+1:2d} (索引{i}): " + ", ".join(values))
print("-" * 70 + "\n")

print("3. 结构化数据区域:")
print("从第4行（索引3）开始是表头和数据:\n")
# 重新读取，将第4行设为表头
df_structured = pd.read_excel(excel_file, sheet_name=0, header=3)
print(f"数据形状: {df_structured.shape}")
print("\n列名（规则/管件类型）: " + ", ".join(df_structured.columns.tolist()))
print("\n完整数据:")
print(df_structured.to_string(index=False))
print("\n")

print("4. 提取信息总结:")
print("- 商品类别: 衬塑沟槽（从标题可知）")
print(f"- 规格（商品规格）: {list(df_structured.iloc[:, 0].tolist())}")
print(f"- 管件类型（规则类型）: {list(df_structured.columns[1:].tolist())}")
print("- 价格信息: 每个规格-类型组合对应一个价格")

# 创建一个清晰的价格表展示
print("\n5. 完整价格矩阵:")
print("-" * 70)
print(f"{'规格':<6} " + " ".join(f"{col:<8}" for col in df_structured.columns[1:]))
print("-" * 70)
for _, row in df_structured.iterrows():
    spec = row.iloc[0]
    prices = row.iloc[1:]
    print(f"{str(spec):<6} " + " ".join(f"{str(p):<8}" for p in prices))
print("-" * 70)
