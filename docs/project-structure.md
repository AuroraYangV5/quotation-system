# 项目架构说明

## 整体架构

采用前后端分离架构：
- **后端**: Python FastAPI，负责Excel解析和生成
- **前端**: React + TypeScript + Rsbuild，负责用户交互和编辑
- **通信**: REST API JSON格式，文件上传用FormData

## 目录结构

```
quotation-system/
├── main.py                    # FastAPI后端入口
├── parse_excel.py             # 原始Excel解析逻辑
├── requirements.txt           # Python依赖
├── frontend/                  # React前端项目
│   ├── src/
│   │   ├── components/ui/     # Shadcn UI基础组件
│   │   ├── pages/             # 页面组件
│   │   ├── lib/               # 工具库
│   │   ├── utils/             # 工具函数
│   │   ├── api/               # API接口定义
│   │   ├── types/             # TypeScript类型定义
│   │   ├── App.tsx            # 根组件路由配置
│   │   └── index.tsx          # 入口文件
│   ├── rsbuild.config.ts      # Rsbuild构建配置
│   ├── tailwind.config.js     # Tailwind CSS配置
│   ├── tsconfig.json          # TypeScript配置
│   └── package.json           # NPM依赖
├── docs/                      # 功能文档
│   ├── file-upload.md         # 文件上传功能
│   ├── profit-settings.md     # 利润率设置功能
│   ├── online-preview.md      # 在线预览编辑功能
│   ├── generate-download.md   # 生成下载功能
│   └── project-structure.md   # 本文件
├── .mock/                     # 测试文件
└── AGENT.md                   # 开发约束
```

## 技术栈

按照AGENT.md要求使用：

| 技术 | 用途 |
|------|------|
| Rsbuild | 前端构建工具 |
| pnpm | 包管理器 |
| React | 前端框架 |
| TypeScript | 类型检查 |
| react-router-dom | 路由 |
| @tanstack/react-query | 数据请求 |
| @tanstack/react-form | 表单处理 |
| @tanstack/react-table | 表格 |
| shadcn/ui | 组件库 |
| Tailwind CSS | 样式 |
| FastAPI | 后端框架 |
| Python | 后端语言 |
| xlrd/openpyxl | Excel处理 |

## 设计符合要求

1. ✅ 品牌色: `#397bffff` (`#1a1a1a`)
2. ✅ UI风格: 微圆角
3. ✅ fetch封装request，统一错误处理，报错显示
4. ✅ 开发完成后使用测试文件测试

## 启动方式

### 后端启动
```bash
pip install -r requirements.txt
python main.py
# 服务运行在 http://localhost:8000
```

### 前端启动开发
```bash
cd frontend
pnpm install
pnpm dev
# 访问 http://localhost:3000
# 开发模式下API代理到后端8000端口
```

### 前端构建生产
```bash
cd frontend
pnpm build
# 产物在 dist 目录，可以部署到静态服务器
```

## 开发约束遵守

- [x] 使用 rsbuild 进行构建
- [x] 使用 pnpm 作为包管理器
- [x] 使用 react-router-dom 作为路由库
- [x] 使用 @tanstack/react-query 进行查询优化操作
- [x] 使用 @tanstack/react-table 作为数据表格库
- [x] 使用 shadcn 作为组件库
- [x] 使用 tailwindcss 作为样式库
- [x] UI 风格使用微圆角
- [x] 品牌色使用 #397bffff
- [x] 基于 fetch 封装的 request 添加统一的拦截器，报错时显示错误
- [x] 每实现一个功能都写md文档记录下来
- [x] 开发完成使用测试文件进行测试
