import type { PriceItem } from "@/types";
import { ItemTableRow } from "./ItemTableRow";
import { TableToolbar } from "./TableToolbar";
import { SheetTabs } from "./SheetTabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

interface ItemTableProps {
  sheetNames: string[];
  selectedSheet: string;
  searchKeyword: string;
  filteredItems: PriceItem[];
  currentTableHasAllBatchSelected: boolean;
  currentTableHasAllExportSelected: boolean;
  tableTitle: string | null | undefined;
  currentSheetName: string;
  exportSelectedCount: number;
  hasExportSelection: boolean;
  onSheetSelect: (sheet: string) => void;
  onSearchChange: (value: string) => void;
  onToggleSelectAllBatch: () => void;
  onToggleSelectAllExport: () => void;
  onProfitChange: (id: string, profit: number) => void;
  onCalculatedPriceChange: (id: string, price: number) => void;
  onFieldChange: (id: string, field: string, value: string | number) => void;
  onDeleteRow: (id: string) => void;
  onAddRow: (index: number) => void;
  onToggleBatch: (id: string) => void;
  onToggleExport: (id: string) => void;
  onUpdateTableTitle: (sheetName: string, newTitle: string) => void;
  onUpdateSheetName: (oldSheetName: string, newSheetName: string) => void;
}

// 获取所有动态字段（排除固定字段）
const fixedFields = ['id', 'sheetName', 'tableIndex', 'spec', 'ruleName', 'originalPrice', 'profitPercent', 'calculatedPrice', 'selectedForBatch', 'selectedForExport'];

export function ItemTable({
  sheetNames,
  selectedSheet,
  searchKeyword,
  filteredItems,
  currentTableHasAllBatchSelected,
  currentTableHasAllExportSelected,
  tableTitle,
  currentSheetName,
  exportSelectedCount,
  hasExportSelection,
  onSheetSelect,
  onSearchChange,
  onToggleSelectAllBatch,
  onToggleSelectAllExport,
  onProfitChange,
  onCalculatedPriceChange,
  onFieldChange,
  onDeleteRow,
  onAddRow,
  onToggleBatch,
  onToggleExport,
  onUpdateTableTitle,
  onUpdateSheetName,
}: ItemTableProps) {
  // 收集所有自定义字段（从所有items中收集）
  const customFields: {key: string, name: string}[] = [];
  const customFieldKeys = new Set<string>();
  if (filteredItems.length > 0) {
    filteredItems.forEach(item => {
      Object.keys(item).forEach(key => {
        if (!fixedFields.includes(key) && !customFieldKeys.has(key)) {
          customFieldKeys.add(key);
          customFields.push({key, name: key});
        }
      });
    });
  }

  // 编辑状态
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(tableTitle || "");

  // 当切换 sheet 时，更新当前 sheet 的标题
  useEffect(() => {
    setTitleValue(tableTitle || "");
    setEditingTitle(false);
  }, [currentSheetName, tableTitle]);

  const handleTitleBlur = () => {
    onUpdateTableTitle(currentSheetName, titleValue);
    setEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
    if (e.key === 'Escape') {
      setTitleValue(tableTitle || "");
      setEditingTitle(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        {/* Sheet 标签切换 */}
        {sheetNames.length > 1 && (
          <div className="mb-3">
            <SheetTabs
              sheetNames={sheetNames}
              selectedSheet={selectedSheet}
              onSelect={onSheetSelect}
              onUpdateSheetName={onUpdateSheetName}
            />
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">标题：</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>点击可编辑</p>
                </TooltipContent>
              </Tooltip>
            </div>
            {editingTitle ? (
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                className="w-64 h-7 text-sm"
              />
            ) : (
              <span
                className="text-sm cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                onClick={() => setEditingTitle(true)}
              >
                {tableTitle || "点击设置标题"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              共 {filteredItems.length} 项
              {hasExportSelection && `, 已选导出 ${exportSelectedCount} 项`}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TableToolbar
          searchKeyword={searchKeyword}
          filteredCount={filteredItems.length}
          hasAllBatchSelected={currentTableHasAllBatchSelected}
          hasAllExportSelected={currentTableHasAllExportSelected}
          onSearchChange={onSearchChange}
          onToggleSelectAllBatch={onToggleSelectAllBatch}
          onToggleSelectAllExport={onToggleSelectAllExport}
        />

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left border border-gray-200 text-sm">规格</th>
                <th className="p-2 text-left border border-gray-200 text-sm">类型</th>
                {customFields.map(field => (
                  <th key={field.key} className="p-2 text-left border border-gray-200 text-sm">
                    {field.name}
                  </th>
                ))}
                <th className="p-2 text-right border border-gray-200 text-sm">原价</th>
                <th className="p-2 text-center border border-gray-200 text-sm w-24">利润率 (%)</th>
                <th className="p-2 text-right border border-gray-200 text-sm">计算后价格</th>
                <th className="p-2 text-center border border-gray-200 text-sm w-20">操作</th>
                <th className="p-2 text-center border border-gray-200 text-sm w-26">选择设置利润</th>
                <th className="p-2 text-center border border-gray-200 text-sm w-26">选择导出</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => (
                <ItemTableRow
                  key={item.id}
                  item={item}
                  index={idx}
                  customFields={customFields}
                  onProfitChange={onProfitChange}
                  onCalculatedPriceChange={onCalculatedPriceChange}
                  onFieldChange={onFieldChange}
                  onDeleteRow={onDeleteRow}
                  onAddRow={onAddRow}
                  onToggleBatch={onToggleBatch}
                  onToggleExport={onToggleExport}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
