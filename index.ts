/**
 * pi-agent-reach — Native pi extension wrapping Agent Reach CLI
 *
 * Gives pi agents access to Agent Reach's 14 internet channels:
 * Web, YouTube, RSS, Exa Search, GitHub, Twitter, Bilibili, Reddit,
 * 小红书, LinkedIn, V2EX, 雪球, 小宇宙 Podcast
 *
 * Install Agent Reach first:
 *   pip install https://github.com/Panniantong/agent-reach/archive/main.zip
 *   agent-reach install --env=auto
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

// ── types ──────────────────────────────────────────────────────────────────

interface DoctorEntry {
	status: "ok" | "warn" | "error" | "disabled";
	backend?: string;
	message?: string;
}

interface DoctorResult {
	[platform: string]: DoctorEntry;
}

// ── extension ────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	// ── helpers (capture pi from closure) ──────────────────────────────────────

	function escapeShellArg(s: string): string {
		return s.replace(/'/g, "'\\''");
	}

	async function runReach(
		args: string[],
		signal?: AbortSignal,
		timeout = 30_000,
	): Promise<{ stdout: string; stderr: string; code: number }> {
		// agent-reach doctor can hang if OpenCLI waits for browser — use shorter default
		const effectiveTimeout = args[0] === "doctor" ? 8_000 : timeout;
		return pi.exec("agent-reach", args, {
			signal,
			timeout: effectiveTimeout,
		}) as Promise<{
			stdout: string;
			stderr: string;
			code: number;
		}>;
	}

	async function execCmd(
		cmd: string,
		args: string[],
		signal?: AbortSignal,
		timeout = 30_000,
	): Promise<string> {
		const result = await pi.exec(cmd, args, { signal, timeout });
		const r = result as unknown as { stdout: string; code: number };
		return r.stdout ?? "";
	}

	function truncate(text: string, maxLines = 200, maxBytes = 50_000): string {
		if (!text) return "";
		const lines = text.split("\n");
		let out = text;
		if (lines.length > maxLines) {
			out = lines.slice(0, maxLines).join("\n");
			out += `\n... [truncated: ${lines.length} total lines]`;
		}
		if (Buffer.byteLength(out, "utf8") > maxBytes) {
			out = out.slice(0, maxBytes) + "\n... [truncated]";
		}
		return out;
	}

	// ── reach_search ───────────────────────────────────────────────────────────

	pi.registerTool({
		name: "reach_search",
		label: "Reach Search",
		description:
			"Search the internet via Agent Reach. Supports: web (Exa AI), Twitter, Reddit, Bilibili, xiaohongshu, LinkedIn, GitHub, V2EX. Auto-falls back across backends. Use for research, social media search, finding discussions on any platform.",
		promptSnippet:
			"Search the internet across 14 platforms — web, social, code, video",
		promptGuidelines: [
			"Use reach_search when the user wants to search or research anything on the internet.",
			"Use reach_search for platform-specific search: Twitter, Reddit, Bilibili, xiaohongshu, LinkedIn, GitHub.",
		],
		parameters: Type.Object({
			query: Type.String({ description: "Search query" }),
			channel: StringEnum([
				"web",
				"twitter",
				"reddit",
				"bilibili",
				"xiaohongshu",
				"linkedin",
				"github",
				"v2ex",
			] as const),
			numResults: Type.Optional(
				Type.Number({
					description: "Number of results (default: 5)",
					default: 5,
				}),
			),
		}),

		async execute(_id, params, signal, onUpdate) {
			const query = params.query as string;
			const channel = params.channel as string;
			const num = (params.numResults as number) || 5;
			const safeQ = escapeShellArg(query);

			let stdout: string;
			let label: string;

			try {
				switch (channel) {
					case "web":
						onUpdate?.({
							content: [
								{
									type: "text",
									text: `Searching web for "${query}" via Exa...`,
								},
							],
						});
						stdout = await execCmd(
							"mcporter",
							[
								"call",
								`exa.web_search_exa(query: "${safeQ}", numResults: ${num})`,
							],
							signal,
						);
						label = "Exa";
						break;

					case "twitter":
						onUpdate?.({
							content: [
								{ type: "text", text: `Searching Twitter for "${query}"...` },
							],
						});
						stdout = await execCmd(
							"twitter",
							["search", query, "-n", String(num)],
							signal,
						);
						label = "Twitter";
						break;

					case "reddit": {
						onUpdate?.({
							content: [
								{ type: "text", text: `Searching Reddit for "${query}"...` },
							],
						});
						try {
							stdout = await execCmd(
								"opencli",
								["reddit", "search", query, "-f", "yaml"],
								signal,
							);
							label = "Reddit (OpenCLI)";
						} catch {
							stdout = await execCmd(
								"rdt",
								["search", query, "--limit", String(num)],
								signal,
							);
							label = "Reddit (rdt-cli)";
						}
						break;
					}

					case "bilibili":
						onUpdate?.({
							content: [
								{ type: "text", text: `Searching Bilibili for "${query}"...` },
							],
						});
						stdout = await execCmd(
							"bili",
							["search", query, "--type", "video", "-n", String(num)],
							signal,
						);
						label = "Bilibili";
						break;

					case "xiaohongshu":
						onUpdate?.({
							content: [
								{
									type: "text",
									text: `Searching xiaohongshu for "${query}"...`,
								},
							],
						});
						stdout = await execCmd(
							"opencli",
							["xiaohongshu", "search", query, "-f", "yaml"],
							signal,
						);
						label = "xiaohongshu";
						break;

					case "linkedin":
						onUpdate?.({
							content: [
								{ type: "text", text: `Searching LinkedIn for "${query}"...` },
							],
						});
						stdout = await execCmd(
							"mcporter",
							[
								"call",
								`linkedin.search_people(keyword: "${safeQ}", limit: ${num})`,
							],
							signal,
						);
						label = "LinkedIn";
						break;

					case "github":
						onUpdate?.({
							content: [
								{ type: "text", text: `Searching GitHub for "${query}"...` },
							],
						});
						stdout = await execCmd(
							"gh",
							[
								"search",
								"repos",
								query,
								"--sort",
								"stars",
								"--limit",
								String(num),
							],
							signal,
						);
						label = "GitHub";
						break;

					case "v2ex":
						onUpdate?.({
							content: [{ type: "text", text: `Fetching V2EX hot topics...` }],
						});
						stdout = await execCmd(
							"curl",
							[
								"-s",
								"https://www.v2ex.com/api/topics/hot.json",
								"-H",
								"User-Agent: agent-reach/1.0",
							],
							signal,
						);
						label = "V2EX";
						break;

					default:
						throw new Error(`Unknown channel: ${channel}`);
				}
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				onUpdate?.({
					content: [
						{
							type: "text",
							text: `${channel} search failed (${msg}), falling back to Exa...`,
						},
					],
				});
				stdout = await execCmd(
					"mcporter",
					[
						"call",
						`exa.web_search_exa(query: "${safeQ} ${channel}", numResults: ${num})`,
					],
					signal,
				);
				label = `Exa (${channel} fallback)`;
			}

			const truncated = truncate(stdout);
			return {
				content: [{ type: "text", text: truncated }],
				details: { channel, query, label, rawLength: stdout.length },
			};
		},

		renderCall(args, theme) {
			const tag = args.channel ? theme.fg("accent", `[${args.channel}] `) : "";
			const q = theme.fg("muted", String(args.query));
			const n = args.numResults ? theme.fg("dim", ` (${args.numResults})`) : "";
			return new Text(
				theme.fg("toolTitle", theme.bold("reach_search ")) + tag + q + n,
				0,
				0,
			);
		},

		renderResult(result, { expanded }, theme) {
			const det = result.details as
				| { channel?: string; label?: string; rawLength?: number }
				| undefined;
			const tag = det?.channel ? theme.fg("accent", `[${det.channel}] `) : "";
			const via = det?.label ? theme.fg("dim", `via ${det.label}\n`) : "";
			const first = result.content[0];
			const text = first?.type === "text" ? first.text : "";
			const shown = expanded ? text : text.split("\n").slice(0, 15).join("\n");
			const more = text.split("\n").length > 15 && !expanded;
			return new Text(
				tag +
					via +
					shown +
					(more ? theme.fg("dim", "\n... (expand for more)") : ""),
				0,
				0,
			);
		},
	});

	// ── reach_read ─────────────────────────────────────────────────────────────

	pi.registerTool({
		name: "reach_read",
		label: "Reach Read",
		description:
			"Read/extract content from any URL. Supports: web pages (Jina Reader), YouTube transcripts, Bilibili subtitles, xiaohongshu posts, Reddit posts, Twitter tweets, RSS feeds. Auto-detects platform from URL.",
		promptSnippet:
			"Read and extract content from any URL — web, social media, video, RSS",
		promptGuidelines: [
			"Use reach_read when the user shares a link and wants to read/extract its content.",
			"Use reach_read for: web pages, YouTube/Bilibili videos (subtitles), xiaohongshu/Reddit/Twitter posts, RSS feeds.",
		],
		parameters: Type.Object({
			url: Type.String({ description: "URL to read/extract content from" }),
		}),

		async execute(_id, params, signal, onUpdate) {
			const url = params.url as string;
			let stdout: string;
			let method: string;

			const isYT = /youtube\.com|youtu\.be/.test(url);
			const isBL = /bilibili\.com|bv[a-z0-9]+/i.test(url);
			const isTW = /twitter\.com|x\.com/.test(url);
			const isRD = /reddit\.com|redd\.it/.test(url);
			const isXHS = /xiaohongshu\.com|xhslink\.com/.test(url);
			const isRSS =
				/^https?:\/\/.+\/(rss|feed|atom)/i.test(url) || url.endsWith(".xml");

			try {
				if (isYT) {
					onUpdate?.({
						content: [
							{ type: "text", text: `Extracting YouTube subtitles...` },
						],
					});
					stdout = await execCmd(
						"yt-dlp",
						["--write-sub", "--skip-download", "-o", "/tmp/%(id)s", url],
						signal,
						60_000,
					);
					method = "yt-dlp";
				} else if (isBL) {
					onUpdate?.({
						content: [{ type: "text", text: `Extracting Bilibili content...` }],
					});
					try {
						stdout = await execCmd(
							"opencli",
							["bilibili", "subtitle", url, "-f", "yaml"],
							signal,
						);
						method = "OpenCLI bilibili";
					} catch {
						stdout = await execCmd(
							"yt-dlp",
							["--dump-json", "--no-download", url],
							signal,
							60_000,
						);
						method = "yt-dlp";
					}
				} else if (isXHS) {
					onUpdate?.({
						content: [{ type: "text", text: `Reading xiaohongshu post...` }],
					});
					stdout = await execCmd(
						"opencli",
						["xiaohongshu", "note", url, "-f", "yaml"],
						signal,
					);
					method = "OpenCLI xhs";
				} else if (isTW) {
					onUpdate?.({ content: [{ type: "text", text: `Reading tweet...` }] });
					stdout = await execCmd("twitter", ["tweet", url], signal);
					method = "twitter-cli";
				} else if (isRD) {
					onUpdate?.({
						content: [{ type: "text", text: `Reading Reddit post...` }],
					});
					stdout = await execCmd("rdt", ["read", url], signal);
					method = "rdt-cli";
				} else if (isRSS) {
					onUpdate?.({
						content: [{ type: "text", text: `Parsing RSS feed...` }],
					});
					stdout = await execCmd(
						"python3",
						[
							"-c",
							"import feedparser, json; " +
								`f = feedparser.parse("${escapeShellArg(url)}"); ` +
								'entries = [{"title": e.get("title",""), "link": e.get("link",""), "summary": e.get("summary","")} for e in f.entries[:10]]; ' +
								"print(json.dumps(entries, ensure_ascii=False, indent=2))",
						],
						signal,
					);
					method = "feedparser";
				} else {
					onUpdate?.({
						content: [
							{ type: "text", text: `Reading web page via Jina Reader...` },
						],
					});
					stdout = await execCmd(
						"curl",
						["-s", `https://r.jina.ai/${url}`],
						signal,
					);
					method = "Jina Reader";
				}
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				onUpdate?.({
					content: [
						{
							type: "text",
							text: `Primary reader failed (${msg}), trying Jina Reader...`,
						},
					],
				});
				stdout = await execCmd(
					"curl",
					["-s", `https://r.jina.ai/${url}`],
					signal,
				);
				method = "Jina Reader (fallback)";
			}

			return {
				content: [{ type: "text", text: truncate(stdout, 300) }],
				details: { url, method, rawLength: stdout.length },
			};
		},

		renderCall(args, theme) {
			const url = String(args.url);
			const short = url.length > 60 ? url.slice(0, 57) + "..." : url;
			return new Text(
				theme.fg("toolTitle", theme.bold("reach_read ")) +
					theme.fg("accent", short),
				0,
				0,
			);
		},

		renderResult(result, { expanded }, theme) {
			const det = result.details as
				| { method?: string; rawLength?: number }
				| undefined;
			const via = det?.method ? theme.fg("dim", `via ${det.method}\n`) : "";
			const first = result.content[0];
			const text = first?.type === "text" ? first.text : "";
			const shown = expanded ? text : text.split("\n").slice(0, 20).join("\n");
			const more = text.split("\n").length > 20 && !expanded;
			return new Text(
				via + shown + (more ? theme.fg("dim", "\n... (expand for more)") : ""),
				0,
				0,
			);
		},
	});

	// ── reach_status ───────────────────────────────────────────────────────────

	pi.registerTool({
		name: "reach_status",
		label: "Reach Status",
		description:
			"Run Agent Reach doctor to check which channels/platforms are active and healthy. Shows installed backends, auth status, and any issues.",
		parameters: Type.Object({}),
		promptSnippet: "Check Agent Reach channel health and status",

		async execute(_id, _params, signal, onUpdate) {
			onUpdate?.({
				content: [{ type: "text", text: "Checking Agent Reach channels..." }],
			});

			// Check which upstream CLIs are installed using "where" (fast, no hang)
			const checks: [string, string][] = [
				["Web (Jina)", "curl"],
				["Web (Exa)", "mcporter"],
				["GitHub", "gh"],
				["YouTube", "yt-dlp"],
				["Twitter", "twitter"],
				["Bilibili", "bili"],
				["Reddit (OpenCLI)", "opencli"],
				["Reddit (rdt)", "rdt"],
				["小红书 (OpenCLI)", "opencli"],
				["LinkedIn", "mcporter"],
				["RSS", "python3"],
				["V2EX", "curl"],
			];

			const lines: string[] = [];
			const details: Record<string, unknown> = {};

			for (const [name, cmd] of checks) {
				try {
					const res = await execCmd(
						"cmd",
						["/c", `where ${cmd} 2>nul`],
						signal,
						3_000,
					);
					const ok = res.trim().length > 0;
					lines.push(`  ${ok ? "✅" : "❌"} ${name} (${cmd})`);
					details[name] = { status: ok ? "ok" : "missing", backend: cmd };
				} catch {
					lines.push(`  ❌ ${name} (${cmd})`);
					details[name] = { status: "missing", backend: cmd };
				}
			}

			const output = `Agent Reach Status\n${"─".repeat(40)}\n${lines.join("\n")}`;
			return {
				content: [{ type: "text", text: output }],
				details,
			};
		},

		renderCall(_args, theme) {
			return new Text(theme.fg("toolTitle", theme.bold("reach_status")), 0, 0);
		},

		renderResult(result, _opts, _theme) {
			const first = result.content[0];
			return new Text(first?.type === "text" ? first.text : "", 0, 0);
		},
	});

	// ── /reach-status command ──────────────────────────────────────────────────

	pi.registerCommand("reach-status", {
		description: "Show Agent Reach channel health and status",
		handler: async (_args, ctx) => {
			try {
				const res = await runReach(["doctor", "--json"], undefined, 15_000);
				let doctor: DoctorResult;
				try {
					doctor = JSON.parse(res.stdout) as DoctorResult;
				} catch {
					ctx.ui.notify(`Doctor: ${res.stdout.slice(0, 200)}`, "info");
					return;
				}
				const values = Object.entries(doctor);
				const ok = values.filter(([, v]) => v.status === "ok").length;
				const parts = values.map(([p, info]) => {
					const i =
						info.status === "ok" ? "✅" : info.status === "warn" ? "⚠️" : "❌";
					return `${i} ${p}${info.backend ? ` (${info.backend})` : ""}`;
				});
				ctx.ui.notify(
					`Agent Reach: ${ok}/${values.length} OK\n${parts.join("\n")}`,
					"info",
				);
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				ctx.ui.notify(`Agent Reach not found: ${msg}`, "error");
			}
		},
	});

	// ── /reach-setup command ───────────────────────────────────────────────────

	pi.registerCommand("reach-setup", {
		description: "Install Agent Reach CLI and all upstream tools automatically",
		handler: async (_args, ctx) => {
			ctx.ui.notify("Installing Agent Reach CLI + all channels...", "info");
			try {
				// Step 1: Install Agent Reach Python package
				ctx.ui.notify("Step 1/4: pip install agent-reach...", "info");
				await pi.exec("pip", [
					"install",
					"https://github.com/Panniantong/agent-reach/archive/main.zip",
				]);

				// Step 2: Install all channels (auto-detects OS, installs CLIs)
				ctx.ui.notify(
					"Step 2/4: agent-reach install --channels=all...",
					"info",
				);
				await pi.exec("agent-reach", ["install", "--channels=all"]);

				// Step 3: Install mcporter (Exa search backend)
				ctx.ui.notify(
					"Step 3/4: Installing mcporter (search backend)...",
					"info",
				);
				try {
					await pi.exec("npm", ["install", "-g", "mcporter"]);
					await pi.exec("mcporter", [
						"config",
						"add",
						"exa",
						"https://mcp.exa.ai/mcp",
					]);
				} catch {
					ctx.ui.notify(
						"mcporter install failed — Exa search unavailable",
						"warning",
					);
				}

				// Step 4: Install rdt-cli (Reddit backend)
				ctx.ui.notify(
					"Step 4/4: Installing rdt-cli (Reddit backend)...",
					"info",
				);
				try {
					await pi.exec("pip", ["install", "--user", "pipx"]);
					await pi.exec("python", [
						"-m",
						"pipx",
						"install",
						"git+https://github.com/public-clis/rdt-cli.git@5e4fb3720d5c174e976cd425ccc3b879d52cac66",
					]);
				} catch {
					ctx.ui.notify(
						"rdt-cli install failed — Reddit will use OpenCLI fallback",
						"warning",
					);
				}

				// Step 5: Install ffmpeg (for podcast transcription)
				ctx.ui.notify("Step 5/5: Installing ffmpeg...", "info");
				try {
					await pi.exec("winget", ["install", "ffmpeg"]);
				} catch {
					try {
						await pi.exec("choco", ["install", "ffmpeg", "-y"]);
					} catch {
						ctx.ui.notify(
							"ffmpeg not installed — podcast transcription unavailable",
							"warning",
						);
					}
				}

				// Configure yt-dlp JS runtime
				try {
					await pi.exec("cmd", [
						"/c",
						'echo --js-runtimes node > "%USERPROFILE%\\AppData\\Roaming\\yt-dlp\\config"',
					]);
				} catch {
					/* ignore */
				}

				ctx.ui.notify(
					"Done! Run /reach-status to see active channels.",
					"info",
				);
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				ctx.ui.notify(`Install failed: ${msg}`, "error");
			}
		},
	});

	// ── session_start ──────────────────────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		try {
			const res = await pi.exec("agent-reach", ["--version"], {
				timeout: 5_000,
			});
			const r = res as unknown as { stdout: string; code: number };
			ctx.ui.setStatus("reach", r.code === 0 ? r.stdout.trim() : "error");
		} catch {
			ctx.ui.setStatus("reach", "not installed");
			ctx.ui.notify(
				"pi-agent-reach: Agent Reach CLI not found. Run /reach-setup to install.",
				"warning",
			);
		}
	});
}
