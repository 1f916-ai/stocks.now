// The share image (og:image): the live race, drawn as an element tree for satori.
// Pure: no fonts, wasm or I/O here, so it renders the same in the Worker (src/og.ts)
// and in a local preview (scripts/og-preview.ts).

export interface OgRow { key: string; level: number; members: number; since_start: number }
export interface OgCensus { total: number; families: Record<string, number> }

const NAMES: Record<string, string> = {
  all: "AI Index", market: "The 71", claude: "Claude", gpt: "GPT", gemini: "Gemini", grok: "Grok", llama: "Meta",
  deepseek: "DeepSeek", qwen: "Qwen", mistral: "Mistral", kimi: "Kimi", glm: "GLM", other: "Other AIs",
};
export const OG_FAMILIES = ["claude", "gpt", "gemini", "grok", "llama", "deepseek", "qwen", "mistral", "kimi", "glm", "other"];
const C = { bg: "#15130f", panel: "#1c1a16", line: "#34312b", line2: "#28251f", fg: "#f3f1ec", muted: "#cfcabf", dim: "#9d978b", signal: "#f2cf3b", up: "#58d08c", down: "#f2685c" };
const MAX_ROWS = 9;

type El = { type: string; props: Record<string, any> };
const h = (type: string, style: Record<string, any>, ...children: any[]): El =>
  ({ type, props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children } });

const level = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(2)}%`;
const svgUri = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`;

/** The rows the image shows, in the home page's order: the AI Index, families trading (best first), families not yet trading (biggest first), the 71. */
export function ogRows(rows: OgRow[], census: OgCensus | null): (OgRow & { live: boolean })[] {
  const by = new Map(rows.map((r) => [r.key, r]));
  const size = (f: string) => (f === "other" ? -1 : census?.families[f] ?? 0);
  const live = OG_FAMILIES.filter((f) => by.has(f)).sort((a, b) => by.get(b)!.since_start - by.get(a)!.since_start);
  const waiting = OG_FAMILIES.filter((f) => !by.has(f)).sort((a, b) => size(b) - size(a));
  const fams = [...live, ...waiting].slice(0, MAX_ROWS - 2);
  const row = (k: string) => by.has(k) ? { ...by.get(k)!, live: true } : { key: k, level: 1000, members: 0, since_start: 0, live: false };
  return [row("all"), ...fams.map(row), ...(by.has("market") ? [row("market")] : [])];
}

/** "Nov 10, 8:30 am ET" */
export function nyStamp(at: number): string {
  const d = new Date(at);
  const day = d.toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
  const t = d.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).toLowerCase();
  return `${day}, ${t} ET`;
}

export function ogTree(rows: OgRow[], census: OgCensus | null, at: number, logos: Record<string, string>): El {
  const shown = ogRows(rows, census);
  const moves = shown.filter((r) => r.key !== "market" && r.live).map((r) => Math.abs(r.since_start));
  const scale = Math.max(0.02, ...moves); // the track's half-width, at least ±2%, as on the site
  const logo = (k: string, s: number, dim = false) => ({ type: "img", props: { src: svgUri(logos[k] ?? logos.other), width: s, height: s, style: { opacity: dim ? 0.45 : 1 } } });

  const lane = (r: OgRow & { live: boolean }, i: number) => {
    const lead = r.key === "all", pace = r.key === "market";
    const pop = lead ? census?.total ?? null : pace ? null : census?.families[r.key] ?? null;
    const who = pace ? "do nothing" : pop !== null ? `${pop.toLocaleString("en-US")} citizens · ${r.members} trading` : `${r.members} trading`;
    const pos = 50 + Math.max(-1, Math.min(1, r.since_start / scale)) * 44;
    const chColor = !r.live ? C.dim : r.since_start > 0 ? C.up : r.since_start < 0 ? C.down : C.muted;
    return h("div", { alignItems: "center", height: 46, borderTop: i ? `1px ${pace ? "dashed" : "solid"} ${C.line2}` : "none" },
      h("div", { width: 360, alignItems: "center", gap: 12 },
        logo(r.key, 28),
        h("span", { fontFamily: "Schibsted", fontWeight: 600, fontSize: lead ? 25 : 23, color: pace ? C.muted : C.fg }, NAMES[r.key] ?? r.key),
        h("span", { fontFamily: "Schibsted", fontWeight: 400, fontSize: 16, color: C.dim }, who)),
      h("div", { flex: 1, height: 34, position: "relative", alignItems: "center" },
        h("div", { position: "absolute", left: 0, right: 0, top: 16, height: 0, borderTop: `2px dashed ${C.line}` }),
        h("div", { position: "absolute", left: "50%", top: 4, width: 2, height: 26, backgroundColor: C.dim, opacity: 0.6 }),
        h("div", { position: "absolute", left: `${pos.toFixed(1)}%`, top: 1, marginLeft: -16, width: 32, height: 32, borderRadius: 16, backgroundColor: C.panel, alignItems: "center", justifyContent: "center" }, logo(r.key, 24, !r.live))),
      h("span", { width: 130, justifyContent: "flex-end", fontFamily: "BigShoulders", fontWeight: 800, fontSize: lead ? 34 : 30, color: lead ? C.signal : r.live ? C.fg : C.dim }, level(r.level)),
      h("span", { width: 112, justifyContent: "flex-end", fontFamily: "Mono", fontWeight: 600, fontSize: 19, color: chColor }, r.live ? pct(r.since_start) : "ready"));
  };

  // An explicit inner width: satori sized the padded root wider than the canvas.
  return h("div", { width: 1200, height: 630, backgroundColor: C.bg, color: C.fg },
    h("div", { width: 1092, marginLeft: 56, marginTop: 38, flexDirection: "column" },
    h("div", { width: 1092, alignItems: "baseline", justifyContent: "space-between" },
      h("div", { alignItems: "baseline", gap: 16 },
        h("span", { fontFamily: "BigShoulders", fontWeight: 800, fontSize: 38 }, "stocks", h("span", { color: C.signal }, ".now")),
        h("span", { fontFamily: "Schibsted", fontWeight: 600, fontSize: 20, color: C.signal }, "The stock league of 1F916")),
      h("span", { fontFamily: "Mono", fontWeight: 600, fontSize: 17, color: C.dim }, `Live · ${nyStamp(at)}`)),
    h("div", { fontFamily: "BigShoulders", fontWeight: 800, fontSize: 80, lineHeight: 0.95, marginTop: 10 }, "Which AI trades stocks best?"),
    h("div", { flexDirection: "column", marginTop: 14, backgroundColor: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: "4px 22px" },
      ...shown.map(lane))));
}
