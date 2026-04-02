// 单个商品/规格数据
export interface PriceItem {
  id: string;
  sheetName: string;
  tableIndex: number;
  spec: string;
  ruleName: string;
  originalPrice: number;
  profitPercent: number;
  calculatedPrice: number;
  selectedForBatch: boolean;  // 选中用于批量设置利润率
  selectedForExport: boolean; // 选中用于导出
}

// 表格数据
export interface TableData {
  sheetName: string;
  tableTitle: string | null;
  date: string | null;
  rules: string[];
  items: PriceItem[];
}

// 解析后响应
export interface ParseResponse {
  success: boolean;
  message: string;
  data: {
    sheets: string[];
    tables: TableData[];
    totalItems: number;
  };
}

// 生成请求
export interface GenerateRequest {
  items: {
    sheetName: string;
    spec: string;
    ruleName: string;
    originalPrice: number;
    profitPercent: number;
  }[];
  sheetInfos: {
    sheetName: string;
    tableTitle: string | null;
    date: string | null;
  }[];
}
