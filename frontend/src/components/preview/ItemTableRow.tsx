import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import type { PriceItem } from "@/types";

interface ItemTableRowProps {
  item: PriceItem;
  index: number;
  customFields: {key: string, name: string}[];
  onProfitChange: (id: string, profit: number) => void;
  onCalculatedPriceChange: (id: string, price: number) => void;
  onFieldChange: (id: string, field: string, value: string | number) => void;
  onDeleteRow: (id: string) => void;
  onAddRow: (index: number) => void;
  onToggleBatch: (id: string) => void;
  onToggleExport: (id: string) => void;
}

export function ItemTableRow({
  item,
  index,
  customFields,
  onProfitChange,
  onCalculatedPriceChange,
  onFieldChange,
  onDeleteRow,
  onAddRow,
  onToggleBatch,
  onToggleExport,
}: ItemTableRowProps) {
  return (
    <tr className={index % 2 === 1 ? "bg-gray-50" : ""}>
      <td className="p-1 border border-gray-200 text-sm">
        <Input
          value={item.spec}
          onChange={(e) => onFieldChange(item.id, "spec", e.target.value)}
          className="h-7 w-full min-w-[80px]"
        />
      </td>
      <td className="p-1 border border-gray-200 text-sm">
        <Input
          value={item.ruleName || ""}
          onChange={(e) => onFieldChange(item.id, "ruleName", e.target.value)}
          className="h-7 w-full min-w-[80px]"
        />
      </td>
      {customFields.map(({key}) => (
        <td key={key} className="p-1 border border-gray-200 text-sm">
          <Input
            value={item[key] != null ? String(item[key]) : ""}
            onChange={(e) => onFieldChange(item.id, key, e.target.value)}
            className="h-7 w-full min-w-[60px]"
          />
        </td>
      ))}
      <td className="p-1 border border-gray-200 text-sm">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.originalPrice.toFixed(2)}
          onChange={(e) => onFieldChange(item.id, "originalPrice", Number(parseFloat(e.target.value).toFixed(2)))}
          className="h-7 w-20 text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </td>
      <td className="p-1 border border-gray-200 text-sm text-center w-24">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={Number(item.profitPercent.toFixed(2))}
          onChange={(e) => onProfitChange(item.id, Number(parseFloat(e.target.value).toFixed(2)))}
          className="h-7 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </td>
      <td className="p-1 border border-gray-200 text-sm">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.calculatedPrice.toFixed(2)}
          onChange={(e) => onCalculatedPriceChange(item.id, Number(parseFloat(e.target.value).toFixed(2)))}
          className="h-7 w-20 text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </td>
      <td className="p-1 border border-gray-200 text-sm text-center w-20">
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAddRow(index)}
            title="添加行"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-500 hover:text-red-700"
            onClick={() => onDeleteRow(item.id)}
            title="删除行"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
      <td className="p-1 border border-gray-200 text-sm text-center">
        <Checkbox
          checked={item.selectedForBatch}
          onChange={() => onToggleBatch(item.id)}
        />
      </td>
      <td className="p-1 border border-gray-200 text-sm text-center">
        <Checkbox
          checked={item.selectedForExport}
          onChange={() => onToggleExport(item.id)}
        />
      </td>
    </tr>
  );
}
