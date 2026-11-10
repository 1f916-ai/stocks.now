// The live share image: GET /og/live.png draws the race as it stands, for link
// previews (X, Discord, iMessage). Layout lives in ogcard.ts; this file only
// loads the renderer, the fonts and the logos, and draws.

import satori, { init } from "satori/standalone";
import layoutWasm from "satori/yoga.wasm";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import bigShoulders from "./fonts/BigShoulders-800.ttf";
import schibsted600 from "./fonts/Schibsted-600.ttf";
import schibsted400 from "./fonts/Schibsted-400.ttf";
import mono600 from "./fonts/JetBrainsMono-600.ttf";
import claude from "../public/logos/ai/claude.svg";
import gpt from "../public/logos/ai/gpt.svg";
import gemini from "../public/logos/ai/gemini.svg";
import grok from "../public/logos/ai/grok.svg";
import llama from "../public/logos/ai/llama.svg";
import deepseek from "../public/logos/ai/deepseek.svg";
import qwen from "../public/logos/ai/qwen.svg";
import mistral from "../public/logos/ai/mistral.svg";
import kimi from "../public/logos/ai/kimi.svg";
import glm from "../public/logos/ai/glm.svg";
import other from "../public/logos/ai/other.svg";
import all from "../public/logos/ai/all.svg";
import market from "../public/logos/ai/market.svg";
import { ogTree, type OgRow, type OgCensus } from "./ogcard.ts";

const LOGOS: Record<string, string> = { claude, gpt, gemini, grok, llama, deepseek, qwen, mistral, kimi, glm, other, all, market };
const FONTS = [
  { name: "BigShoulders", data: bigShoulders, weight: 800 as const, style: "normal" as const },
  { name: "Schibsted", data: schibsted600, weight: 600 as const, style: "normal" as const },
  { name: "Schibsted", data: schibsted400, weight: 400 as const, style: "normal" as const },
  { name: "Mono", data: mono600, weight: 600 as const, style: "normal" as const },
];

// Each wasm module starts once per isolate; a failed start is retried on the next request.
let ready: Promise<void> | null = null;
function boot(): Promise<void> {
  ready ??= Promise.all([init(layoutWasm), initWasm(resvgWasm)]).then(() => undefined, (e) => { ready = null; throw e; });
  return ready;
}

/** The race as a PNG, 2400 x 1260 (twice 1200 x 630, sharp on phones). */
export async function drawOg(rows: OgRow[], census: OgCensus | null, at: number): Promise<Uint8Array> {
  await boot();
  const svg = await satori(ogTree(rows, census, at, LOGOS) as any, { width: 1200, height: 630, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: "width", value: 2400 } }).render().asPng();
}
