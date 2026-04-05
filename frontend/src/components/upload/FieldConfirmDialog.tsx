import React from "react";
import { Button } from "@/components/ui/button";
import type { ConfigurableField } from "@/pages/UploadPage";

interface FieldConfirmDialogProps {
  open: boolean;
  fields: ConfigurableField[];
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function FieldConfirmDialog({
  open,
  fields,
  isPending,
  onConfirm,
  onCancel,
}: FieldConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          确认提取字段配置
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          请确认你配置的提取字段是否正确。确认后AI将按照这些字段提取数据，开始识别后无法修改。
        </p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {fields.map((field, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded border">
              <p className="text-sm font-medium text-gray-700">{field.name}</p>
              <p className="text-xs text-gray-500">{field.description}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <Button onClick={onCancel}>
            取消，继续编辑
          </Button>
          <Button variant="outline" onClick={onConfirm} disabled={isPending}>
            {isPending ? "识别中..." : "确认，开始AI识别"}
          </Button>
        </div>
      </div>
    </div>
  );
}
