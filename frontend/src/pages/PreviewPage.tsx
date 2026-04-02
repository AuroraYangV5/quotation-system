import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { generateQuotation } from "@/api";
import type { TableData } from "@/types";

export default function PreviewPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableData[]>([]);
  const [globalProfit, setGlobalProfit] = useState(20);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [batchProfitInput, setBatchProfitInput] = useState<string>("");

  useEffect(() => {
    const stored = sessionStorage.getItem("quotation-tables");
    if (stored) {
      const parsed = JSON.parse(stored) as TableData[];
      setTables(parsed);
      if (parsed.length > 0) {
        setSelectedSheet(parsed[0].sheetName);
      }
    } else {
      navigate("/");
    }
  }, [navigate]);

  const currentTable = useMemo(() => {
    if (!selectedSheet) return null;
    return tables.find((t) => t.sheetName === selectedSheet);
  }, [tables, selectedSheet]);

  // 过滤搜索后的当前表格items
  const filteredCurrentItems = useMemo(() => {
    if (!currentTable) return [];
    if (!searchKeyword.trim()) return currentTable.items;
    const keyword = searchKeyword.toLowerCase();
    return currentTable.items.filter(
      (item) =>
        item.spec.toLowerCase().includes(keyword) ||
        item.ruleName.toLowerCase().includes(keyword),
    );
  }, [currentTable, searchKeyword]);

  const allItems = useMemo(() => tables.flatMap((t) => t.items), [tables]);

  // 批量设置选中项
  const batchSelectedItems = useMemo(
    () => allItems.filter((item) => item.selectedForBatch),
    [allItems],
  );
  const hasBatchSelection = batchSelectedItems.length > 0;

  // 导出选中项
  const exportSelectedItems = useMemo(
    () => allItems.filter((item) => item.selectedForExport),
    [allItems],
  );
  const hasExportSelection = exportSelectedItems.length > 0;

  // 切换批量设置选中
  function toggleBatchSelection(itemId: string) {
    setTables((prev) =>
      prev.map((table) => ({
        ...table,
        items: table.items.map((item) =>
          item.id === itemId
            ? { ...item, selectedForBatch: !item.selectedForBatch }
            : item,
        ),
      })),
    );
  }

  // 切换导出选中
  function toggleExportSelection(itemId: string) {
    setTables((prev) =>
      prev.map((table) => ({
        ...table,
        items: table.items.map((item) =>
          item.id === itemId
            ? { ...item, selectedForExport: !item.selectedForExport }
            : item,
        ),
      })),
    );
  }

  // 当前Sheet全选/取消全选 - 批量设置
  function toggleSelectAllBatchCurrentTable() {
    if (!currentTable) return;

    const allSelected = currentTable.items.every(
      (item) => item.selectedForBatch,
    );
    setTables((prev) =>
      prev.map((table) => {
        if (table.sheetName !== selectedSheet) return table;
        return {
          ...table,
          items: table.items.map((item) => ({
            ...item,
            selectedForBatch: !allSelected,
          })),
        };
      }),
    );
  }

  // 当前Sheet全选/取消全选 - 导出
  function toggleSelectAllExportCurrentTable() {
    if (!currentTable) return;

    const allSelected = currentTable.items.every(
      (item) => item.selectedForExport,
    );
    setTables((prev) =>
      prev.map((table) => {
        if (table.sheetName !== selectedSheet) return table;
        return {
          ...table,
          items: table.items.map((item) => ({
            ...item,
            selectedForExport: !allSelected,
          })),
        };
      }),
    );
  }

  function updateProfit(itemId: string, profit: number) {
    setTables((prev) =>
      prev.map((table) => ({
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
      })),
    );
  }

  function batchUpdateProfit(profit: number) {
    setTables((prev) =>
      prev.map((table) => ({
        ...table,
        items: table.items.map((item) =>
          item.selectedForBatch
            ? {
                ...item,
                profitPercent: profit,
                calculatedPrice: item.originalPrice * (1 + profit / 100),
              }
            : item,
        ),
      })),
    );
  }

  function setGlobalProfitAll(profit: number) {
    setGlobalProfit(profit);
    setTables((prev) =>
      prev.map((table) => ({
        ...table,
        items: table.items.map((item) => ({
          ...item,
          profitPercent: profit,
          calculatedPrice: item.originalPrice * (1 + profit / 100),
        })),
      })),
    );
  }

  const generateMutation = useMutation({
    mutationFn: generateQuotation,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "报价表.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onError: () => {
      alert("生成失败，请重试");
    },
  });

  function handleGenerate() {
    // 如果有选中项，只导出选中项；否则导出全部
    const itemsToExport = hasExportSelection ? exportSelectedItems : allItems;
    const request = {
      items: itemsToExport.map((item) => ({
        sheetName: item.sheetName,
        spec: item.spec,
        ruleName: item.ruleName,
        originalPrice: item.originalPrice,
        profitPercent: item.profitPercent,
      })),
      sheetInfos: tables.map((table) => ({
        sheetName: table.sheetName,
        tableTitle: table.tableTitle,
        date: table.date,
      })),
    };
    generateMutation.mutate(request);
  }

  function handleBack() {
    navigate("/");
  }

  const sheetNames = tables.map((t) => t.sheetName);

  return (
    <div className="min-h-screen min-w-[1024px]">
      <div className="sticky top-0 z-50 mx-auto relative max-w-6xl text-center bg-[#f5f7fa] py-6 px-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">预览与编辑</h1>
          <p className="text-gray-600">
            共 {tables.length} 个表格，{allItems.length} 个商品规格
            {hasExportSelection &&
              `，已选择 ${exportSelectedItems.length} 项导出`}
          </p>
        </div>
        <div className="absolute top-4 right-5 flex gap-3 mt-4">
          <Button variant="outline" onClick={handleBack} className="bg-[#fff]">
            返回上传
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="bg-[#1a1a1a] text-[#fff]"
          >
            {generateMutation.isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-100"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 1 5.373 1 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                生成中...
              </>
            ) : (
              "生成并下载"
            )}
          </Button>
        </div>
      </div>
      <div className="max-w-6xl mx-auto pb-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>全局设置</CardTitle>
                <label className="text-sm font-medium">
                  利润率: {globalProfit}%
                </label>
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
                    onChange={(e) => setGlobalProfitAll(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  滑动滑块将所有商品统一设置为这个利润率
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                批量设置利润率
                {hasBatchSelection && (
                  <span className="ml-2 text-sm font-normal text-gray-500 leading-none">
                    （已选 {batchSelectedItems.length} 项）
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
                    onChange={(e) => setBatchProfitInput(e.target.value)}
                  />
                  <span className="text-gray-500">%</span>
                  <Button
                    className="bg-[#1a1a1a] text-white"
                    disabled={!hasBatchSelection || !batchProfitInput}
                    onClick={() => {
                      const profit = Number(batchProfitInput);
                      if (!isNaN(profit) && profit >= 0 && profit <= 100) {
                        batchUpdateProfit(profit);
                        // 应用后清空勾选状态
                        setTables((prev) =>
                          prev.map((table) => ({
                            ...table,
                            items: table.items.map((item) => ({
                              ...item,
                              selectedForBatch: false,
                            })),
                          })),
                        );
                        setBatchProfitInput("");
                      }
                    }}
                  >
                    应用
                  </Button>
                </div>

                {!hasBatchSelection && (
                  <p className="text-sm text-amber-600">
                    请先在下方表格【批量】列勾选需要批量修改的商品
                  </p>
                )}
                {hasBatchSelection && (
                  <p className="text-sm text-gray-500">
                    输入利润率后点击确认按钮，应用后自动清空勾选
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {currentTable && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                {sheetNames.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {sheetNames.map((name) => (
                      <Button
                        key={name}
                        variant={name === selectedSheet ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSheet(name)}
                        className={
                          name === selectedSheet
                            ? "bg-[#1a1a1a] text-[#fff] border-[#1a1a1a] h-[40px] px-4"
                            : "text-[#1a1a1a] bg-[#fff] border-[#1a1a1a] h-[40px] px-4"
                        }
                      >
                        {name}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    共 {currentTable.items.length} 项
                    {hasExportSelection &&
                      `, 已选导出 ${exportSelectedItems.length} 项`}
                  </span>
                </div>
              </div>

              {currentTable.tableTitle && (
                <p className="text-sm text-gray-500 mt-1">
                  {currentTable.tableTitle}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                {/* 搜索框 */}
                <div className="w-full">
                  <Input
                    type="text"
                    placeholder="搜索规格或类型..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full border-[#1a1a1a]"
                  />
                  {searchKeyword && (
                    <p className="text-sm text-gray-500 mt-2">
                      找到 {filteredCurrentItems.length} 项匹配
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAllBatchCurrentTable}
                  className="text-[#1a1a1a] bg-[#fff] border-[#1a1a1a] h-[40px]"
                >
                  {currentTable.items.every((i) => i.selectedForBatch)
                    ? "取消全选利润设置"
                    : "全选利润设置"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAllExportCurrentTable}
                  className="text-[#1a1a1a] bg-[#fff] border-[#1a1a1a] h-[40px]"
                >
                  {currentTable.items.every((i) => i.selectedForExport)
                    ? "取消全选导出"
                    : "全选导出"}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left border border-gray-200 text-sm">
                        规格
                      </th>
                      <th className="p-2 text-left border border-gray-200 text-sm">
                        类型
                      </th>
                      <th className="p-2 text-right border border-gray-200 text-sm">
                        原价
                      </th>
                      <th className="p-2 text-center border border-gray-200 text-sm">
                        利润率 (%)
                      </th>
                      <th className="p-2 text-right border border-gray-200 text-sm">
                        计算后价格
                      </th>
                      <th className="p-2 text-center border border-gray-200 text-sm w-26">
                        选择设置利润
                      </th>
                      <th className="p-2 text-center border border-gray-200 text-sm w-26">
                        选择导出
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCurrentItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={idx % 2 === 1 ? "bg-gray-50" : ""}
                      >
                        <td className="p-2 border border-gray-200 text-sm">
                          {item.spec}
                        </td>
                        <td className="p-2 border border-gray-200 text-sm">
                          {item.ruleName}
                        </td>
                        <td className="p-2 border border-gray-200 text-sm text-right">
                          {item.originalPrice}
                        </td>
                        <td className="p-2 border border-gray-200 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.profitPercent}
                              onChange={(e) =>
                                updateProfit(item.id, Number(e.target.value))
                              }
                              className="w-16 h-8 text-sm text-center"
                            />
                            <span className="text-xs text-gray-500">%</span>
                          </div>
                        </td>
                        <td className="p-2 border border-gray-200 text-sm text-right font-medium">
                          {item.calculatedPrice.toFixed(1)}
                        </td>
                        <td className="p-2 border border-gray-200 text-center">
                          <Checkbox
                            checked={item.selectedForBatch}
                            onChange={() => toggleBatchSelection(item.id)}
                          />
                        </td>
                        <td className="p-2 border border-gray-200 text-center">
                          <Checkbox
                            checked={item.selectedForExport}
                            onChange={() => toggleExportSelection(item.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {!currentTable && sheetNames.length > 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              请选择一个工作表查看
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
