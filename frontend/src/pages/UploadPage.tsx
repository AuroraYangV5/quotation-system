import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { parseFile, parseFileByGLM, recognizeImage } from "@/api";
import CustomExtractionFields from "@/components/upload/CustomExtractionFields";
import FieldConfirmDialog from "@/components/upload/FieldConfirmDialog";
import type { TableData, PriceItem, ParseResponse } from "@/types";
import { initFileCache, saveFileRecord, getAllFileRecords, updateFileRecord, type CachedFileRecord } from "@/utils/fileCache";

// 预览图片接口类型
export interface PreviewImage {
  url: string;
  sheet_name: string;
  index: number;
}

// 可配置字段
export interface ConfigurableField {
  key: string;
  name: string;
  description: string;
  required: boolean;
}

type UploadMode = "excel" | "image";

export type FileType = "image" | "excel" | "pdf";

export interface UploadFileRecord {
  id: string;
  file: File;
  fileType: FileType;
  previewUrl: string | null;
  previewImages: PreviewImage[] | null;
  selectedSheets: Set<number>;
  parseResult: ParseResponse | null;
  status: "pending" | "preview" | "parsed" | "error";
  errorMessage?: string;
}

const RECENT_FILES_KEY = "quotation-recent-files";

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function getFileType(file: File): FileType {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (file.type.startsWith("image/")) return "image";
  return "excel";
}

function isExcelOrPdf(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "xls" || ext === "xlsx" || ext === "pdf";
}

function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

function loadRecentFiles(): {
  id: string;
  name: string;
  parseResult: ParseResponse;
  timestamp: number;
}[] {
  try {
    const stored = localStorage.getItem(RECENT_FILES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentFile(id: string, name: string, parseResult: ParseResponse) {
  try {
    const recent = loadRecentFiles();
    const filtered = recent.filter((f) => f.id !== id);
    const newEntry = { id, name, parseResult, timestamp: Date.now() };
    filtered.unshift(newEntry);
    const trimmed = filtered.slice(0, 10);
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(trimmed));
  } catch {}
}

export default function UploadPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadMode, setUploadMode] = useState<UploadMode>("excel");
  const [selectedFiles, setSelectedFiles] = useState<
    Map<string, UploadFileRecord>
  >(new Map());
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [defaultProfit, setDefaultProfit] = useState(20);
  const [useGLM, setUseGLM] = useState(true);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [recentFiles, setRecentFiles] = useState<
    {
      id: string;
      name: string;
      parseResult: ParseResponse;
      timestamp: number;
    }[]
  >([]);

  // 可配置提取字段
  const [fields, setFields] = useState<ConfigurableField[]>([
    { key: "spec", name: "规格", description: "商品规格/型号", required: true },
    {
      key: "ruleName",
      name: "类型",
      description: "商品类型/名称",
      required: true,
    },
    {
      key: "originalPrice",
      name: "原价",
      description: "原价价格",
      required: true,
    },
  ]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldDesc, setNewFieldDesc] = useState("");

  // 加载最近的文件
  useEffect(() => {
    async function loadRecent() {
      await initFileCache();
      try {
        const cached = await getAllFileRecords();
        // 转换为旧格式以保持兼容性
        const recent = cached.map((record) => ({
          id: record.id,
          name: record.name,
          parseResult: record.parseResult,
          timestamp: record.timestamp,
        }));
        setRecentFiles(recent);
      } catch (e) {
        console.error("Failed to load recent files from IndexedDB:", e);
        setRecentFiles(loadRecentFiles());
      }
    }
    loadRecent();
  }, []);

  // 获取当前活动的文件记录
  const activeFile = activeFileId ? selectedFiles.get(activeFileId) : null;

  // 处理解析成功后的通用逻辑
  const handleParseSuccess = (
    data: ParseResponse,
    fileId: string,
    fileName: string,
  ) => {
    if (data.success && data.data) {
      // 更新文件记录状态
      setSelectedFiles((prev) => {
        const updated = new Map(prev);
        const record = updated.get(fileId);
        if (record) {
          updated.set(fileId, {
            ...record,
            status: "parsed",
            parseResult: data,
          });
        }
        return updated;
      });

      // 更新 IndexedDB 缓存
      updateFileRecord(fileId, { parseResult: data }).catch((e) =>
        console.error("Failed to update parse result in cache:", e),
      );

      // 保存到最近文件
      saveRecentFile(fileId, fileName, data);

      // 初始化每个商品的利润率为默认值
      const tables: TableData[] = data.data.tables.map((table) => ({
        ...table,
        items: table.items.map((item: any) => ({
          ...item,
          profitPercent: defaultProfit,
          calculatedPrice: item.originalPrice * (1 + defaultProfit / 100),
          selectedForBatch: false,
          selectedForExport: false,
        })),
      }));
      // 保存到sessionStorage，跳转到编辑页面
      sessionStorage.setItem("quotation-tables", JSON.stringify(tables));
      navigate("/preview");
    }
  };

  const parseMutation = useMutation({
    mutationFn: parseFile,
    onSuccess: (data) => {
      if (activeFileId) {
        handleParseSuccess(data, activeFileId, activeFile?.file.name || "");
      }
    },
  });

  const parseByGlmMutation = useMutation({
    mutationFn: ({ file, selected }: { file: File; selected: number[] }) => {
      return parseFileByGLM(file, selected, fields);
    },
    onSuccess: (data) => {
      if (activeFileId) {
        handleParseSuccess(data, activeFileId, activeFile?.file.name || "");
      }
    },
  });

  const convertPreviewMutation = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`/api/parse-by-glm-preview`, {
      method: "POST",
      body: formData,
    });
    return response.json();
  };

  const recognizeMutation = useMutation({
    mutationFn: recognizeImage,
    onSuccess: (data) => {
      if (activeFileId) {
        handleParseSuccess(data, activeFileId, activeFile?.file.name || "");
      }
    },
  });

  const handleConvertPreview = async (fileId: string) => {
    const record = selectedFiles.get(fileId);
    if (!record) return;

    setSelectedFiles((prev) => {
      const updated = new Map(prev);
      updated.set(fileId, { ...record, status: "pending" });
      return updated;
    });

    try {
      const result = await convertPreviewMutation(record.file);
      if (result.success && result.data) {
        const imagesWithIndex = result.data.images.map(
          (img: any, idx: number) => ({
            ...img,
            index: idx,
          }),
        );
        const allIndices = new Set<number>(imagesWithIndex.map((img: PreviewImage) => img.index));
        setSelectedFiles((prev) => {
          const updated = new Map(prev);
          updated.set(fileId, {
            ...record,
            status: "preview",
            previewImages: imagesWithIndex,
            selectedSheets: allIndices,
          });
          return updated;
        });
        // 更新 IndexedDB 缓存中的预览图片
        updateFileRecord(fileId, { previewImages: imagesWithIndex }).catch((e) =>
          console.error("Failed to update preview images in cache:", e),
        );
      } else {
        toast({
          variant: "destructive",
          title: "转换失败",
          description: result.message,
        });
        setSelectedFiles((prev) => {
          const updated = new Map(prev);
          updated.set(fileId, {
            ...record,
            status: "error",
            errorMessage: result.message,
          });
          return updated;
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "转换出错",
        description: String(e),
      });
      setSelectedFiles((prev) => {
        const updated = new Map(prev);
        updated.set(fileId, {
          ...record,
          status: "error",
          errorMessage: String(e),
        });
        return updated;
      });
    }
  };

  const toggleSheetSelection = (fileId: string, index: number) => {
    const record = selectedFiles.get(fileId);
    if (!record) return;
    const newSelected = new Set(record.selectedSheets);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedFiles((prev) => {
      const updated = new Map(prev);
      updated.set(fileId, { ...record, selectedSheets: newSelected });
      return updated;
    });
  };

  const toggleSelectAll = (fileId: string) => {
    const record = selectedFiles.get(fileId);
    if (!record || !record.previewImages) return;
    if (record.selectedSheets.size === record.previewImages.length) {
      setSelectedFiles((prev) => {
        const updated = new Map(prev);
        updated.set(fileId, { ...record, selectedSheets: new Set() });
        return updated;
      });
    } else {
      const allIndices = new Set(record.previewImages.map((img) => img.index));
      setSelectedFiles((prev) => {
        const updated = new Map(prev);
        updated.set(fileId, { ...record, selectedSheets: allIndices });
        return updated;
      });
    }
  };

  const resetPreview = (fileId: string) => {
    const record = selectedFiles.get(fileId);
    if (!record) return;
    setSelectedFiles((prev) => {
      const updated = new Map(prev);
      updated.set(fileId, {
        ...record,
        previewImages: null,
        selectedSheets: new Set(),
      });
      return updated;
    });
  };

  const addField = () => {
    if (!newFieldName.trim()) {
      toast({
        variant: "destructive",
        title: "提示",
        description: "请输入字段名称",
      });
      return;
    }
    const autoKey = newFieldName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_\u4e00-\u9fa5]/g, "");
    setFields([
      ...fields,
      {
        key: autoKey,
        name: newFieldName.trim(),
        description: newFieldDesc.trim(),
        required: false,
      },
    ]);
    setNewFieldName("");
    setNewFieldDesc("");
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

  // 处理文件选择（支持多文件，所有类型统一处理）
  const handleFilesSelected = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const newFiles = new Map(selectedFiles);
      let firstNewId: string | null = null;

      Array.from(files).forEach((file) => {
        const fileType = getFileType(file);
        const isValid =
          fileType === "image" || fileType === "excel" || fileType === "pdf";

        if (!isValid) {
          toast({
            variant: "destructive",
            title: "不支持的文件格式",
            description: "只支持 .xls .xlsx .pdf 和图片格式",
          });
          return;
        }

        // 使用时间戳+随机数生成稳定ID
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const previewUrl =
          fileType === "image" ? URL.createObjectURL(file) : null;

        if (!firstNewId) firstNewId = id;

        newFiles.set(id, {
          id,
          file,
          fileType,
          previewUrl,
          previewImages: null,
          selectedSheets: new Set(),
          parseResult: null,
          status: "pending",
        });

        // 保存到 IndexedDB 缓存
        saveFileRecord({
          id,
          name: file.name,
          fileBlob: file,
          fileType,
          timestamp: Date.now(),
          parseResult: null,
          previewImages: null,
        }).catch((e) => console.error("Failed to save file to cache:", e));
      });

      setSelectedFiles(newFiles);
      if (firstNewId && !activeFileId) {
        setActiveFileId(firstNewId);
      }
    },
    [selectedFiles, activeFileId, toast],
  );

  // Excel 文件拖拽处理
  const handleExcelDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFilesSelected(e.dataTransfer.files);
    },
    [handleFilesSelected],
  );

  const handleExcelFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFilesSelected(e.target.files);
    },
    [handleFilesSelected],
  );

  // 图片文件拖拽处理
  const handleImageDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFilesSelected(e.dataTransfer.files);
    },
    [handleFilesSelected],
  );

  const handleImageFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFilesSelected(e.target.files);
    },
    [handleFilesSelected],
  );

  // 删除文件
  function deleteFile(fileId: string) {
    const record = selectedFiles.get(fileId);
    if (record?.previewUrl) {
      URL.revokeObjectURL(record.previewUrl);
    }
    const newFiles = new Map(selectedFiles);
    newFiles.delete(fileId);
    setSelectedFiles(newFiles);

    if (activeFileId === fileId) {
      const remaining = Array.from(newFiles.keys());
      setActiveFileId(remaining.length > 0 ? remaining[0] : null);
    }
  }

  // 清除所有文件
  function clearAllFiles() {
    selectedFiles.forEach((record) => {
      if (record.previewUrl) {
        URL.revokeObjectURL(record.previewUrl);
      }
    });
    setSelectedFiles(new Map());
    setActiveFileId(null);
  }

  // 选择文件进行编辑
  function selectFile(fileId: string) {
    setActiveFileId(fileId);
  }

  // 提交处理 - 根据文件类型决定处理流程
  function handleSubmit() {
    if (!activeFile) {
      toast({
        variant: "destructive",
        title: "提示",
        description: "请先选择文件",
      });
      return;
    }

    const record = activeFile;
    setActiveFileId(record.id);

    // 图片文件走 OCR 识别
    if (record.fileType === "image") {
      recognizeMutation.mutate(record.file);
      return;
    }

    // Excel/PDF 文件处理
    if (useGLM && !record.previewImages) {
      handleConvertPreview(record.id);
      return;
    }

    if (useGLM && record.previewImages) {
      if (record.selectedSheets.size === 0) {
        toast({
          variant: "destructive",
          title: "提示",
          description: "请至少勾选一个Sheet进行解析",
        });
        return;
      }
      setConfirmDialogOpen(true);
    } else {
      if (useGLM) {
        parseByGlmMutation.mutate({
          file: record.file,
          selected: Array.from(record.selectedSheets),
        });
      } else {
        parseMutation.mutate(record.file);
      }
    }
  }

  function confirmAndStart() {
    setConfirmDialogOpen(false);
    const record = activeFile;
    if (record) {
      parseByGlmMutation.mutate({
        file: record.file,
        selected: Array.from(record.selectedSheets),
      });
    }
  }

  function cancelConfirm() {
    setConfirmDialogOpen(false);
  }

  const isPending = useGLM
    ? parseByGlmMutation.isPending
    : uploadMode === "excel"
      ? parseMutation.isPending
      : recognizeMutation.isPending;

  // 从最近文件恢复
  function restoreFromRecent(recent: {
    id: string;
    name: string;
    parseResult: ParseResponse;
  }) {
    // 保存到sessionStorage，跳转到编辑页面
    const data = recent.parseResult;
    if (data.success && data.data) {
      const tables: TableData[] = data.data.tables.map((table) => ({
        ...table,
        items: table.items.map((item: any) => {
          // 优先使用缓存中保存的利润率，否则使用当前默认值
          const savedProfit = item.profitPercent !== undefined ? item.profitPercent : defaultProfit;
          return {
            ...item,
            profitPercent: savedProfit,
            calculatedPrice: item.originalPrice * (1 + savedProfit / 100),
            selectedForBatch: false,
            selectedForExport: false,
          };
        }),
      }));
      sessionStorage.setItem("quotation-tables", JSON.stringify(tables));
      navigate("/preview");
    }
  }

  return (
    <div className="min-h-screen from-blue-50 to-indigo-100 min-w-[1024px]">
      <div className="sticky top-0 z-50 bg-[#f5f7fa]/95 backdrop-blur-sm py-6 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            报价自动生成系统
          </h1>
          <p className="text-gray-600">
            上传原价表，自定义利润率，一键生成新报价
          </p>
        </div>
      </div>

      {/* 三栏布局：左侧上传区 + 中间操作区 + 右侧说明 */}
      <div className="max-w-7xl mx-auto pb-8 px-4 pt-6">
        <div className="flex gap-6">
          {/* 左侧栏：上传区域 + 文件列表 */}
          <div className="w-[288px] flex-shrink-0 space-y-4">
            <Card className="w-[288px]">
              <CardHeader>
                <CardTitle className="text-lg font-bold">选择资料</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 统一上传区域 - 支持所有文件类型 */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleExcelDrop}
                  className={`min-h-[100px] border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
                    ${
                      isDragging
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                    }`}
                  onClick={() => document.getElementById("fileInput")?.click()}
                >
                  <Input
                    id="fileInput"
                    type="file"
                    accept=".xls,.xlsx,.pdf,image/*"
                    onChange={handleExcelFileChange}
                    className="hidden"
                    multiple
                  />
                  <svg
                    className="mx-auto h-8 w-8 text-gray-400 mb-2"
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
                  <p className="text-sm text-gray-600">
                    <span className="text-primary font-medium">点击选择</span>
                    或拖拽文件
                  </p>
                  <p className="text-xs text-gray-400">
                    .xls .xlsx .pdf .png .jpg .jpeg
                  </p>
                </div>

                {/* 已上传文件列表 */}
                {selectedFiles.size > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-700">
                        文件 ({selectedFiles.size})
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFiles}
                        className="h-6 text-xs"
                      >
                        清除
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {Array.from(selectedFiles.values()).map((record) => (
                        <div
                          key={record.id}
                          className={`p-2 border rounded-lg cursor-pointer transition-all
                            ${
                              activeFileId === record.id
                                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          onClick={() => selectFile(record.id)}
                        >
                          <div className="flex items-center gap-2">
                            {record.previewUrl ? (
                              <img
                                src={record.previewUrl}
                                alt={record.file.name}
                                className="w-10 h-10 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center">
                                <span className="text-xs text-gray-500">
                                  {record.file.name
                                    .split(".")
                                    .pop()
                                    ?.toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p
                                className="text-sm font-medium text-gray-700 truncate"
                                title={record.file.name}
                              >
                                {record.file.name}
                              </p>
                              {record.status === "parsed" &&
                                record.parseResult?.data && (
                                  <p className="text-xs text-green-600">
                                    ✅ {record.parseResult.data.totalItems}项
                                  </p>
                                )}
                              {record.status === "preview" && (
                                <p className="text-xs text-blue-600">
                                  📋 {record.selectedSheets.size}/
                                  {record.previewImages?.length || 0}
                                </p>
                              )}
                              {record.status === "error" && (
                                <p className="text-xs text-red-500">❌ 失败</p>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFile(record.id);
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 最近上传 */}
                {recentFiles.length > 0 && selectedFiles.size === 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">
                      最近上传
                    </h3>
                    <div className="space-y-2">
                      {recentFiles.slice(0, 4).map((recent) => (
                        <div
                          key={recent.id}
                          className="p-2 border border-gray-200 rounded-lg hover:border-primary/50 cursor-pointer transition-all"
                          onClick={() => restoreFromRecent(recent)}
                        >
                          <p
                            className="text-sm font-medium text-gray-700 truncate"
                            title={recent.name}
                          >
                            {recent.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {recent.parseResult.data?.totalItems || 0}项 ·{" "}
                            {new Date(recent.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 中间栏：选中文件的操作区 */}
          <div className="flex-1 min-w-0">
            <Card>
              <CardContent className="p-6 space-y-6">
                {activeFile ? (
                  <>
                    {/* 当前文件信息 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {activeFile.previewUrl ? (
                          <img
                            src={activeFile.previewUrl}
                            alt={activeFile.file.name}
                            className="w-12 h-12 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                            <span className="text-sm text-gray-500">
                              {activeFile.file.name
                                .split(".")
                                .pop()
                                ?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-gray-800">
                            {activeFile.file.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {(activeFile.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row items-center gap-4">
                      {/* 默认利润率 */}
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          默认利润率 (%)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={defaultProfit}
                          onChange={(e) =>
                            setDefaultProfit(Number(e.target.value))
                          }
                          className="w-40"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          后续可在预览页面单独修改
                        </p>
                      </div>

                      {/* AI解析选项 */}
                      {uploadMode === "excel" && (
                        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                          <Checkbox
                            id="useGLM"
                            checked={useGLM}
                            onChange={(e) => setUseGLM(e.target.checked)}
                          />
                          <label
                            htmlFor="useGLM"
                            className="text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            大模型解析
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Sheet预览 */}
                    {uploadMode === "excel" &&
                      useGLM &&
                      activeFile.previewImages && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-700">
                              选择Sheet
                            </h3>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleSelectAll(activeFile.id)}
                              >
                                {activeFile.selectedSheets.size ===
                                activeFile.previewImages.length
                                  ? "取消全选"
                                  : "全选"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetPreview(activeFile.id)}
                              >
                                重新转换
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto border rounded-lg p-3 bg-gray-50">
                            {activeFile.previewImages.map((img) => (
                              <div
                                key={img.index}
                                className="flex flex-col space-y-1 relative"
                              >
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`sheet-${img.index}`}
                                    checked={activeFile.selectedSheets.has(
                                      img.index,
                                    )}
                                    onChange={() =>
                                      toggleSheetSelection(
                                        activeFile.id,
                                        img.index,
                                      )
                                    }
                                  />
                                  <label
                                    htmlFor={`sheet-${img.index}`}
                                    className="text-xs text-gray-500 truncate cursor-pointer"
                                    title={img.sheet_name}
                                  >
                                    {img.sheet_name}
                                  </label>
                                </div>
                                <div className="aspect-video bg-white border rounded overflow-hidden relative">
                                  <img
                                    src={img.url}
                                    alt={img.sheet_name}
                                    className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setZoomImage(img.url)}
                                  />
                                  {!activeFile.selectedSheets.has(
                                    img.index,
                                  ) && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                                      <span className="text-xs text-white bg-black/70 px-1 py-0.5 rounded">
                                        跳过
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-sm text-amber-600">
                            ✅ {activeFile.selectedSheets.size}/
                            {activeFile.previewImages.length} 个Sheet已选中
                          </p>
                        </div>
                      )}

                    {/* 自定义字段 */}
                    {activeFile.fileType !== "image" && useGLM && (
                      <CustomExtractionFields
                        fields={fields}
                        newFieldName={newFieldName}
                        newFieldDesc={newFieldDesc}
                        onNewFieldNameChange={setNewFieldName}
                        onNewFieldDescChange={setNewFieldDesc}
                        onAddField={addField}
                        onRemoveField={removeField}
                      />
                    )}

                    {/* 提交按钮 */}
                    <Button
                      className="w-full bg-[#1a1a1a] text-white"
                      size="lg"
                      onClick={handleSubmit}
                      disabled={isPending}
                    >
                      {isPending ? (
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
                              d="M4 12a8 8 0 018-8V0C5.373 0 1 5.373 1 12h4zm2 5.291A7.962 7.962 7.938l3-2.647z"
                            ></path>
                          </svg>
                          {activeFile?.fileType === "image"
                            ? "识别中..."
                            : useGLM && !activeFile?.previewImages
                              ? "转换中..."
                              : useGLM
                                ? "AI识别中..."
                                : "解析中..."}
                        </>
                      ) : activeFile?.fileType === "image" ? (
                        "开始识别"
                      ) : useGLM && !activeFile?.previewImages ? (
                        "转换图片预览"
                      ) : useGLM ? (
                        "开始AI识别"
                      ) : (
                        "开始解析"
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <svg
                      className="mx-auto h-16 w-16 text-gray-300 mb-4"
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
                    <p>请上传文件或选择已有文件</p>
                    <p className="text-sm mt-1">支持批量上传多个文件</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 使用说明 */}
            <Card className="mt-6 bg-white/60 backdrop-blur">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-700 mb-2 text-sm">
                  使用说明
                </h3>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                  {useGLM ? (
                    <>
                      <li>上传Excel/PDF文件，使用GLM大模型视觉识别</li>
                      <li>上传图片文件，OCR识别规格和原价</li>
                      <li>选择要解析的Sheet，点击开始AI识别</li>
                      <li>识别后可在预览页面修改利润率</li>
                    </>
                  ) : (
                    <>
                      <li>上传Excel文件，系统自动解析价格数据</li>
                      <li>设置默认利润率，解析后可单独调整</li>
                    </>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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

      {/* 确认弹窗 */}
      <FieldConfirmDialog
        open={confirmDialogOpen}
        fields={fields}
        isPending={parseByGlmMutation.isPending}
        onConfirm={confirmAndStart}
        onCancel={cancelConfirm}
      />
    </div>
  );
}
