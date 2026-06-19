# 社交媒体 & 社区

小红书、Twitter/X、B站、V2EX、Reddit。

## 小红书 / XiaoHongShu（多后端）

小红书有三个后端，**先跑 `agent-reach doctor --json` 看 xiaohongshu 的 `active_backend` 是哪个**，再用对应命令组。

### 后端 A：OpenCLI（桌面首选，复用浏览器登录态）

```bash
# 搜索笔记
opencli xiaohongshu search "query" -f yaml

# 读笔记正文+互动数据（用搜索结果里的完整 URL，含 xsec_token）
opencli xiaohongshu note "NOTE_URL" -f yaml

# 评论（支持楼中楼）
opencli xiaohongshu comments NOTE_ID -f yaml

# 首页推荐 feed
opencli xiaohongshu feed -f yaml

# 用户主页公开笔记
opencli xiaohongshu user USER_ID -f yaml
```

> 要求 Chrome 打开且装了 OpenCLI 扩展。报 AUTH_REQUIRED 说明浏览器里没登录小红书，让用户在 Chrome 里登录一次即可。

### 后端 B：xiaohongshu-mcp（服务器场景）

```bash
# 未登录时：先查状态，再取二维码给用户扫
mcporter call 'xiaohongshu.check_login_status()' --timeout 120000
mcporter call 'xiaohongshu.get_login_qrcode()' --timeout 120000

# 搜索
mcporter call 'xiaohongshu.search_feeds(keyword: "query")' --timeout 120000

# 笔记详情+评论（feed_id 和 xsec_token 从搜索结果取）
mcporter call 'xiaohongshu.get_feed_detail(feed_id: "...", xsec_token: "...")' --timeout 120000
```

> 首次调用会自动下载约 150MB 无头浏览器，务必带 `--timeout 120000`。未登录时 search 会挂死，先 check_login_status。

### 后端 C：xhs-cli（存量备选，上游 2026-03 起停更）

```bash
xhs search "query"          # 搜索
xhs read NOTE_ID_OR_URL     # 读笔记（必须用搜索结果中的 URL/ID，不能裸 note_id）
xhs comments NOTE_ID_OR_URL # 评论
xhs hot                     # 热门
xhs feed                    # 推荐
```

> 已知不稳定：`xhs user` / `xhs user-posts` / `xhs favorites` 可能返回 API error（上游停更无人修）。新装用户建议直接走后端 A/B。

### 通用注意事项

> **xsec_token 限制**: 小红书强制 xsec_token 机制，**不能直接用裸 note_id 去读**。正确流程：先搜索/feed 拿结果，再用结果中的完整 URL/ID 去读。三个后端都一样。
>
> **频率控制**: 高频请求（批量搜索、深翻评论）会触发验证码，平台限制无法绕过。每次操作间隔 2-3 秒。
>
> **写操作不支持**: 所有后端均为只读，不支持发帖/评论/点赞。

## Twitter / X（多后端）

### 后端 A：twitter-cli（首选）

```bash
# 搜索推文
twitter search "query" -n 10

# 读单条推文
twitter tweet URL_OR_ID

# 用户时间线
twitter timeline USERNAME -n 20
```

> 需要浏览器 Cookie 认证。确保浏览器已登录 x.com。

### 后端 B：OpenCLI（备选）

```bash
opencli twitter search "query" -f yaml
opencli twitter tweet URL -f yaml
```

## Reddit（多后端，必须登录态）

> ⚠️ Reddit 匿名接口已被全面封锁，官方 API 需人工审批。只剩登录态路线。

### 后端 A：OpenCLI（桌面首选）

```bash
opencli reddit search "query" -f yaml
opencli reddit post POST_URL -f yaml
opencli reddit subreddit SUBREDDIT_NAME -f yaml
```

### 后端 B：rdt-cli（服务器/存量）

```bash
# PyPI 落后，从 GitHub 装（与代码内 _RDT_GIT_SOURCE 同一钉定版本）
pipx install 'git+https://github.com/public-clis/rdt-cli.git@5e4fb3720d5c174e976cd425ccc3b879d52cac66'
rdt login   # 自动提取浏览器 Cookie

rdt search "query" --limit 10
rdt read POST_ID
```

## B站 / Bilibili

```bash
# 搜索视频（bili-cli，无需登录）
bili search "query" --type video -n 5

# 视频详情
bili video BVxxx

# 热门/排行
bili hot -n 10
bili rank -n 10

# 字幕（OpenCLI，需要桌面 Chrome）
opencli bilibili subtitle BVxxx
```

> ⚠️ **不要用 yt-dlp 读 B站**：B站风控已全面 412 拦截 yt-dlp。yt-dlp 只用于 YouTube。

## V2EX

```bash
# 热门话题
curl -s "https://www.v2ex.com/api/topics/hot.json" -H "User-Agent: agent-reach/1.0"

# 节点帖子
curl -s "https://www.v2ex.com/api/topics/show.json?node_name=tech" -H "User-Agent: agent-reach/1.0"

# 帖子详情+回复
curl -s "https://www.v2ex.com/api/topics/show.json?id=123456" -H "User-Agent: agent-reach/1.0"
```
