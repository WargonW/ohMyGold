# 构建流程文档

## 概述

OhMyGold 采用预生成静态文件架构，通过 GitHub Actions 定时更新数据并部署到 Cloudflare Pages。构建流程包括数据获取、域名注入、代码混淆三个阶段。

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    开发阶段 (Local Development)              │
├─────────────────────────────────────────────────────────────┤
│  1. 手动运行 convert-csv.js → 生成 historical-data.json    │
│  2. 手动运行 fetch-data.js → 更新 current-price.json       │
│  3. npm run dev → 启动本地服务器                            │
│  4. 域名检查：允许所有域名（ALLOWED_DOMAINS 为空）          │
│  5. 代码：不混淆，保持可读性                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    构建阶段 (Build)                          │
├─────────────────────────────────────────────────────────────┤
│  1. 读取 .env 中的 ALLOWED_DOMAINS                         │
│  2. 复制 src/ → dist/                                      │
│  3. 注入域名白名单到 security.js                           │
│  4. 混淆 dist/js/*.js                                      │
│  5. 复制 public/data/ → dist/data/                         │
│  6. 复制 locales/ → dist/locales/                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    部署阶段 (Deployment)                     │
├─────────────────────────────────────────────────────────────┤
│  1. GitHub Actions 每 6 小时触发                           │
│  2. 运行 fetch-data.js 更新数据                            │
│  3. 运行 build.js 构建                                     │
│  4. 部署 dist/ 到 Cloudflare Pages                         │
└─────────────────────────────────────────────────────────────┘
```

## 目录结构

```
OhMyGold/
├── .env                        # 环境变量（不提交到 git）
├── .env.example                # 环境变量模板
├── .gitignore
├── package.json
├── AGENTS.md
├── data/
│   └── gold_price_history_20y.csv  # 20 年历史数据（CSV）
├── scripts/
│   ├── convert-csv.js          # 一次性：CSV → JSON
│   ├── fetch-data.js           # 每次构建：增量更新数据
│   └── build.js                # 构建：注入域名 + 混淆
├── src/                        # 源代码（开发用）
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── chart.js
│   │   ├── i18n.js
│   │   ├── table.js
│   │   ├── utils.js
│   │   └── security.js         # 域名检查（占位符）
│   └── locales/
│       └── {en,zh,ja,ko,es,fr,de,pt,ru,ar,hi}.json
├── public/                     # 开发阶段直接 serve
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   ├── data/
│   │   ├── historical-data.json
│   │   └── current-price.json
│   └── locales/
├── dist/                       # 构建产物（部署用）
│   ├── index.html
│   ├── css/style.css
│   ├── js/                     # 混淆后的 JS
│   ├── data/
│   └── locales/
└── .github/workflows/
    └── update-data.yml
```

## 开发流程

### 1. 初始化项目

```bash
# 克隆仓库
git clone https://github.com/yourusername/ohmygold.git
cd ohmygold

# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env
```

### 2. 生成历史数据

```bash
# 将 CSV 转换为 JSON（只需运行一次）
npm run convert-csv
```

这会生成 `public/data/historical-data.json`，包含 20 年的每日金价数据。

### 3. 更新当前价格

```bash
# 获取最新金价和汇率
npm run fetch-data
```

这会更新 `public/data/current-price.json`。

### 4. 本地开发

```bash
# 启动本地服务器
npm run dev
```

访问 `http://localhost:3000` 查看网站。

**开发模式特点**：
- 域名检查：允许所有域名（`ALLOWED_DOMAINS` 为空）
- 代码：不混淆，保持可读性
- 数据：从 `public/data/` 读取

### 5. 编辑源代码

修改 `src/` 目录下的文件：
- `src/index.html` - 页面结构
- `src/css/style.css` - 样式
- `src/js/*.js` - JavaScript 逻辑
- `src/locales/*.json` - 国际化文本

**注意**：开发时需要手动同步 `src/` 和 `public/`，或者使用构建命令。

## 构建流程

### 构建命令

```bash
npm run build
```

### 构建步骤详解

#### 步骤 1：读取环境变量

```javascript
// scripts/build.js
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const allowedDomains = envContent
  .split('\n')
  .find(line => line.startsWith('ALLOWED_DOMAINS='))
  ?.split('=')[1]
  ?.split(',')
  .map(d => d.trim())
  .filter(Boolean) || [];

console.log('Allowed domains:', allowedDomains);
```

#### 步骤 2：复制文件

```javascript
// 复制 src/ → dist/
copyDir('src', 'dist');

// 复制 public/data/ → dist/data/
copyDir('public/data', 'dist/data');

// 复制 locales/ → dist/locales/
copyDir('src/locales', 'dist/locales');
```

#### 步骤 3：注入域名

```javascript
// 读取 security.js
let securityJs = fs.readFileSync('dist/js/security.js', 'utf8');

// 替换占位符
securityJs = securityJs.replace(
  '__ALLOWED_DOMAINS__',
  JSON.stringify(allowedDomains)
);

// 写回文件
fs.writeFileSync('dist/js/security.js', securityJs);
```

**src/js/security.js 占位符**：

```javascript
const ALLOWED_DOMAINS = __ALLOWED_DOMAINS__;

function checkDomain() {
  if (ALLOWED_DOMAINS.length === 0) return true; // 开发模式
  const hostname = window.location.hostname;
  if (!ALLOWED_DOMAINS.includes(hostname)) {
    document.body.innerHTML = '<div style="color:#999">Loading...</div>';
    return false;
  }
  return true;
}
```

#### 步骤 4：混淆代码

```javascript
const JavaScriptObfuscator = require('javascript-obfuscator');

const jsFiles = [
  'dist/js/app.js',
  'dist/js/chart.js',
  'dist/js/i18n.js',
  'dist/js/table.js',
  'dist/js/utils.js',
  'dist/js/security.js'
];

jsFiles.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  const obfuscated = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    deadCodeInjection: true,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75
  }).getObfuscatedCode();
  
  fs.writeFileSync(file, obfuscated);
});
```

### 构建产物

```
dist/
├── index.html                  # 注入后的 HTML
├── css/style.css               # 样式（未混淆）
├── js/
│   ├── app.js                  # 混淆后的 JS
│   ├── chart.js
│   ├── i18n.js
│   ├── table.js
│   ├── utils.js
│   └── security.js             # 已注入域名 + 混淆
├── data/
│   ├── historical-data.json    # 20 年历史数据
│   └── current-price.json      # 最新价格 + 汇率
└── locales/
    └── {en,zh,ja,ko,es,fr,de,pt,ru,ar,hi}.json
```

## 环境变量配置

### .env 文件格式

```bash
# 允许的域名列表（逗号分隔）
ALLOWED_DOMAINS=ohmygold.pages.dev,www.ohmygold.com,ohmygold.com

# Gold-API.com API Key（如果需要）
GOLD_API_KEY=3477bcc44e73c2fc5d1f77240f477156eab69bff3d64718d7b2981aa5eaf7671

# Cloudflare 部署凭证
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
```

### .env.example 模板

```bash
# 允许的域名列表（逗号分隔）
ALLOWED_DOMAINS=your-domain.pages.dev

# Gold-API.com API Key（如果需要）
GOLD_API_KEY=your_gold_api_key

# Cloudflare 部署凭证
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
```

### 环境变量说明

| 变量 | 说明 | 示例 |
|------|------|------|
| `ALLOWED_DOMAINS` | 允许的域名列表，逗号分隔 | `ohmygold.pages.dev,www.ohmygold.com` |
| `GOLD_API_KEY` | Gold-API.com API Key（可选） | `3477bcc44e73c2fc5d1f77240f477156...` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | `v1.0-xxx` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | `abc123def456` |

**注意**：
- `.env` 文件**不要提交到 git**
- `.env.example` 文件**需要提交到 git**，作为模板

## GitHub Actions 配置

### Workflow 文件

`.github/workflows/update-data.yml`

```yaml
name: Update Gold Data and Deploy

on:
  schedule:
    # 每 6 小时运行一次（UTC 时间 0:00, 6:00, 12:00, 18:00）
    - cron: '0 */6 * * *'
  workflow_dispatch:  # 支持手动触发

jobs:
  update-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      # 1. 检出代码
      - name: Checkout repository
        uses: actions/checkout@v4
      
      # 2. 设置 Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      # 3. 安装依赖
      - name: Install dependencies
        run: npm install
      
      # 4. 动态生成 .env
      - name: Create .env file
        run: |
          echo "ALLOWED_DOMAINS=${{ secrets.ALLOWED_DOMAINS }}" > .env
          echo "GOLD_API_KEY=${{ secrets.GOLD_API_KEY }}" >> .env
          echo "CLOUDFLARE_API_TOKEN=${{ secrets.CLOUDFLARE_API_TOKEN }}" >> .env
          echo "CLOUDFLARE_ACCOUNT_ID=${{ secrets.CLOUDFLARE_ACCOUNT_ID }}" >> .env
      
      # 5. 更新数据
      - name: Fetch latest gold price data
        run: npm run fetch-data
      
      # 6. 构建项目
      - name: Build project
        run: npm run build
      
      # 7. 部署到 Cloudflare Pages
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: ohmygold
          directory: dist
          branch: main
      
      # 8. 提交更新的数据（可选）
      - name: Commit updated data
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add public/data/
          git diff --staged --quiet || git commit -m "chore: update gold price data [skip ci]"
          git push
```

### GitHub Secrets 配置

在 GitHub 仓库中设置 Secrets：

1. 进入仓库页面
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 添加以下 Secrets：

| Secret 名称 | 值 | 说明 |
|-------------|-----|------|
| `ALLOWED_DOMAINS` | `ohmygold.pages.dev,www.ohmygold.com` | 允许的域名列表 |
| `GOLD_API_KEY` | `3477bcc44e73c2fc5d1f77240f477156...` | Gold-API.com API Key |
| `CLOUDFLARE_API_TOKEN` | `v1.0-xxx` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | `abc123def456` | Cloudflare Account ID |

**获取 Cloudflare 凭证**：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **My Profile** → **API Tokens**
3. 点击 **Create Token**
4. 选择 **Edit Cloudflare Workers** 模板
5. 权限选择：
   - Account: Cloudflare Pages:Edit
   - Account: Cloudflare D1:Edit（如果需要）
6. 复制生成的 Token 作为 `CLOUDFLARE_API_TOKEN`
7. Account ID 在 Dashboard 首页右侧

## 部署流程

### 首次部署

```bash
# 1. 生成历史数据
npm run convert-csv

# 2. 获取最新价格
npm run fetch-data

# 3. 构建项目
npm run build

# 4. 手动部署到 Cloudflare Pages
npm run deploy
```

### 自动部署

GitHub Actions 每 6 小时自动运行：

1. **UTC 0:00**（北京时间 8:00）
2. **UTC 6:00**（北京时间 14:00）
3. **UTC 12:00**（北京时间 20:00）
4. **UTC 18:00**（北京时间 2:00）

每次运行会：
- 获取最新金价和汇率
- 构建项目（注入域名 + 混淆）
- 部署到 Cloudflare Pages

### 手动触发部署

1. 进入 GitHub 仓库
2. 点击 **Actions** → **Update Gold Data and Deploy**
3. 点击 **Run workflow**
4. 选择分支（通常是 `main`）
5. 点击 **Run workflow**

## 安全机制

### 1. 域名检查

**工作原理**：

```javascript
// 构建后的 security.js
const ALLOWED_DOMAINS = ["ohmygold.pages.dev","www.ohmygold.com"];

function checkDomain() {
  if (ALLOWED_DOMAINS.length === 0) return true;
  const hostname = window.location.hostname;
  if (!ALLOWED_DOMAINS.includes(hostname)) {
    document.body.innerHTML = '<div style="color:#999">Loading...</div>';
    return false;
  }
  return true;
}

// 多处调用检查
checkDomain();
```

**检查点**：
- 页面加载时立即检查
- `app.js` 初始化时检查
- `chart.js` 渲染前检查
- `table.js` 渲染前检查
- 每 30 秒定时检查

**失败行为**：
- 显示"Loading..."占位符
- 不渲染任何内容
- 静默失败，不报错

### 2. HTTP 安全头

`public/_headers` 文件：

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: frame-ancestors 'none'
```

**效果**：
- 禁止 iframe 嵌入
- 禁止跨域引用
- 限制权限 API

### 3. 代码混淆

使用 `javascript-obfuscator` 混淆：

```javascript
{
  compact: true,                    // 压缩代码
  controlFlowFlattening: true,      // 控制流扁平化
  deadCodeInjection: true,          // 死代码注入
  stringArray: true,                // 字符串数组
  stringArrayEncoding: ['base64'],  // 字符串编码
  stringArrayThreshold: 0.75        // 编码阈值
}
```

**效果**：
- 变量名混淆（`a`, `b`, `c`）
- 字符串编码（Base64）
- 控制流混乱
- 增加阅读难度

## 常见问题

### Q1: 本地开发时域名检查失败？

**解决方案**：

确保 `.env` 中 `ALLOWED_DOMAINS` 为空或包含 `localhost`：

```bash
ALLOWED_DOMAINS=localhost,127.0.0.1
```

或者完全为空：

```bash
ALLOWED_DOMAINS=
```

### Q2: GitHub Actions 构建失败？

**检查清单**：

1. Secrets 是否正确设置？
2. `ALLOWED_DOMAINS` 格式是否正确（逗号分隔）？
3. Cloudflare API Token 是否有效？
4. Cloudflare Account ID 是否正确？

### Q3: 部署后网站无法访问？

**排查步骤**：

1. 检查 Cloudflare Pages 部署日志
2. 确认域名解析是否正确
3. 检查 `dist/` 目录是否包含所有文件
4. 查看浏览器控制台是否有错误

### Q4: 如何更新允许的域名？

**步骤**：

1. 更新 GitHub Secrets 中的 `ALLOWED_DOMAINS`
2. 手动触发 GitHub Actions 重新部署
3. 等待部署完成

### Q5: 如何禁用代码混淆？

**修改 `scripts/build.js`**：

注释掉混淆代码部分：

```javascript
// 注释掉这部分
/*
jsFiles.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  const obfuscated = JavaScriptObfuscator.obfuscate(code, {...}).getObfuscatedCode();
  fs.writeFileSync(file, obfuscated);
});
*/
```

## 命令速查

| 命令 | 说明 |
|------|------|
| `npm run convert-csv` | CSV → JSON（一次性） |
| `npm run fetch-data` | 获取最新金价和汇率 |
| `npm run dev` | 启动本地服务器 |
| `npm run build` | 构建项目（注入域名 + 混淆） |
| `npm run deploy` | 部署到 Cloudflare Pages |

## 技术栈

- **前端**：Vanilla JS + ES Modules
- **图表**：Chart.js（CDN）
- **构建**：Node.js + javascript-obfuscator
- **部署**：Cloudflare Pages
- **CI/CD**：GitHub Actions

## 参考链接

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Chart.js 文档](https://www.chartjs.org/docs/)
- [javascript-obfuscator](https://github.com/nicolo-ribaudo/javascript-obfuscator)
