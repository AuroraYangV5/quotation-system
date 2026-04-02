import type { PriceItem } from "@/types";
import { ItemTableRow } from "./ItemTableRow";
import { TableToolbar } from "./TableToolbar";
import { SheetTabs } from "./SheetTabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ItemTableProps {
  sheetNames: string[];
  selectedSheet: string;
  searchKeyword: string;
  filteredItems: PriceItem[];
  currentTableHasAllBatchSelected: boolean;
  currentTableHasAllExportSelected: boolean;
  tableTitle: string | null | undefined;
  exportSelectedCount: number;
  hasExportSelection: boolean;
  onSheetSelect: (sheet: string) => void;
  onSearchChange: (value: string) => void;
  onToggleSelectAllBatch: () => void;
  onToggleSelectAllExport: () => void;
  onProfitChange: (id: string, profit: number) => void;
  onToggleBatch: (id: string) => void;
  onToggleExport: (id: string) => void;
}

export function ItemTable({
  sheetNames,
  selectedSheet,
  searchKeyword,
  filteredItems,
  currentTableHasAllBatchSelected,
  currentTableHasAllExportSelected,
  tableTitle,
  exportSelectedCount,
  hasExportSelection,
  onSheetSelect,
  onSearchChange,
  onToggleSelectAllBatch,
  onToggleSelectAllExport,
  onProfitChange,
  onToggleBatch,
  onToggleExport,
}: ItemTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <SheetTabs
            sheetNames={sheetNames}
            selectedSheet={selectedSheet}
            onSelect={onSheetSelect}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              共 {filteredItems.length} 项
              {hasExportSelection && `, 已选导出 ${exportSelectedCount} 项`}
            </span>
          </div>
        </div>

        {tableTitle && (
          <p className="text-sm text-gray-500 mt-1">{tableTitle}</p>
        )}
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
                <th className="p-2 text-right border border-gray-200 text-sm">原价</th>
                <th className="p-2 text-center border border-gray-200 text-sm">利润率 (%)</th>
                <th className="p-2 text-right border border-gray-200 text-sm">计算后价格</th>
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
                  onProfitChange={onProfitChange}
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
