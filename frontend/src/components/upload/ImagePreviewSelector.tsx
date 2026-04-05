import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { PreviewImage } from "@/pages/UploadPage";

interface ImagePreviewSelectorProps {
  previewImages: PreviewImage[];
  selectedSheets: Set<number>;
  onToggleSheetSelection: (index: number) => void;
  onToggleSelectAll: () => void;
  onResetPreview: () => void;
  onZoomImage: (url: string) => void;
}

export default function ImagePreviewSelector({
  previewImages,
  selectedSheets,
  onToggleSheetSelection,
  onToggleSelectAll,
  onResetPreview,
  onZoomImage,
}: ImagePreviewSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          转换后的图片预览（勾选需要解析的Sheet）
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onToggleSelectAll}>
            {selectedSheets.size === previewImages.length
              ? "取消全选"
              : "全选"}
          </Button>
          <Button variant="outline" size="sm" onClick={onResetPreview}>
            重新转换
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto border rounded-lg p-3 bg-gray-50">
        {previewImages.map((img) => (
          <div
            key={img.index}
            className="flex flex-col space-y-1 relative"
          >
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`sheet-${img.index}`}
                checked={selectedSheets.has(img.index)}
                onChange={() => onToggleSheetSelection(img.index)}
              />
              <label
                htmlFor={`sheet-${img.index}`}
                className="text-xs text-gray-500 cursor-pointer truncate"
                title={`Sheet ${img.index + 1}: ${img.sheet_name}`}
              >
                Sheet {img.index + 1}: {img.sheet_name}
              </label>
            </div>
            <div className="aspect-video bg-white border rounded overflow-hidden relative">
              <img
                src={img.url}
                alt={img.sheet_name}
                className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onZoomImage(img.url)}
              />
              {!selectedSheets.has(img.index) && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                  <span className="text-xs text-white bg-black/70 px-2 py-1 rounded">
                    已跳过
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-amber-600">
        ✅ 图片转换完成，勾选需要解析的Sheet。点击图片可放大查看清晰度。确认选择后点击"开始AI识别"继续。
        ({selectedSheets.size}/{previewImages.length} 已选中)
      </p>
    </div>
  );
}
