import path from "node:path";
import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import { emdashIndieweb } from "@opensourcetogether/emdash-indieweb";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	vite: {
		resolve: {
			preserveSymlinks: true,
			// Flattened local EmDash/admin packs + Vite prebundle otherwise load
			// two React copies (Phosphor IconBase invalid hook / useContext null).
			dedupe: ["react", "react-dom"],
		},
		optimizeDeps: {
			include: [
				"react",
				"react-dom",
				"react/jsx-runtime",
				"react/jsx-dev-runtime",
				"@phosphor-icons/react",
			],
			exclude: [
				"@opensourcetogether/emdash-indieweb",
				"@opensourcetogether/indieweb-core",
				"@emdash-cms/admin",
				"@emdash-cms/registry-client",
				"@emdash-cms/registry-lexicons",
				"emdash",
				"@tiptap/y-tiptap",
				"yjs",
				"y-protocols",
			],
		},
		ssr: {
			noExternal: [
				"@opensourcetogether/emdash-indieweb",
				"@opensourcetogether/indieweb-core",
			],
		},
		server: {
			fs: {
				allow: [root],
			},
		},
	},
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [
				formsPlugin(),
				emdashIndieweb({
					siteUrl: "https://opensourcetogether.dev",
					author: { name: "Courtney Robertson", url: "https://courtneyr.dev" },
				}),
			],
			// Dogfood: sandboxed/marketplace disabled — Worker Loader + local path-map
			// previously failed Vite file: module fallback. IndieWeb is native in plugins[].
		}),
	],
	devToolbar: { enabled: false },
});
