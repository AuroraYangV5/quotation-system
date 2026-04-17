import { usePreviewPage } from "@/hooks/usePreviewPage";
import type { PriceItem } from "@/types";
import { PreviewHeader } from "@/components/preview/PreviewHeader";
import { GlobalProfitCard } from "@/components/preview/GlobalProfitCard";
import { BatchProfitCard } from "@/components/preview/BatchProfitCard";
import { ItemTable } from "@/components/preview/ItemTable";

export default function PreviewPage() {
  const {
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
    sheetNames,
    setSelectedSheet,
    setSearchKeyword,
    setBatchProfitInput,
    handleBack,
    handleGenerate,
    toggleBatchSelection,
    toggleExportSelection,
    toggleSelectAllBatchCurrentTable,
    toggleSelectAllExportCurrentTable,
    handleItemProfitChange,
    handleItemCalculatedPriceChange,
    handleItemFieldChange,
    handleDeleteRow,
    handleAddRow,
    updateTableTitle,
    updateSheetName,
    batchUpdateProfit,
    setGlobalProfitAll,
  } = usePreviewPage();

  return (
    <div className="min-h-screen min-w-[1024px]">
      <PreviewHeader
        tablesCount={tables.length}
        allItemsCount={allItems.length}
        exportSelectedItemsCount={exportSelectedItems.length}
        hasExportSelection={hasExportSelection}
        onBack={handleBack}
        onGenerate={handleGenerate}
        isGenerating={generateMutation.isPending}
      />
      <div className="max-w-6xl mx-auto pb-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <GlobalProfitCard
            globalProfit={globalProfit}
            onChange={setGlobalProfitAll}
          />
          <BatchProfitCard
            batchProfitInput={batchProfitInput}
            batchSelectedCount={batchSelectedCount}
            hasBatchSelection={hasBatchSelection}
            onInputChange={setBatchProfitInput}
            onApply={batchUpdateProfit}
          />
        </div>

        {currentTable && (
          <ItemTable
            sheetNames={sheetNames}
            selectedSheet={selectedSheet}
            searchKeyword={searchKeyword}
            filteredItems={filteredCurrentItems}
            currentTableHasAllBatchSelected={currentTableHasAllBatchSelected}
            currentTableHasAllExportSelected={currentTableHasAllExportSelected}
            tableTitle={currentTable.tableTitle}
            currentSheetName={currentTable.sheetName}
            exportSelectedCount={exportSelectedCount}
            hasExportSelection={hasExportSelection}
            onSheetSelect={setSelectedSheet}
            onSearchChange={setSearchKeyword}
            onToggleSelectAllBatch={toggleSelectAllBatchCurrentTable}
            onToggleSelectAllExport={toggleSelectAllExportCurrentTable}
            onProfitChange={handleItemProfitChange}
            onCalculatedPriceChange={handleItemCalculatedPriceChange}
            onFieldChange={handleItemFieldChange}
            onDeleteRow={handleDeleteRow}
            onAddRow={handleAddRow}
            onToggleBatch={toggleBatchSelection}
            onToggleExport={toggleExportSelection}
            onUpdateTableTitle={updateTableTitle}
            onUpdateSheetName={updateSheetName}
          />
        )}
      </div>
    </div>
  );
}
