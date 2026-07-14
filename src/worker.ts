import handler from "@astrojs/cloudflare/entrypoints/server";
// Dogfood: PluginBridge/sandbox disabled while path-mapping local EmDash 0.29.
// Re-enable with: export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";
export default handler;
