import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

interface GlobalProfitCardProps {
  globalProfit: number;
  onChange: (profit: number) => void;
}

export function GlobalProfitCard({ globalProfit, onChange }: GlobalProfitCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>全局设置</CardTitle>
          <label className="text-sm font-medium">利润率: {globalProfit}%</label>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={String(globalProfit)}
              className="bg-[#1a1a1a]"
              onChange={(e) => onChange(Number(e.target.value))}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">滑动滑块将所有商品统一设置为这个利润率</p>
        </div>
      </CardContent>
    </Card>
  );
}
