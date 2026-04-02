import { Button } from "@/components/ui/button";

interface SheetTabsProps {
  sheetNames: string[];
  selectedSheet: string;
  onSelect: (sheet: string) => void;
}

export function SheetTabs({ sheetNames, selectedSheet, onSelect }: SheetTabsProps) {
  if (sheetNames.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {sheetNames.map((name) => (
        <Button
          key={name}
          variant={name === selectedSheet ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(name)}
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
  );
}
