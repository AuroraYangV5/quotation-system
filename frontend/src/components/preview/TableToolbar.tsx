import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TableToolbarProps {
  searchKeyword: string;
  filteredCount: number;
  hasAllBatchSelected: boolean;
  hasAllExportSelected: boolean;
  onSearchChange: (value: string) => void;
  onToggleSelectAllBatch: () => void;
  onToggleSelectAllExport: () => void;
}

export function TableToolbar({
  searchKeyword,
  filteredCount,
  hasAllBatchSelected,
  hasAllExportSelected,
  onSearchChange,
  onToggleSelectAllBatch,
  onToggleSelectAllExport,
}: TableToolbarProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-full">
        <Input
          type="text"
          placeholder="搜索规格或类型..."
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full border-[#1a1a1a]"
        />
        {searchKeyword && (
          <p className="text-sm text-gray-500 mt-2">
            找到 {filteredCount} 项匹配
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleSelectAllBatch}
        className="text-[#1a1a1a] bg-[#fff] border-[#1a1a1a] h-[40px]"
      >
        {hasAllBatchSelected ? "取消全选批量" : "全选批量"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleSelectAllExport}
        className="text-[#1a1a1a] bg-[#fff] border-[#1a1a1a] h-[40px]"
      >
        {hasAllExportSelected ? "取消全选导出" : "全选导出"}
      </Button>
    </div>
  );
}
