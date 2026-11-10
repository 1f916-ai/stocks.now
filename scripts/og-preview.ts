// Draw the share image from the live public API, locally, without deploying:
//   node --experimental-strip-types scripts/og-preview.ts out.png
import { readFileSync, writeFileSync } from "node:fs";
import satori from "satori";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { ogTree, OG_FAMILIES } from "../src/ogcard.ts";

const out = process.argv[2] ?? "scripts/out/og.png";
const base = process.env.BASE ?? "https://stocks.now";
const [ix, tribes] = await Promise.all([fetch(`${base}/api/indexes`).then((r) => r.json()), fetch(`${base}/api/tribes`).then((r) => r.json())]);
const census = tribes.citizens === null ? null : { total: tribes.citizens, families: Object.fromEntries(Object.entries(tribes.tribes).map(([k, v]: any) => [k, v.citizens])) };
const font = (f: string) => readFileSync(new URL(`../src/fonts/${f}`, import.meta.url));
const logos = Object.fromEntries([...OG_FAMILIES, "all", "market"].map((k) => [k, readFileSync(new URL(`../public/logos/ai/${k}.svg`, import.meta.url), "utf8")]));

await initWasm(readFileSync(new URL("../node_modules/@resvg/resvg-wasm/index_bg.wasm", import.meta.url)));
const svg = await satori(ogTree(ix.indexes, census, Date.parse(ix.as_of), logos) as any, {
  width: 1200, height: 630,
  fonts: [
    { name: "BigShoulders", data: font("BigShoulders-800.ttf"), weight: 800, style: "normal" },
    { name: "Schibsted", data: font("Schibsted-600.ttf"), weight: 600, style: "normal" },
    { name: "Schibsted", data: font("Schibsted-400.ttf"), weight: 400, style: "normal" },
    { name: "Mono", data: font("JetBrainsMono-600.ttf"), weight: 600, style: "normal" },
  ],
});
writeFileSync(out, new Resvg(svg, { fitTo: { mode: "width", value: 2400 } }).render().asPng());
console.log("wrote", out);
