# Excel报价表生成工具

根据原始价格表和设置的利润率，自动生成新的报价表。

## 功能

- ✅ 自动解析Excel原始报价表，支持 **单Sheet简单格式** 和 **多Sheet复杂格式**
- ✅ 自动检测表格，识别规格列、商品类型、价格信息
- ✅ 支持一个Sheet内多个子表格（如复杂沟槽件表）
- ✅ 根据你设置的利润率自动计算新价格（新价格 = 原价 × (1 + 利润率/100)）
- ✅ 生成格式美观的新Excel报价表，保留原Sheet结构
- ✅ 支持 `.xls` 格式（旧版Excel）和输出 `.xlsx`

## 安装依赖

```bash
pip3 install xlrd openpyxl
```

或者

```bash
pip3 install -r requirements.txt
```

## 使用方法

### 基本用法（默认20%利润率）

```bash
# 处理简单表
python3 parse_excel.py 简单的原价表.xls

# 处理复杂表
python3 parse_excel.py 复杂的原价表.xls
```

### 指定利润率

```bash
# 增加15%利润率
python3 parse_excel.py 复杂的原价表.xls -p 15

# 增加25%利润率
python3 parse_excel.py 复杂的原价表.xls -p 25
```

### 指定输出文件路径

```bash
python3 parse_excel.py 复杂的原价表.xls -p 20 -o 我的新报价表.xlsx
```

### 查看帮助

```bash
python3 parse_excel.py -h
```

## 支持的格式

脚本适配了你提供的两种文件格式：

**简单表格式（单Sheet单表格）：**
- 第1行：商品标题
- 第4行：表头，第一列是"规格"，后续列是商品类型/规则
- 第5行起：数据，每行一个规格，交叉单元格是价格

**复杂表格式（多Sheet多表格）：**
- 每个Sheet对应一个商品大类
- 表头行第一个单元格通常是"规格"
- 自动检测所有表格（包括同一Sheet内多个子表格）
- 自动跳过最后的地址电话信息行
- 规格放第一列，商品类型横向排列，价格在交叉点

脚本会**自动检测**表格结构，不需要手动配置。

## 输出格式

- 保持原有Sheet结构，一个输入Sheet对应输出一个Sheet
- 每个Sheet开头显示标题和利润率
- 表头加粗背景灰色，数据隔行变色
- 全部添加边框，自动调整列宽
- 空单元格保持空白（原表中无此规格商品时）

## 已测试文件

✅ `简单的原价表.xls` - 1个Sheet，1个表格，6个规格，正常输出  
✅ `复杂的原价表.xls` - 5个Sheet，6个表格，140个规格，正常输出  

## 示例输出文件

- `新报价表_利润率20%.xlsx` - 复杂表处理结果（20%利润率）
- `简单表_利润率15%.xlsx` - 简单表处理结果（15%利润率）

# 云服务器持久化部署方案

## **CentOS 上配置环境**

### 第一步：安装python环境

```shell
# 安装命令
sudo yum install python3

# 查看安装是否成功
python3 --version
```

### 第二步：安装pip

```shell
# 安装命令
sudo yum install python3-pip

# 查看是否安装成功
python3 -m pip --version
```

### 第三步：安装项目需要的环境

- git clone 项目代码
- cd 到项目目录下
- 执行以下命令

```Shell
pip3 install -r requirements.txt
```

### 第四步：编辑环境变量

```shell
# 打开编辑
vi ~/.bashrc

# 使其生效
source ~/.bashrc
```

<br />

## **CentOS 上用 systemd 守护 FastAPI 服务**

### **第一步：确认关键路径**

SSH 登录服务器后，先执行以下命令确认路径：

```shell
# 确认 python3 路径
which python3

# 确认项目路径
ls /path/to/your/project/main.py
```

### **第二步：创建 service 文件**

```shell
sudo vi /etc/systemd/system/quotation-backend.service
```

写入以下内容：

```txt
[Unit]
Description=Quotation System Backend
After=network.target

[Service]
User=root
WorkingDirectory=/root/quotation-system
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

⚠️ 需要修改的地方：

- `WorkingDirectory`：改为你的项目实际路径
- `ExecStart` 中的 `/usr/bin/python3`：替换为 `which python3` 的输出结果

### **第三步：启动服务**

```shell
# 重新加载配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start quotation-backend

# 设置开机自启
sudo systemctl enable quotation-backend

# 查看运行状态（看到 Active: active (running) 即成功）
sudo systemctl status quotation-backend
```

### **第四步：开放防火墙端口**

CentOS 默认使用 `firewalld`，需要额外放行端口：

```shell
# 放行 8000 端口
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload

# 验证是否生效
sudo firewall-cmd --list-ports
```

### **常用管理命令**

```shell
# 查看实时日志
sudo journalctl -u quotation-backend -f

# 重启服务（更新代码后执行）
sudo systemctl restart quotation-backend

# 停止服务
sudo systemctl stop quotation-backend
```

