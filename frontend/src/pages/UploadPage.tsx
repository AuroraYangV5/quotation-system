import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseFile } from '@/api';
import type { TableData, PriceItem } from '@/types';

export default function UploadPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [defaultProfit, setDefaultProfit] = useState(20);

  const parseMutation = useMutation({
    mutationFn: parseFile,
    onSuccess: (data) => {
      if (data.success && data.data) {
        // 初始化每个商品的利润率为默认值
        const tables: TableData[] = data.data.tables.map(table => ({
          ...table,
          items: table.items.map((item: Omit<PriceItem, 'profitPercent' | 'calculatedPrice' | 'selected'>) => ({
            ...item,
            profitPercent: defaultProfit,
            calculatedPrice: item.originalPrice * (1 + defaultProfit / 100),
            selected: false,
          })),
        }));
        // 保存到sessionStorage，跳转到编辑页面
        sessionStorage.setItem('quotation-tables', JSON.stringify(tables));
        navigate('/preview');
      }
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  }, []);

  function validateAndSetFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xls' && ext !== 'xlsx') {
      alert('只支持 .xls 或 .xlsx 格式的 Excel 文件');
      return;
    }
    setSelectedFile(file);
  }

  function handleSubmit() {
    if (!selectedFile) {
      alert('请先选择文件');
      return;
    }
    parseMutation.mutate(selectedFile);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">报价自动生成工具</h1>
          <p className="text-gray-600">上传原价表，自定义利润率，一键生成新报价</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>上传文件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 文件上传区域 */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}
              `}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <Input
                id="fileInput"
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
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
              {selectedFile ? (
                <p className="text-primary font-medium">✅ {selectedFile.name}</p>
              ) : (
                <>
                  <p className="text-gray-600 mb-1">
                    拖拽文件到此处，或<span className="text-primary font-medium">点击选择文件</span>
                  </p>
                  <p className="text-sm text-gray-400">支持 .xls 或 .xlsx 格式</p>
                </>
              )}
            </div>

            {/* 默认利润率 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                默认利润率 (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={defaultProfit}
                onChange={(e) => setDefaultProfit(Number(e.target.value))}
                placeholder="默认利润率"
              />
              <p className="text-sm text-gray-500 mt-1">
                所有商品会默认使用这个利润率，后续可以在预览页面单独修改
              </p>
            </div>

            {/* 提交按钮 */}
            <Button
              className="w-full text-[#fff]"
              size="lg"
              onClick={handleSubmit}
              disabled={!selectedFile || parseMutation.isPending}
            >
              {parseMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 1 5.373 1 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  解析中...
                </>
              ) : (
                '开始解析'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card className="mt-6 bg-white/60 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-700 mb-2">使用说明：</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>上传包含商品原价的 Excel 文件</li>
              <li>设置默认利润率，解析后可单独调整每个商品的利润点</li>
              <li>支持批量选中修改多个商品的利润率</li>
              <li>预览确认无误后点击生成并下载</li>
              <li>无需登录，纯工具使用</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
