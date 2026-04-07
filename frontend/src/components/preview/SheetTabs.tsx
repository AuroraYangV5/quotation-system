import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

interface SheetTabsProps {
  sheetNames: string[];
  selectedSheet: string;
  onSelect: (sheet: string) => void;
  onUpdateSheetName: (oldSheetName: string, newSheetName: string) => void;
}

export function SheetTabs({ sheetNames, selectedSheet, onSelect, onUpdateSheetName }: SheetTabsProps) {
  if (sheetNames.length <= 1) return null;

  const [editingSheet, setEditingSheet] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEditing = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSheet(name);
    setEditValue(name);
  };

  const finishEditing = () => {
    if (editingSheet && editValue.trim()) {
      onUpdateSheetName(editingSheet, editValue.trim());
    }
    setEditingSheet(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    }
    if (e.key === 'Escape') {
      setEditingSheet(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-500">Sheets:</span>
        <Tooltip>
          <TooltipTrigger >
            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>点击标签可编辑Sheet名称</p>
          </TooltipContent>
        </Tooltip>
      </div>
      {sheetNames.map((name) => (
        editingSheet === name ? (
          <Input
            key={name}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={finishEditing}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-32 h-[40px] text-sm"
          />
        ) : (
          <Button
            key={name}
            variant={name === selectedSheet ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(name)}
            onDoubleClick={(e) => startEditing(name, e)}
            className={
              name === selectedSheet
                ? "bg-[#1a1a1a] text-[#fff] border-[#1a1a1a] h-[40px] px-4"
                : "text-[#1a1a1a] bg-[#fff] border-[#1a1a1a] h-[40px] px-4"
            }
          >
            {name}
          </Button>
        )
      ))}
    </div>
  );
}
