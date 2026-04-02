import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BatchProfitCardProps {
  batchProfitInput: string;
  batchSelectedCount: number;
  hasBatchSelection: boolean;
  onInputChange: (value: string) => void;
  onApply: () => void;
}

export function BatchProfitCard({
  batchProfitInput,
  batchSelectedCount,
  hasBatchSelection,
  onInputChange,
  onApply,
}: BatchProfitCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          批量设置利润率
          {hasBatchSelection && (
            <span className="ml-2 text-sm font-normal text-gray-500 leading-none">
              （已选 {batchSelectedCount} 项）
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="利润率"
              disabled={!hasBatchSelection}
              value={batchProfitInput}
              onChange={(e) => onInputChange(e.target.value)}
            />
            <span className="text-gray-500">%</span>
            <Button
              className="bg-[#1a1a1a] text-white"
              disabled={!hasBatchSelection || !batchProfitInput}
              onClick={onApply}
            >
              应用
            </Button>
          </div>
          {hasBatchSelection && (
            <p className="text-sm text-gray-500">
              输入利润率后点击确认按钮，应用后自动清空勾选
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
