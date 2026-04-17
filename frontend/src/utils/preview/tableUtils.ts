import type { TableData, PriceItem, GenerateRequest } from "@/types";

/**
 * 获取当前选中的表格
 */
export function getCurrentTable(
  tables: TableData[],
  selectedSheet: string,
): TableData | null {
  return tables.find((t) => t.sheetName === selectedSheet) || null;
}

/**
 * 切换表格中项目的选中状态（操作整个 tables 数组）
 */
export function toggleItemSelectionInTables<T extends keyof PriceItem>(
  tables: TableData[],
  sheetName: string,
  itemId: string,
  selectionKey: T,
): TableData[] {
  return tables.map((table) =>
    table.sheetName === sheetName
      ? toggleItemSelection(table, itemId, selectionKey)
      : table,
  );
}

/**
 * 更新表格中单个项目利润率（操作整个 tables 数组）
 */
export function updateItemProfitInTables(
  tables: TableData[],
  sheetName: string,
  itemId: string,
  profit: number,
): TableData[] {
  return tables.map((table) =>
    table.sheetName === sheetName
      ? updateItemProfit(table, itemId, profit)
      : table,
  );
}

/**
 * 更新表格中单个项目计算后价格（操作整个 tables 数组）
 */
export function updateItemCalculatedPriceInTables(
  tables: TableData[],
  sheetName: string,
  itemId: string,
  calculatedPrice: number,
): TableData[] {
  return tables.map((table) =>
    table.sheetName === sheetName
      ? updateItemCalculatedPrice(table, itemId, calculatedPrice)
      : table,
  );
}

/**
 * 更新表格中单个项目字段（操作整个 tables 数组）
 */
export function updateItemFieldInTables(
  tables: TableData[],
  sheetName: string,
  itemId: string,
  field: string,
  value: string | number,
): TableData[] {
  return tables.map((table) =>
    table.sheetName === sheetName
      ? updateItemField(table, itemId, field, value)
      : table,
  );
}

/**
 * 删除表格中单个项目（操作整个 tables 数组）
 */
export function deleteItemInTables(
  tables: TableData[],
  sheetName: string,
  itemId: string,
): TableData[] {
  return tables.map((table) =>
    table.sheetName === sheetName
      ? deleteItem(table, itemId)
      : table,
  );
}

/**
 * 在表格中插入新项目（操作整个 tables 数组）
 */
export function insertItemInTables(
  tables: TableData[],
  sheetName: string,
  index: number,
  newItem: PriceItem,
): TableData[] {
  return tables.map((table) =>
    table.sheetName === sheetName
      ? insertItem(table, index, newItem)
      : table,
  );
}

/**
 * 将 tables 转换为生成报价请求的格式
 */
export function convertToGenerateRequest(tables: TableData[]): GenerateRequest {
  return {
    items: tables.flatMap((table) =>
      table.items
        .filter((item) => item.selectedForExport)
        .map((item) => ({
          ...item,
          sheetName: table.sheetName,
          calculatedPrice: item.calculatedPrice,
        })),
    ),
    sheetInfos: tables.map((table) => ({
      sheetName: table.sheetName,
      tableTitle: table.tableTitle,
      date: table.date,
    })),
  };
}

/**
 * 根据关键词过滤表格项目
 */
export function filterTableItems(
  items: PriceItem[],
  searchKeyword: string,
): PriceItem[] {
  if (!searchKeyword) return items;
  const keyword = searchKeyword.toLowerCase();
  return items.filter(
    (item) =>
      item.spec.toLowerCase().includes(keyword) ||
      item.ruleName?.toLowerCase().includes(keyword),
  );
}

/**
 * 切换单个项目的选中状态
 */
export function toggleItemSelection<T extends keyof PriceItem>(
  table: TableData,
  itemId: string,
  selectionKey: T,
): TableData {
  return {
    ...table,
    items: table.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            [selectionKey]: !(item[selectionKey] as boolean),
          }
        : item,
    ),
  };
}

/**
 * 切换当前表格全选
 */
export function toggleSelectAllForTable<T extends keyof PriceItem>(
  table: TableData,
  selectionKey: T,
  value: boolean,
): TableData {
  const allSelected = table.items.every((item) => item[selectionKey] === value);
  const newValue = allSelected ? !value : value;

  return {
    ...table,
    items: table.items.map((item) => ({
      ...item,
      [selectionKey]: newValue,
    })),
  };
}

/**
 * 更新单个项目利润率
 */
export function updateItemProfit(
  table: TableData,
  itemId: string,
  profit: number,
): TableData {
  return {
    ...table,
    items: table.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            profitPercent: profit,
            calculatedPrice: item.originalPrice * (1 + profit / 100),
          }
        : item,
    ),
  };
}

/**
 * 更新单个项目计算后价格，同时反推利润率
 */
export function updateItemCalculatedPrice(
  table: TableData,
  itemId: string,
  calculatedPrice: number,
): TableData {
  return {
    ...table,
    items: table.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            calculatedPrice,
            profitPercent: item.originalPrice > 0
              ? ((calculatedPrice - item.originalPrice) / item.originalPrice) * 100
              : 0,
          }
        : item,
    ),
  };
}

/**
 * 更新单个项目字段
 */
export function updateItemField(
  table: TableData,
  itemId: string,
  field: string,
  value: string | number,
): TableData {
  return {
    ...table,
    items: table.items.map((item) =>
      item.id === itemId
        ? { ...item, [field]: value }
        : item,
    ),
  };
}

/**
 * 删除单个项目
 */
export function deleteItem(
  table: TableData,
  itemId: string,
): TableData {
  return {
    ...table,
    items: table.items.filter((item) => item.id !== itemId),
  };
}

/**
 * 在指定位置插入新项目
 */
export function insertItem(
  table: TableData,
  index: number,
  newItem: PriceItem,
): TableData {
  const items = [...table.items];
  items.splice(index, 0, newItem);
  return {
    ...table,
    items,
  };
}

/**
 * 批量更新利润率
 */
export function batchUpdateProfit(
  tables: TableData[],
  profit: number,
): TableData[] {
  return tables.map((table) => ({
    ...table,
    items: table.items.map((item) =>
      item.selectedForBatch
        ? {
            ...item,
            profitPercent: profit,
            calculatedPrice: item.originalPrice * (1 + profit / 100),
            selectedForBatch: false,
          }
        : item,
    ),
  }));
}

/**
 * 全局设置所有项目利润率
 */
export function setGlobalProfitAll(
  tables: TableData[],
  profit: number,
): TableData[] {
  return tables.map((table) => ({
    ...table,
    items: table.items.map((item) => ({
      ...item,
      profitPercent: profit,
      calculatedPrice: item.originalPrice * (1 + profit / 100),
    })),
  }));
}

/**
 * 获取所有需要导出的项目
 */
export function getItemsToExport(tables: TableData[]): PriceItem[] {
  return tables.flatMap((table) =>
    table.items.filter((item) => item.selectedForExport),
  );
}

/**
 * 统计批量选中和导出选中的数量
 */
export function countSelectedItems(currentTable: TableData | null): {
  batchSelectedCount: number;
  exportSelectedCount: number;
} {
  if (!currentTable) {
    return { batchSelectedCount: 0, exportSelectedCount: 0 };
  }
  return {
    batchSelectedCount: currentTable.items.filter((i) => i.selectedForBatch)
      .length,
    exportSelectedCount: currentTable.items.filter((i) => i.selectedForExport)
      .length,
  };
}

/**
 * 获取所有项目总数
 */
export function getAllItems(tables: TableData[]): PriceItem[] {
  return tables.flatMap((table) => table.items);
}
