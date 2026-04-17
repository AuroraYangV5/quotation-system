# 日志收集 - Sentry

## 概述

项目使用 Sentry 进行错误日志收集和监控。

## 环境配置

创建 `.env` 文件（从 `.env.example` 复制）：

```bash
cp .env.example .env
```

编辑 `.env` 填入以下配置：

```
SENTRY_DSN=https://xxx@sentry.io/xxx
ENV=production
```

## Sentry DSN 获取步骤

1. 访问 [sentry.io](https://sentry.io) 注册账号
2. 创建新项目（选择对应平台：Python）
3. 进入项目设置 → Client Keys
4. 复制 DSN 地址填入 `.env`

## 功能特性

| 功能 | 说明 |
|------|------|
| 错误追踪 | 自动捕获未处理的异常 |
| 性能监控 | traces_sample_rate=0.1 (10%采样) |
| 环境标记 | 区分 development / production |

## 相关文件

- `main.py` - Sentry SDK 初始化配置
- `requirements.txt` - sentry-sdk, python-dotenv 依赖
- `.env.example` - 环境变量模板
- `.gitignore` - .env 文件已排除提交

大多数项目使用免费版即可满足需求。