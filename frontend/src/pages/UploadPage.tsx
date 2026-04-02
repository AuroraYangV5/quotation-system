import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseFile, recognizeImage } from '@/api';
import { ImageUploadArea } from '@/components/upload/ImageUploadArea';
import type { TableData, PriceItem, ParseResponse } from '@/types';

type UploadMode = 'excel' | 'image';

export default function UploadPage() {
  const navigate = useNavigate();
  const [uploadMode, setUploadMode] = useState<UploadMode>('excel');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [defaultProfit, setDefaultProfit] = useState(20);

  // 处理解析成功后的通用逻辑
  const handleParseSuccess = (data: ParseResponse) => {
    if (data.success && data.data) {
      // 初始化每个商品的利润率为默认值
      const tables: TableData[] = data.data.tables.map(table => ({
        ...table,
        items: table.items.map((item: Omit<PriceItem, 'profitPercent' | 'calculatedPrice' | 'selectedForBatch' | 'selectedForExport'>) => ({
          ...item,
          profitPercent: defaultProfit,
          calculatedPrice: item.originalPrice * (1 + defaultProfit / 100),
          selectedForBatch: false,
          selectedForExport: false,
        })),
      }));
      // 保存到sessionStorage，跳转到编辑页面
      sessionStorage.setItem('quotation-tables', JSON.stringify(tables));
      navigate('/preview');
    }
  };

  const parseMutation = useMutation({
    mutationFn: parseFile,
    onSuccess: handleParseSuccess,
  });

  const recognizeMutation = useMutation({
    mutationFn: recognizeImage,
    onSuccess: handleParseSuccess,
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Excel 文件处理
  const handleExcelDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetExcelFile(file);
    }
  }, []);

  const handleExcelFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetExcelFile(file);
    }
  }, []);

  function validateAndSetExcelFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xls' && ext !== 'xlsx') {
      alert('只支持 .xls 或 .xlsx 格式的 Excel 文件');
      return;
    }
    setSelectedFile(file);
  }

  // 图片文件处理
  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetImageFile(file);
    }
  }, []);

  const handleImageFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetImageFile(file);
    }
  }, []);

  function validateAndSetImageFile(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('只支持图片文件');
      return;
    }
    setSelectedFile(file);
  }

  function clearSelectedFile() {
    setSelectedFile(null);
  }

  function handleSubmit() {
    if (!selectedFile) {
      alert('请先选择文件');
      return;
    }
    if (uploadMode === 'excel') {
      parseMutation.mutate(selectedFile);
    } else {
      recognizeMutation.mutate(selectedFile);
    }
  }

  const isPending = uploadMode === 'excel' ? parseMutation.isPending : recognizeMutation.isPending;

  return (
    <div className="min-h-screen from-blue-50 to-indigo-100 min-w-[1024px]">
      <div className="sticky top-0 z-50 bg-[#f5f7fa]/95 backdrop-blur-sm py-6 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">报价自动生成系统</h1>
          <p className="text-gray-600">上传原价表，自定义利润率，一键生成新报价</p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto pb-8 px-4 pt-6">
        <Card>
          <CardHeader>
            <div className="flex space-x-1">
              <button
                onClick={() => {
                  setUploadMode('excel');
                  setSelectedFile(null);
                }}
                className={`flex-1 py-2 px-4 rounded-t-lg font-medium transition-colors
                  ${uploadMode === 'excel'
                    ? 'bg-gray-100 border-b-2 border-primary text-primary'
                    : 'bg-white text-gray-500 hover:bg-gray-200'
                  }`}
              >
                Excel 文件上传
              </button>
              <button
                onClick={() => {
                  setUploadMode('image');
                  setSelectedFile(null);
                }}
                className={`flex-1 py-2 px-4 rounded-t-lg font-medium transition-colors
                  ${uploadMode === 'image'
                    ? 'bg-gray-100 border-b-2 border-primary text-primary'
                    : 'bg-white text-gray-500 hover:bg-gray-200'
                  }`}
              >
                图片 OCR 识别
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 上传区域 根据模式显示 */}
            {uploadMode === 'excel' ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleExcelDrop}
                className={`h-[210px] border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}
                `}
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                <Input
                  id="fileInput"
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleExcelFileChange}
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
            ) : (
              <ImageUploadArea
                selectedFile={selectedFile}
                isDragging={isDragging}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleImageDrop}
                onFileChange={handleImageFileChange}
                onClear={clearSelectedFile}
              />
            )}

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
              className="w-full bg-[#1a1a1a] text-white"
              size="lg"
              onClick={handleSubmit}
              disabled={!selectedFile || isPending}
            >
              {isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 1 5.373 1 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {uploadMode === 'excel' ? '解析中...' : '识别中...'}
                </>
              ) : (
                uploadMode === 'excel' ? '开始解析' : '开始识别'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card className="mt-6 bg-white/60 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-700 mb-2">使用说明：</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              {uploadMode === 'excel' ? (
                <>
                  <li>上传包含商品原价的 Excel 文件</li>
                  <li>设置默认利润率，解析后可单独调整每个商品的利润点</li>
                  <li>支持批量选中修改多个商品的利润率</li>
                  <li>预览确认无误后点击生成并下载</li>
                </>
              ) : (
                <>
                  <li>上传包含价格表格的图片，系统自动OCR识别规格和原价</li>
                  <li>OCR识别无法保证100%准确，请在预览页面核对修改</li>
                  <li>提示：尽量拍摄清晰正放的表格，识别准确率更高</li>
                  <li>识别后后续操作与Excel上传完全相同</li>
                </>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
