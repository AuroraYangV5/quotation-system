import React from 'react';

interface ImageUploadAreaProps {
  selectedFile: File | null;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

export function ImageUploadArea({
  selectedFile,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onClear,
}: ImageUploadAreaProps) {
  // 创建预览URL
  const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : null;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`h-[210px] border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
        ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}
      `}
      onClick={() => {
        if (!selectedFile) {
          document.getElementById('imageInput')?.click();
        }
      }}
    >
      <input
        id="imageInput"
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
      />

      {selectedFile && previewUrl ? (
        <div className="space-y-4">
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="预览"
              className="max-h-48 max-w-full rounded-lg border border-gray-200"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                URL.revokeObjectURL(previewUrl);
                onClear();
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
            >
              ×
            </button>
          </div>
          <p className="text-primary font-medium">✅ {selectedFile.name}</p>
          <p className="text-sm text-gray-500">点击图片重新选择</p>
        </div>
      ) : (
        <>
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-16l-10-10v10m10-10l10 10"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-gray-600 mb-1">
            拖拽图片到此处，或<span className="text-primary font-medium">点击选择图片</span>
          </p>
          <p className="text-sm text-gray-400">支持 JPG, PNG 等常见图片格式</p>
          <p className="text-xs text-gray-400 mt-2">
            提示：请尽量拍摄正方向清晰的表格，识别准确率更高
          </p>
        </>
      )}
    </div>
  );
}
