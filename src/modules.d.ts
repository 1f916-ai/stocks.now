// Module types for what wrangler bundles beside the code (see "rules" in wrangler.jsonc).
declare module "*.wasm" { const m: WebAssembly.Module; export default m; }
declare module "*.ttf" { const b: ArrayBuffer; export default b; }
declare module "*.jpg" { const b: ArrayBuffer; export default b; }
declare module "*.svg" { const s: string; export default s; }
