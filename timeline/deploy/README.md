# 史序自托管与 Pages 媒体分发说明

大多数场景下，直接使用仓库根目录提供的 `vercel.json`（Vercel）或 `.github/workflows/deploy-pages.yml`（GitHub Pages）即可零配置免费托管完整的纯静态产物 `dist/client`（含全部音频、字幕与数据 JSON），无需独立服务器或对象存储。

本目录保留用于以下进阶场景的参考模板：
1. **独立 Linux 服务器自托管**（Nginx + Python 静态/签名服务 + S3 兼容对象存储）；
2. **Cloudflare Pages + 外部媒体源**（通过 `SHIXU_MEDIA_ORIGIN` 将音频跳转至支持原生 `Range` 的 Cloudflare R2 / Nginx 静态源）。

---

## 一、独立服务器自托管（可选）

### 目录结构

- `server.py`：监听 `127.0.0.1:8418`，提供版本化静态资源与受白名单约束的短期 S3 签名跳转（307），不暴露私有配置、模型或目录列表。
- `nginx.conf`：独立 HTTPS 反向代理模板（示例域名 `example.com`），并提供 `/media/` 不可变静态音频直出（原生支持 `HEAD`、`Range`、`206/416`）。
- `shixu-site.service`：systemd 服务单元模板，从 `/etc/shixu-object-storage.env` 读取 S3 环境变量。
- `install.py`：原子发布安装器，按发布清单校验 SHA-256 后切换 `/srv/shixu/current`，失败时自动回滚。

### 打包与安装

在本地构建并生成自包含发布包（仅包含允许发布的静态资源与部署脚本，不包含参考录音或模型）：

```sh
cd timeline
npm run build
npm run test:deploy
node scripts/package-server-release.mjs
```

在目标服务器上配置 `S3_*` 环境变量（`S3_ENDPOINT`、`S3_REGION`、`S3_BUCKET`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`，以及可选的 `SHIXU_HEALTHCHECK_URL`），替换 `nginx.conf` 中的 `example.com` 域名与证书路径后执行：

```sh
python3 /srv/shixu/incoming/<RELEASE_ID>/deploy/install.py \
  --artifact /srv/shixu/incoming/<RELEASE_ID> \
  --nginx-image <NGINX_IMAGE_DIGEST>
```

凭据仅写入服务器 `/etc/shixu-object-storage.env`（权限 `0600`），不进入 Git、命令参数或发布回执。

---

## 二、Cloudflare Pages + 外部媒体源（推荐用于 Cloudflare Pages）

Cloudflare Pages 静态文件层默认忽略 `Range` 请求头（返回 `200` 而非 `206`），会导致 Safari / 移动端无法正常播放或拖拽音频。使用 `build:pages` 可将页面、字幕与数据留在 Pages，并通过 `_redirects` 将 3 条 `.m4a` 音轨 302 分流至支持原生 `Range 206` 的静态源（零 Worker CPU 开销）：

- **Cloudflare R2 / 自有 Nginx（哈希路径，默认 `SHIXU_MEDIA_LAYOUT=hashed`）**：
  ```sh
  cd timeline
  SHIXU_MEDIA_ORIGIN=https://media.example.com/shixu npm run build:pages
  ```
- **开源仓库 jsDelivr CDN（扁平路径，`SHIXU_MEDIA_LAYOUT=flat`，零绑卡）**：
  ```sh
  cd timeline
  SHIXU_MEDIA_ORIGIN="https://cdn.jsdelivr.net/gh/dongyu-will/shixu-history@<commit>/timeline/public/audio" \
  SHIXU_MEDIA_LAYOUT=flat \
  npm run build:pages
  ```

`scripts/prepare-pages-build.mjs` 会输出 `dist/pages`：
- 仅包含运行时所需的 HTML/JS/CSS、JSON 数据、音频清单与 WebVTT 字幕；
- 为活跃音轨生成 `_redirects` 302 规则（`hashed` 模式指向 `${SHIXU_MEDIA_ORIGIN}/<SHA256>/<文件名>`，`flat` 模式指向 `${SHIXU_MEDIA_ORIGIN}/<文件名>`）；
- 自动生成 `_headers`（静态资源与字幕长效缓存）和 `404.html`（防止缺失资源落入默认 SPA 回退）。

部署后可使用 `verify-pages-media.py` 验证全部 3 条音轨的完整哈希、`HEAD` 长度、`Range`（`206` / `416`）与 `If-Range` 行为：

```sh
python3 scripts/verify-pages-media.py https://shixu-history.pages.dev/ --media-host cdn.jsdelivr.net --flat
```
