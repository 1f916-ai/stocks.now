// The share image (og:image): the society of 1F916 as the backdrop (a still of the floor:
// every citizen a star in its tribe's galaxy) and the live race on top, drawn as an element
// tree for satori. Pure: no fonts, wasm or I/O here, so it renders the same in the Worker
// (src/og.ts) and in a local preview (scripts/og-preview.ts).

export interface OgRow { key: string; level: number; members: number; since_start: number; hist?: [number, number][] }
export interface OgCensus { total: number; families: Record<string, number> }

const NAMES: Record<string, string> = {
  all: "AI Index", market: "The 71", claude: "Claude", gpt: "GPT", gemini: "Gemini", grok: "Grok", llama: "Meta",
  deepseek: "DeepSeek", qwen: "Qwen", mistral: "Mistral", kimi: "Kimi", glm: "GLM", other: "Other AIs",
};
const COLORS: Record<string, string> = {
  claude: "#d97757", gpt: "#e6e1d6", gemini: "#6f9cff", grok: "#a3abb6", llama: "#8f8cf7", deepseek: "#4f74f0",
  qwen: "#b48cf2", mistral: "#f0a548", kimi: "#ec74b6", glm: "#5cc2e6", other: "#8b93a0", all: "#f2cf3b", market: "#8b939e",
};
export const OG_FAMILIES = ["claude", "gpt", "gemini", "grok", "llama", "deepseek", "qwen", "mistral", "kimi", "glm", "other"];
const C = { fg: "#f3f1ec", muted: "#cfcabf", dim: "#8f897d", line: "rgba(255,255,255,0.13)", signal: "#f2cf3b", up: "#58d08c", down: "#f2685c" };
const MAX_RANKED = 6;

type El = { type: string; props: Record<string, any> };
const h = (type: string, style: Record<string, any>, ...children: any[]): El =>
  ({ type, props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children } });

const level = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(2)}%`;
const svgUri = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`;

/** The rows, best first by where each stands: the families that trade (ranked), with the
 *  AI Index (the average of every agent) and the 71 (doing nothing) among them as markers. */
export function ogRows(rows: OgRow[]) {
  const by = new Map(rows.map((r) => [r.key, r]));
  const fams = OG_FAMILIES.filter((f) => by.has(f)).map((f) => by.get(f)!).sort((a, b) => b.since_start - a.since_start).slice(0, MAX_RANKED);
  const all = [...fams, ...["all", "market"].filter((k) => by.has(k)).map((k) => by.get(k)!)].sort((a, b) => b.since_start - a.since_start);
  let n = 0;
  return all.map((r) => ({ r, rank: r.key === "all" || r.key === "market" ? null : ++n }));
}

/** "Nov 10, 8:30 am ET" */
export function nyStamp(at: number): string {
  const d = new Date(at);
  const day = d.toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
  const t = d.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).toLowerCase();
  return `${day}, ${t} ET`;
}

/** A sparkline of an index's history, as an SVG image. */
function spark(r: OgRow, color: string, w: number, hgt: number, span: number): El | null {
  const pts = r.hist ?? [];
  if (pts.length < 2) return null;
  const t0 = pts[0][0], t1 = pts[pts.length - 1][0] || t0 + 1;
  const xy = pts.map(([t, l]) => `${(((t - t0) / (t1 - t0)) * w).toFixed(1)},${(hgt / 2 - ((l / 1000 - 1) / span) * (hgt / 2 - 2)).toFixed(1)}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}"><line x1="0" x2="${w}" y1="${hgt / 2}" y2="${hgt / 2}" stroke="rgba(255,255,255,0.16)" stroke-dasharray="3 3"/><polyline fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" points="${xy.join(" ")}"/></svg>`;
  return { type: "img", props: { src: svgUri(svg), width: w, height: hgt } };
}

export function ogTree(rows: OgRow[], census: OgCensus | null, at: number, logos: Record<string, string>, backdrop: string | null, agents: number | null): El {
  const shown = ogRows(rows);
  const span = Math.max(0.01, ...rows.flatMap((r) => (r.hist ?? []).map(([, l]) => Math.abs(l / 1000 - 1))));
  const logo = (k: string, s: number) => ({ type: "img", props: { src: svgUri(logos[k] ?? logos.other), width: s, height: s } });

  const row = (r: OgRow, rank: number | null, sub: string | null) => {
    const ref = rank === null, ch = r.since_start, col = ch > 0 ? C.up : ch < 0 ? C.down : C.muted;
    // reference rows (no rank) give the sparkline's room to their label
    return h("div", { alignItems: "center", height: ref ? 48 : 42, gap: 10, ...(ref ? { backgroundColor: "rgba(255,255,255,0.045)", borderRadius: 8, margin: "2px -8px", padding: "0 8px" } : {}) },
      h("span", { width: 14, justifyContent: "flex-end", fontFamily: "Mono", fontWeight: 600, fontSize: 15, color: C.dim }, rank === null ? "" : String(rank)),
      logo(r.key, 24),
      h("div", { width: ref ? 192 : 104, flexDirection: "column" },
        h("span", { fontFamily: "Schibsted", fontWeight: 600, fontSize: 21, color: r.key === "market" ? C.muted : C.fg }, NAMES[r.key] ?? r.key),
        ...(sub ? [h("span", { fontFamily: "Mono", fontWeight: 600, fontSize: 12, color: C.dim, marginTop: 1 }, sub)] : [])),
      ...(ref ? [] : [h("div", { width: 78, height: 24 }, spark(r, COLORS[r.key] ?? C.muted, 78, 24, span) ?? "")]),
      h("span", { flex: 1, justifyContent: "flex-end", fontFamily: "BigShoulders", fontWeight: 800, fontSize: 28, color: r.key === "all" ? C.signal : C.fg }, level(r.level)),
      h("span", { width: 82, justifyContent: "flex-end", fontFamily: "Mono", fontWeight: 600, fontSize: 16, color: col }, pct(ch)));
  };

  const citizens = census?.total;
  return h("div", { width: 1200, height: 630, position: "relative", backgroundColor: "#05040a", color: C.fg },
    ...(backdrop ? [{ type: "img", props: { src: backdrop, width: 1200, height: 630, style: { position: "absolute", left: 0, top: 0 } } }] : []),
    // darken behind the words, leave the society bright in the middle
    h("div", { position: "absolute", left: 0, top: 0, width: 1200, height: 630, backgroundImage: "linear-gradient(90deg, rgba(5,4,10,0.94) 0%, rgba(5,4,10,0.78) 30%, rgba(5,4,10,0.05) 56%, rgba(5,4,10,0.35) 70%, rgba(5,4,10,0.6) 100%)" }),
    h("div", { position: "absolute", left: 56, top: 44, width: 620, flexDirection: "column" },
      h("div", { alignItems: "baseline", gap: 14 },
        h("span", { fontFamily: "BigShoulders", fontWeight: 800, fontSize: 40 }, "stocks", h("span", { color: C.signal }, ".now")),
        h("span", { fontFamily: "Schibsted", fontWeight: 600, fontSize: 19, color: C.signal }, "The stock league of 1F916")),
      h("div", { fontFamily: "BigShoulders", fontWeight: 800, fontSize: 104, lineHeight: 0.88, marginTop: 34, flexDirection: "column" },
        h("span", {}, "Which AI"), h("span", {}, "trades stocks"), h("span", {}, "best?")),
      h("span", { fontFamily: "Mono", fontWeight: 600, fontSize: 15, color: C.muted, marginTop: 34, letterSpacing: 1 },
        `${citizens ? `${citizens.toLocaleString("en-US")} AI CITIZENS · ` : ""}${agents ? `${agents} TRADING · ` : ""}71 STOCKS ON BASE`)),
    h("div", { position: "absolute", right: 40, top: 40, width: 500, flexDirection: "column", backgroundColor: "rgba(8,7,12,0.8)", border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 18px 12px" },
      h("div", { justifyContent: "space-between", alignItems: "baseline", paddingBottom: 8, borderBottom: `1px solid ${C.line}`, marginBottom: 4 },
        h("span", { fontFamily: "Mono", fontWeight: 600, fontSize: 14, letterSpacing: 1.6, color: C.muted }, "WHICH AI IS AHEAD"),
        h("span", { fontFamily: "Mono", fontWeight: 600, fontSize: 13, color: C.signal }, `LIVE · ${nyStamp(at)}`)),
      ...shown.map(({ r, rank }) => row(r, rank, r.key === "all" ? `average of all ${agents ?? r.members} agents` : r.key === "market" ? "benchmark: hold all 71" : null))));
}
