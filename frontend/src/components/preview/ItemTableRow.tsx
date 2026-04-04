import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { PriceItem } from "@/types";

interface ItemTableRowProps {
  item: PriceItem;
  index: number;
  customFields: {key: string, name: string}[];
  onProfitChange: (id: string, profit: number) => void;
  onToggleBatch: (id: string) => void;
  onToggleExport: (id: string) => void;
}

export function ItemTableRow({
  item,
  index,
  customFields,
  onProfitChange,
  onToggleBatch,
  onToggleExport,
}: ItemTableRowProps) {
  return (
    <tr className={index % 2 === 1 ? "bg-gray-50" : ""}>
      <td className="p-2 border border-gray-200 text-sm">{item.spec}</td>
      <td className="p-2 border border-gray-200 text-sm">{item.ruleName || "-"}</td>
      {customFields.map(({key}) => (
        <td key={key} className="p-2 border border-gray-200 text-sm">
          {item[key] != null ? String(item[key]) : "-"}
        </td>
      ))}
      <td className="p-2 border border-gray-200 text-sm text-right">
        ¥{item.originalPrice.toFixed(2)}
      </td>
      <td className="p-2 border border-gray-200 text-sm text-center w-24">
        <Input
          type="number"
          min="0"
          max="100"
          value={item.profitPercent}
          onChange={(e) => onProfitChange(item.id, Number(e.target.value))}
          className="h-8 text-center"
        />
      </td>
      <td className="p-2 border border-gray-200 text-sm text-right">
        ¥{item.calculatedPrice.toFixed(2)}
      </td>
      <td className="p-2 border border-gray-200 text-sm text-center">
        <Checkbox
          checked={item.selectedForBatch}
          onChange={() => onToggleBatch(item.id)}
        />
      </td>
      <td className="p-2 border border-gray-200 text-sm text-center">
        <Checkbox
          checked={item.selectedForExport}
          onChange={() => onToggleExport(item.id)}
        />
      </td>
    </tr>
  );
}
