import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus } from 'lucide-react';
import { parseFile, parseFileByGLM, recognizeImage } from '@/api';
import { ImageUploadArea } from '@/components/upload/ImageUploadArea';
import type { TableData, PriceItem, ParseResponse } from '@/types';

// 预览图片接口类型
interface PreviewImage {
  url: string;
  sheet_name: string;
  index: number;
}

// 可配置字段
interface ConfigurableField {
  key: string;
  name: string;
  description: string;
  required: boolean;
}

type UploadMode = 'excel' | 'image';

export default function UploadPage() {
  const navigate = useNavigate();
  const [uploadMode, setUploadMode] = useState<UploadMode>('excel');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [defaultProfit, setDefaultProfit] = useState(20);
  const [useGLM, setUseGLM] = useState(false);
  const [previewImages, setPreviewImages] = useState<PreviewImage[] | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<Set<number>>(new Set());
  const [previewLoading, setPreviewLoading] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  // 可配置提取字段
  const [fields, setFields] = useState<ConfigurableField[]>([
    { key: 'spec', name: '规格', description: '商品规格/型号', required: true },
    { key: 'ruleName', name: '类型', description: '商品类型/名称', required: true },
    { key: 'originalPrice', name: '原价', description: '原价价格', required: true },
  ]);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldDesc, setNewFieldDesc] = useState('');

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

  const parseByGlmMutation = useMutation({
    mutationFn: (file: File) => {
      const selected = Array.from(selectedSheets);
      return parseFileByGLM(file, selected, fields);
    },
    onSuccess: handleParseSuccess,
  });

  const convertPreviewMutation = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/parse-by-glm-preview', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  };

  const recognizeMutation = useMutation({
    mutationFn: recognizeImage,
    onSuccess: handleParseSuccess,
  });

  const handleConvertPreview = async () => {
    if (!selectedFile) return;
    setPreviewLoading(true);
    try {
      const result = await convertPreviewMutation(selectedFile);
      if (result.success && result.data) {
        // 添加index，默认全选
        const imagesWithIndex = result.data.images.map((img: any, idx: number) => ({
          ...img,
          index: idx,
        }));
        setPreviewImages(imagesWithIndex);
        // 默认全选所有Sheet
        const allIndices = new Set(imagesWithIndex.map(img => img.index));
        setSelectedSheets(allIndices);
      } else {
        alert(`转换失败: ${result.message}`);
      }
    } catch (e) {
      alert(`转换出错: ${e}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleSheetSelection = (index: number) => {
    const newSelected = new Set(selectedSheets);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSheets(newSelected);
  };

  const toggleSelectAll = () => {
    if (!previewImages) return;
    if (selectedSheets.size === previewImages.length) {
      setSelectedSheets(new Set());
    } else {
      const allIndices = new Set(previewImages.map(img => img.index));
      setSelectedSheets(allIndices);
    }
  };

  const addField = () => {
    if (!newFieldKey.trim()) {
      alert('请输入字段key');
      return;
    }
    if (!newFieldName.trim()) {
      alert('请输入字段名称');
      return;
    }
    setFields([...fields, {
      key: newFieldKey.trim(),
      name: newFieldName.trim(),
      description: newFieldDesc.trim(),
      required: false,
    }]);
    setNewFieldKey('');
    setNewFieldName('');
    setNewFieldDesc('');
  };

  const removeField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

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
    if (ext !== 'xls' && ext !== 'xlsx' && ext !== 'pdf') {
      alert('只支持 .xls .xlsx .pdf 格式');
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
    if (uploadMode === 'excel' && useGLM && !previewImages) {
      // GLM模式需要先预览转换后的图片
      handleConvertPreview();
      return;
    }
    if (uploadMode === 'excel' && useGLM && previewImages) {
      if (selectedSheets.size === 0) {
        alert('请至少勾选一个Sheet进行解析');
        return;
      }
      parseByGlmMutation.mutate(selectedFile);
    } else if (uploadMode === 'excel') {
      if (useGLM) {
        parseByGlmMutation.mutate(selectedFile);
      } else {
        parseMutation.mutate(selectedFile);
      }
    } else {
      recognizeMutation.mutate(selectedFile);
    }
  }

  const isPending = previewLoading || (
    uploadMode !== 'excel' ? recognizeMutation.isPending :
    useGLM ? parseByGlmMutation.isPending : parseMutation.isPending
  );

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
                  accept=".xls,.xlsx,.pdf"
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
                    <p className="text-sm text-gray-400">支持 .xls .xlsx .pdf 格式</p>
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

            {/* 自定义提取字段（仅AI解析模式） */}
            {uploadMode === 'excel' && useGLM && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">自定义提取字段</h3>
                  <p className="text-xs text-gray-500">GLM会按照你配置的字段提取数据</p>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {fields.map((field, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div>
                          <p className="text-xs text-gray-500">Key</p>
                          <Input
                            value={field.key}
                            disabled
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">名称</p>
                          <Input
                            value={field.name}
                            disabled
                            className="h-8 text-xs"
                          />
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
                          className="h-8 w-8 p-0"
                          onClick={() => removeField(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Input
                      placeholder="key (如 brand)"
                      value={newFieldKey}
                      onChange={(e) => setNewFieldKey(e.target.value)}
                      className="text-xs"
                    />
                    <p className="text-xs text-gray-500 mt-1">JSON key</p>
                  </div>
                  <div>
                    <Input
                      placeholder="名称 (如 品牌)"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      className="text-xs"
                    />
                    <p className="text-xs text-gray-500 mt-1">显示名称</p>
                  </div>
                  <div>
                    <Input
                      placeholder="说明 (如 商品品牌)"
                      value={newFieldDesc}
                      onChange={(e) => setNewFieldDesc(e.target.value)}
                      className="text-xs"
                    />
                    <p className="text-xs text-gray-500 mt-1">字段说明</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addField}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  添加字段
                </Button>
              </div>
            )}

            {/* AI解析选项（仅Excel模式） */}
            {uploadMode === 'excel' && (
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <Checkbox
                  id="useGLM"
                  checked={useGLM}
                  onChange={(e) => {
                    setUseGLM(e.target.checked);
                    if (!e.target.checked) {
                      setPreviewImages(null);
                    }
                  }}
                />
                <div>
                  <label
                    htmlFor="useGLM"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    使用 GLM-4V-Flash AI 解析
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    将Excel转换为图片后由AI视觉识别，对不规则表格识别效果更好，但速度较慢。会先展示转换后的图片供你检查。
                  </p>
                </div>
              </div>
            )}

            {/* 转换后的图片预览（供检查） */}
            {uploadMode === 'excel' && useGLM && previewImages && previewImages.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">
                    转换后的图片预览（勾选需要解析的Sheet）
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                    >
                      {selectedSheets.size === previewImages.length ? '取消全选' : '全选'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPreviewImages(null);
                        setSelectedSheets(new Set());
                      }}
                    >
                      重新转换
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto border rounded-lg p-3 bg-gray-50">
                  {previewImages.map((img) => (
                    <div key={img.index} className="flex flex-col space-y-1 relative">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`sheet-${img.index}`}
                          checked={selectedSheets.has(img.index)}
                          onChange={() => toggleSheetSelection(img.index)}
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
                          onClick={() => setZoomImage(img.url)}
                        />
                        {!selectedSheets.has(img.index) && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                            <span className="text-xs text-white bg-black/70 px-2 py-1 rounded">已跳过</span>
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
            )}

            {/* 点击放大遮罩层 */}
            {zoomImage && (
              <div
                className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                onClick={() => setZoomImage(null)}
              >
                <img
                  src={zoomImage}
                  alt="放大预览"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}

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
                  {uploadMode === 'excel' && useGLM && !previewImages ? '转换中...' :
                   uploadMode === 'excel' && useGLM ? 'AI识别中...' :
                   uploadMode === 'excel' ? '解析中...' : '识别中...'}
                </>
              ) : (
                uploadMode === 'excel' && useGLM && !previewImages ? '转换图片预览' :
                uploadMode === 'excel' && useGLM ? '开始AI识别' :
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
                useGLM ? (
                  <>
                    <li>上传包含商品原价的 Excel 文件，使用 GLM-4V-Flash AI 视觉识别</li>
                    <li>适合传统解析失败的不规则表格，识别效果更好</li>
                    <li>AI识别无法保证100%准确，请在预览页面核对修改</li>
                    <li>设置默认利润率，解析后可单独调整每个商品的利润点</li>
                    <li>预览确认无误后点击生成并下载</li>
                  </>
                ) : (
                  <>
                    <li>上传包含商品原价的 Excel 文件</li>
                    <li>设置默认利润率，解析后可单独调整每个商品的利润点</li>
                    <li>支持批量选中修改多个商品的利润率</li>
                    <li>预览确认无误后点击生成并下载</li>
                  </>
                )
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
