import { Button } from "@/components/ui/button";

interface PreviewHeaderProps {
  tablesCount: number;
  allItemsCount: number;
  exportSelectedItemsCount: number;
  hasExportSelection: boolean;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function PreviewHeader({
  tablesCount,
  allItemsCount,
  exportSelectedItemsCount,
  hasExportSelection,
  onBack,
  onGenerate,
  isGenerating,
}: PreviewHeaderProps) {
  return (
    <div className="sticky top-0 z-50 mx-auto relative max-w-6xl text-center bg-[#f5f7fa] py-6 px-4 min-w-[1024px]">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">预览与编辑</h1>
        <p className="text-gray-600">
          共 {tablesCount} 个表格，{allItemsCount} 个商品规格
          {hasExportSelection && `，已选择 ${exportSelectedItemsCount} 项导出`}
        </p>
      </div>
      <div className="absolute top-4 right-5 flex gap-3 mt-4">
        <Button variant="outline" onClick={onBack} className="bg-[#fff]">
          返回上传
        </Button>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="bg-[#1a1a1a] text-[#fff]"
        >
          {isGenerating ? (
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
  );
}
