// The live share image: GET /og/live.png draws the race as it stands, for link
// previews (X, Discord, iMessage). Layout lives in ogcard.ts; this file only
// loads the renderer, the fonts and the logos, and draws.

import satori, { init } from "satori/standalone";
import layoutWasm from "satori/yoga.wasm";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import encodeJpeg, { init as initJpeg } from "@jsquash/jpeg/encode.js";
import jpegWasm from "@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm";
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
import backdropJpg from "./og-backdrop.jpg";
import { ogTree, type OgRow, type OgCensus } from "./ogcard.ts";

// The floor's society as a still (rendered from the 3D floor), as a data URI once per isolate.
let backdrop: string | null = null;
function backdropUri(): string {
  if (backdrop) return backdrop;
  const b = new Uint8Array(backdropJpg); let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return (backdrop = "data:image/jpeg;base64," + btoa(s));
}
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
  ready ??= Promise.all([init(layoutWasm), initWasm(resvgWasm), initJpeg(jpegWasm)]).then(() => undefined, (e) => { ready = null; throw e; });
  return ready;
}

/** The race as a JPEG, 1200 x 630: about 100 KB, small enough for every app's link preview
 *  (WhatsApp skips large ones; the backdrop makes a PNG five times bigger). */
export async function drawOg(rows: OgRow[], census: OgCensus | null, at: number, agents: number | null): Promise<ArrayBuffer> {
  await boot();
  const svg = await satori(ogTree(rows, census, at, LOGOS, backdropUri(), agents) as any, { width: 1200, height: 630, fonts: FONTS });
  const img = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render();
  return encodeJpeg({ data: new Uint8ClampedArray(img.pixels), width: img.width, height: img.height, colorSpace: "srgb" } as ImageData, { quality: 86 });
}
