# 史序 · Shixu History

> 在可播放的地图叙事中，回顾 1840 年至今的中国近现代史。

[![GitHub Repository](https://img.shields.io/badge/GitHub-dongyu--will%2Fshixu--history-181717?logo=github)](https://github.com/dongyu-will/shixu-history)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**史序**是一款开源、纯前端静态部署的交互式历史地图叙事与复习应用。它将时间轴、过程动画、AI 合成讲解与同步字幕统一在同一播放器时钟下，帮助你像看纪录片一样顺畅串联中国近代史与新中国史的核心脉络，同时支持随时暂停细读、挖空回忆、易混对照与真题复测。

---

## 核心特性

- **双篇地图叙事（136 节点 · 9 章节 · 20 分钟连贯播放）**
  - **上篇 · 中国近代史（1840—1949）**：100 个历史节点，涵盖山河变局、星火初燃、道路探索、全民族抗战、走向新中国 5 个章节，含 12 分钟完整普通话 AI 讲解与同步字幕。
  - **下篇 · 新中国史（1949—新时代）**：36 个历史节点，涵盖立国建制、艰辛探索、改革开放、迈向新时代 4 个章节，含 8 分钟普通话 AI 讲解与同步字幕（按需懒加载）。
- **单时钟驱动的过程动画与多维画布**
  - 所有节点均配有逐条编排的过程动画（地理行进、力量汇集、决策分支、观点交锋、三三制席位、土地权属演化等），基于浏览器原生 Web Animations API 与播放、暂停、拖动、倍速严格同步。
  - 内置 5 种非地图影院画布样片（文献手稿 / 纵深档案 / 木刻视差 / 号外公报 / 土地演化），支持在地图视角与画布视角之间切换对照。
- **90 秒交互样片（`/?lesson=road`）**
  - 围绕秋收起义、三湾改编与古田会议，在 20 秒文家市会合处设置决策停顿与史实揭示，播放结束后进行顺序与问题匹配复原。
- **聚焦复习的辅助工具（全部纯本地运行）**
  - **易混对照**：13 组高频易混专题同屏对比（如 1853—2017 土地政策演进、党史关键转折会议、三个历史决议等），点击条目可直接跳转回放地图节点。
  - **真题复测**：收录 2017—2026 年共 72 道史纲真题，支持干扰项地图回放与本地间隔重复计划（复习记录仅保存在浏览器 `localStorage`，不上传任何数据）。
  - **舒适观看体验**：支持日间/夜间双主题、0.5×—2× 倍速、专题连播、单章循环、微音效与后台随身听播音，支持键盘快捷键（`Space` 播放/暂停、`←`/`→` 上/下一幕、`Home`/`End` 首尾跳转）。

---

## 本地开发

环境要求：**Node.js 20+**（无需后端服务或数据库）。

```sh
git clone https://github.com/dongyu-will/shixu-history.git
cd shixu-history/timeline
npm install
npm run dev
```

默认打开提示的本地地址（通常为 `http://localhost:5173/`）。常用直达参数：

- `/?event=e-1` — 从 1840 年鸦片战争开始
- `/?event=e-27` — 从南昌起义开始
- `/?volume=prc` — 直接进入下篇《新中国史》
- `/?lesson=road` — 打开 90 秒交互样片《道路与建军》

### 构建与测试

```sh
cd timeline
npm run build        # 构建纯静态产物到 timeline/dist/client
npm run preview      # 本地预览生产构建
npm test             # 运行完整测试套件
```

### Fork 自定义仓库链接

界面设置弹窗中的 GitHub 开源仓库入口读取 [`timeline/src/repo.js`](timeline/src/repo.js)（默认指向 `https://github.com/dongyu-will/shixu-history`）。如果你 Fork 了本项目，可在构建时覆盖环境变量：

```sh
VITE_REPO_URL=https://github.com/<your-username>/shixu-history npm run build
```

---

## 一键免费静态托管

仓库已内置零配置部署文件（[`vercel.json`](vercel.json) 与 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)）。完整构建产物 `dist/client`（含全部 JS/CSS、压缩地图拓扑、历史数据 JSON、字幕与 3 条 M4A 讲解音轨）仅约 **9.9 MB**（其中 `timeline/public/audio` + `public/data` 合计 **8.80 MB / 8.39 MiB**，单文件最大 **4.24 MiB**，远低于 25 MiB 上限），无需购买独立服务器或对象存储即可免费部署。

> **关于音频拖拽（HTTP `Range` / `206 Partial Content`）的说明**：播放器以讲解音轨为主时钟，需要托管平台对 `.m4a` 文件原生支持 HTTP `Range` 分段读取，否则进度条拖拽与切幕可能回跳至起点。

| 平台 | 免费额度 | 音频 `Range` 拖拽 | 推荐配置 |
| --- | --- | --- | --- |
| **Vercel**（推荐） | 100 GB/月带宽 | 原生支持 | 已内置根目录 [`vercel.json`](vercel.json)，导入仓库后**无需修改任何字段**直接 Deploy |
| **GitHub Pages**（推荐） | 100 GB/月带宽 | 原生支持 | 已内置 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)，开启 Pages（Source: GitHub Actions）自动部署 |
| **Netlify**（推荐） | 100 GB/月带宽 | 原生支持 | Base: `timeline` · Build: `npm run build` · Publish: `timeline/dist/client` |
| **Cloudflare Pages** | 无限带宽 | 通过 `_redirects` 302 分流至 jsDelivr / R2，原生支持 `206` | `SHIXU_MEDIA_ORIGIN=... SHIXU_MEDIA_LAYOUT=flat npm run build:pages` → `dist/pages` |

### Vercel 零配置一键部署

1. 在 [Vercel](https://vercel.com/new) 导入 [`dongyu-will/shixu-history`](https://github.com/dongyu-will/shixu-history)（或你的 Fork）。
2. 根目录 [`vercel.json`](vercel.json) 已自动配置构建命令与 `timeline/dist/client` 输出目录及长效缓存头，**无需手动填写配置**。
3. 点击 **Deploy** 即可直接上线。

### GitHub Pages 自动部署

仓库已内置 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)，并针对子路径部署做好相对资源解析（`vite.config.mjs` 的 `base: './'` 与 `src/site-path.js`）。在仓库设置中启用 **Settings → Pages → Build and deployment → Source: GitHub Actions** 后，每次推送 `main` 分支即可自动发布到 `https://dongyu-will.github.io/shixu-history/`。

### Cloudflare Pages 部署说明（音频 `Range 206` 分流）

Cloudflare Pages 免费层不限流量，但其静态文件层对 HTTP `Range` 请求默认返回 `200 OK` 而非 `206 Partial Content`，会导致 iOS Safari 音频无法播放或拖拽回弹。因此推荐使用 `npm run build:pages` 构建 `dist/pages`（仅约 `1.9 MB`），由 Pages 生成 `_redirects` 将 3 条 `.m4a` 音轨 302 分流至支持原生 `Range 206` 的媒体源（零 Worker CPU 占用）：

- **方式 A（零绑卡，使用开源 jsDelivr CDN）**：将 `SHIXU_MEDIA_ORIGIN` 指向固定 commit 的仓库音频目录并启用 `SHIXU_MEDIA_LAYOUT=flat`：
  ```sh
  cd timeline
  SHIXU_MEDIA_ORIGIN="https://cdn.jsdelivr.net/gh/dongyu-will/shixu-history@<commit>/timeline/public/audio" \
  SHIXU_MEDIA_LAYOUT=flat \
  npm run build:pages
  npx wrangler pages deploy dist/pages --project-name=shixu-history --branch=main
  ```
- **方式 B（大流量推荐，搭配免费 Cloudflare R2）**：将音频按 `<sha256>/<文件名>` 上传至 R2（10 GB 免费存储 + 零出口流量费），使用默认的 `SHIXU_MEDIA_LAYOUT=hashed` 配合 `SHIXU_MEDIA_ORIGIN=https://<your-r2-domain>` 构建即可无缝切换。

上线后可用 `python3 timeline/scripts/verify-pages-media.py <site-url> --media-host <host> [--flat]` 一键验证全部 3 条音轨的 `HEAD`、`Range 206`、`416` 与完整 SHA-256 校验。

---

## 技术栈与目录结构

- **前端框架**：React 19 + Vite 6
- **地图与图标**：`d3-geo`（中国地图投影）+ `@phosphor-icons/react`
- **动画与音频**：原生 Web Animations API（WAAPI）+ HTML5 Audio / WebVTT 同步字幕

```text
shixu-history/
├── README.md
├── LICENSE
├── vercel.json             # Vercel 零配置静态部署
├── .github/workflows/
│   └── deploy-pages.yml    # GitHub Pages 自动构建与发布
└── timeline/
    ├── index.html
    ├── vite.config.mjs
    ├── public/
    │   ├── audio/          # 讲解音轨（M4A）、字幕（VTT）与同步清单（JSON）
    │   └── data/           # 历史节点、地图拓扑与真题数据（JSON）
    ├── src/
    │   ├── App.jsx         # 播放器主界面与设置弹窗
    │   ├── MapScene.jsx    # d3-geo 地图渲染层
    │   ├── ProcessGraphic.jsx / StoryLayer.jsx / StageCinema.jsx
    │   ├── CausalLesson.jsx / ConfusionCompare.jsx / ExamPractice.jsx
    │   ├── volumes.js      # 上/下篇双卷注册与按需懒加载
    │   └── repo.js         # 开源仓库元信息配置
    └── tests/              # 节点、分镜、音轨时长、主题与路径自动化测试
```

---

## AI 配音声明与资料说明

- **AI 合成配音披露**：完整时间轴讲解音频由本地开源模型（GPT-SoVITS）离线合成，界面标注为“AI 配音”，仅用于辅助学习朗读，**不代表任何参考声音作者本人讲述、授权或背书**。本地语音模型、参考音频与原始工作目录均未纳入本仓库。
- **地图与地理边界说明**：底图基于阿里云 DataV 公开行政区划数据生成，仅作为历史事件发生地点的现代地理示意，**不代表历史时期精确疆域或实际行军路线**。
- **原始资料与版权边界**：本开源仓库**不包含**任何第三方整理 PDF 原文件（`timeline/public/sources/` 与 `*.pdf` 已在 `.gitignore` 中严格排除）。历史内容按公开教材与复习要点结构化整理，仅供个人学习与交流使用。

---

## 开源协议

本项目代码基于 [MIT License](LICENSE) 开源（Copyright © 2026 dongyu-will）。欢迎通过 [Issues](https://github.com/dongyu-will/shixu-history/issues) 与 Pull Request 一起完善历史分镜、纠错校订与交互体验。
