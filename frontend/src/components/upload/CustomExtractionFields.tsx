import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import type { ConfigurableField } from "@/pages/UploadPage";

interface CustomExtractionFieldsProps {
  fields: ConfigurableField[];
  newFieldName: string;
  newFieldDesc: string;
  onNewFieldNameChange: (value: string) => void;
  onNewFieldDescChange: (value: string) => void;
  onAddField: () => void;
  onRemoveField: (index: number) => void;
}

export default function CustomExtractionFields({
  fields,
  newFieldName,
  newFieldDesc,
  onNewFieldNameChange,
  onNewFieldDescChange,
  onAddField,
  onRemoveField,
}: CustomExtractionFieldsProps) {
  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">自定义提取字段</h3>
        <p className="text-xs text-gray-500">GLM会按照你配置的字段提取数据</p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-[180px] overflow-y-auto">
        {fields.map((field, index) => (
          <div
            key={index}
            className="flex items-end gap-2 bg-white p-2 rounded border"
          >
            <div className="grid grid-cols-2 gap-2 flex-1">
              <div>
                <p className="text-xs text-gray-500">名称</p>
                <Input value={field.name} disabled className="h-8 text-xs" />
              </div>
              <div>
                <p className="text-xs text-gray-500">说明</p>
                <Input
                  value={field.description}
                  disabled
                  className="h-8 text-xs"
                />
              </div>
            </div>
            {!field.required && (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={() => onRemoveField(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <p className="text-xs mt-1">新增解析字段</p>
        <div className="flex-1">
          <Input
            placeholder="名称 (如 品牌)"
            value={newFieldName}
            onChange={(e) => onNewFieldNameChange(e.target.value)}
            className="text-xs"
          />
        </div>
        <div className="flex-1">
          <Input
            placeholder="说明 (如 商品品牌)"
            value={newFieldDesc}
            onChange={(e) => onNewFieldDescChange(e.target.value)}
            className="text-xs"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddField}
          className="h-9 w-9 p-0 flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
