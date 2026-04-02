import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { generateQuotation } from "@/api";
import type { TableData } from "@/types";
import {
  getCurrentTable,
  filterTableItems,
  toggleSelectAllForTable,
  batchUpdateProfit as batchUpdateProfitUtil,
  setGlobalProfitAll as setGlobalProfitAllUtil,
  toggleItemSelectionInTables,
  updateItemProfitInTables,
  convertToGenerateRequest,
  getItemsToExport,
  countSelectedItems,
  getAllItems,
} from "@/utils/preview/tableUtils";

export function usePreviewPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [globalProfit, setGlobalProfit] = useState(20);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [batchProfitInput, setBatchProfitInput] = useState("");

  // 从 sessionStorage 加载数据
  useEffect(() => {
    const stored = sessionStorage.getItem("quotation-tables");
    if (stored) {
      const data: TableData[] = JSON.parse(stored);
      setTables(data);
      if (data.length > 0) {
        setSelectedSheet(data[0].sheetName);
      }
    } else {
      navigate("/");
    }
  }, [navigate]);

  // 保存到 sessionStorage
  useEffect(() => {
    if (tables.length > 0) {
      sessionStorage.setItem("quotation-tables", JSON.stringify(tables));
    }
  }, [tables]);

  // Derived state
  const currentTable = useMemo(
    () => getCurrentTable(tables, selectedSheet),
    [tables, selectedSheet]
  );

  const filteredCurrentItems = useMemo(
    () => filterTableItems(currentTable?.items || [], searchKeyword),
    [currentTable, searchKeyword]
  );

  const allItems = useMemo(() => getAllItems(tables), [tables]);
  const exportSelectedItems = useMemo(() => getItemsToExport(tables), [tables]);
  const { batchSelectedCount, exportSelectedCount } = useMemo(
    () => countSelectedItems(currentTable),
    [currentTable]
  );

  const hasBatchSelection = batchSelectedCount > 0;
  const hasExportSelection = exportSelectedItems.length > 0;

  // Computed flags
  const currentTableHasAllBatchSelected =
    currentTable?.items.every((i) => i.selectedForBatch) ?? false;
  const currentTableHasAllExportSelected =
    currentTable?.items.every((i) => i.selectedForExport) ?? false;

  // Mutation
  const generateMutation = useMutation({
    mutationFn: () => generateQuotation(convertToGenerateRequest(tables)),
    onSuccess: (blob) => {
      // 创建下载链接并触发下载
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '报价表.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });

  // Handlers
  const handleBack = () => {
    navigate("/");
  };

  const toggleBatchSelection = (itemId: string) => {
    if (!currentTable) return;
    const updatedTables = toggleItemSelectionInTables(tables, currentTable.sheetName, itemId, "selectedForBatch");
    setTables(updatedTables);
  };

  const toggleExportSelection = (itemId: string) => {
    if (!currentTable) return;
    const updatedTables = toggleItemSelectionInTables(tables, currentTable.sheetName, itemId, "selectedForExport");
    setTables(updatedTables);
  };

  const toggleSelectAllBatchCurrentTable = () => {
    if (!currentTable) return;
    const updatedTables = tables.map((table) =>
      table.sheetName === currentTable.sheetName
        ? toggleSelectAllForTable(table, "selectedForBatch", true)
        : table
    );
    setTables(updatedTables);
  };

  const toggleSelectAllExportCurrentTable = () => {
    if (!currentTable) return;
    const updatedTables = tables.map((table) =>
      table.sheetName === currentTable.sheetName
        ? toggleSelectAllForTable(table, "selectedForExport", true)
        : table
    );
    setTables(updatedTables);
  };

  const handleItemProfitChange = (itemId: string, profit: number) => {
    if (!currentTable) return;
    const updatedTables = updateItemProfitInTables(tables, currentTable.sheetName, itemId, profit);
    setTables(updatedTables);
  };

  const batchUpdateProfit = (profit: number) => {
    const updatedTables = batchUpdateProfitUtil(tables, profit);
    setTables(updatedTables);
  };

  const setGlobalProfitAll = (profit: number) => {
    const updatedTables = setGlobalProfitAllUtil(tables, profit);
    setTables(updatedTables);
    setGlobalProfit(profit);
  };

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  return {
    // State
    tables,
    selectedSheet,
    globalProfit,
    searchKeyword,
    batchProfitInput,
    currentTable,
    filteredCurrentItems,
    allItems,
    exportSelectedItems,
    batchSelectedCount,
    exportSelectedCount,
    hasBatchSelection,
    hasExportSelection,
    currentTableHasAllBatchSelected,
    currentTableHasAllExportSelected,
    generateMutation,
    sheetNames: tables.map((t) => t.sheetName),

    // Setters
    setSelectedSheet,
    setSearchKeyword,
    setBatchProfitInput,

    // Handlers
    handleBack,
    handleGenerate,
    toggleBatchSelection,
    toggleExportSelection,
    toggleSelectAllBatchCurrentTable,
    toggleSelectAllExportCurrentTable,
    handleItemProfitChange,
    batchUpdateProfit: () => {
      const profit = Number(batchProfitInput);
      if (!isNaN(profit) && profit >= 0 && profit <= 100) {
        batchUpdateProfit(profit);
        setBatchProfitInput("");
      }
    },
    setGlobalProfitAll,
  };
}

export type UsePreviewPageReturn = ReturnType<typeof usePreviewPage>;
