# pi-agent-reach

Native [pi](https://pi.dev) extension wrapping [Agent Reach](https://github.com/Panniantong/agent-reach) CLI as native pi tools.

## What It Does

Gives your pi agent access to Agent Reach's 14 internet channels via 3 native tools:

| Tool | Description |
|------|-------------|
| `reach_search` | Search 8 channels: web (Exa AI), Twitter, Reddit, Bilibili, 小红书, LinkedIn, GitHub, V2EX |
| `reach_read` | Read any URL — auto-detects platform (YouTube/Bilibili subtitles, social posts, RSS, web via Jina Reader) |
| `reach_status` | Doctor check — shows all channels, active backends, health status |

Plus 2 slash commands: `/reach-status` and `/reach-setup`.

## Installation

```bash
# Install from npm (listed on https://pi.dev/packages)
pi install npm:@yrfns/pi-agent-reach
```

Or clone manually:

```bash
git clone https://github.com/YrFnS/pi-agent-reach.git ~/.pi/agent/extensions/pi-agent-reach
```

## Setup

Run `/reach-setup` inside pi — it automatically installs everything:

1. `pip install agent-reach` — Agent Reach CLI
2. `agent-reach install --channels=all` — all upstream CLIs (twitter-cli, bili-cli, opencli, etc.)
3. `npm install -g mcporter` + Exa MCP config — semantic web search
4. `pipx install rdt-cli` — Reddit backend
5. `ffmpeg` — podcast transcription support
6. yt-dlp JS runtime config

No manual steps needed for 6 out of 12 channels.

### Browser Cookies (Twitter, Reddit, 小红书, LinkedIn)

These platforms require browser authentication. On **macOS/Linux**, Agent Reach auto-extracts cookies from your default browser — no setup needed.

On **Windows**, browser cookie databases are encrypted and locked by the OS. To use these channels:

1. Log into x.com / reddit.com / xiaohongshu.com / linkedin.com in your browser
2. Set environment variables with your cookie values:

   ```bash
   setx TWITTER_AUTH_TOKEN "your_auth_token"
   setx TWITTER_CT0 "your_ct0"
   ```

3. Get cookie values from: Browser → F12 → Application → Cookies → x.com

## Usage

Once installed, the agent automatically has access to `reach_search`, `reach_read`, and `reach_status` tools.

### Search Examples

```
"Search Twitter for discussions about AI agents"
"Search 小红书 for restaurant recommendations"
"Search Bilibili for Python tutorials"
"Reddit search for Rust vs Go"
```

### Read Examples

```
"Read this link: https://example.com/article"
"What's this YouTube video about: https://youtube.com/watch?v=xxx"
"Read this B站 video: https://bilibili.com/video/BVxxx"
"Read this tweet: https://twitter.com/user/status/xxx"
```

### Status

```
"Check if Agent Reach is working"
"Run /reach-status"
```

## Tested Channels

| Channel | Status | Notes |
|---------|--------|-------|
| Web (Jina Reader) | ✅ | Works out of the box |
| YouTube | ✅ | Subtitles via yt-dlp |
| GitHub | ✅ | Search via gh CLI |
| Reddit | ✅ | Search via OpenCLI |
| Bilibili | ✅ | Search via bili-cli |
| RSS | ✅ | Via feedparser |
| V2EX | ⚠️ | API timeout on some networks |
| Twitter/X | ⚠️ | Needs browser cookies (Windows) |
| 小红书 | ⚠️ | Needs browser cookies (Windows) |
| LinkedIn | ⚠️ | Needs browser cookies + MCP fix |
| Exa Search | ⚠️ | mcporter hangs on Windows |

**6 channels work out of the box. 7 need browser cookies (Windows) or have upstream CLI issues.**

## Skill

The extension includes the original Agent Reach `SKILL.md` and all reference docs (`references/search.md`, `references/social.md`, `references/web.md`, `references/video.md`, `references/dev.md`, `references/career.md`) so the agent knows exactly how to route queries across platforms and backends.

## Architecture

- **Extension** (`index.ts`): Registers 3 tools + 2 commands via `pi.registerTool()` and `pi.registerCommand()`
- **Tools** call Agent Reach's upstream CLIs via `pi.exec()` — twitter-cli, bili-cli, opencli, rdt-cli, yt-dlp, mcporter, gh CLI, curl+Jina
- **Auto-fallback**: If a platform-specific backend fails, falls back to web search via Jina Reader
- **Output truncation**: 200 lines / 50KB default, expandable in TUI
- **Session integration**: Shows Agent Reach version in footer status bar on startup
- **Timeouts**: All search/read commands have timeouts to prevent hanging

## Requirements

- [pi](https://pi.dev) coding agent
- [Agent Reach CLI](https://github.com/Panniantong/agent-reach) (Python)
- Individual upstream tools (installed by `/reach-setup`): `mcporter`, `twitter-cli`, `bili-cli`, `opencli`, `rdt-cli`, `yt-dlp`, `gh`, `ffmpeg`

## License

MIT
