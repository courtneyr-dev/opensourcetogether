import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import { emdashContentAnalysis } from "@opensourcetogether/emdash-content-analysis";
import { emdashIndieweb } from "@opensourcetogether/emdash-indieweb";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	vite: {
		resolve: {
			preserveSymlinks: true,
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
				// First-party plugin, trusted mode: its public protocol routes
				// (webmention/micropub/indieauth) need route metadata the sandbox
				// manifest doesn't carry, and trusted is EmDash's recommended mode
				// for first-party code.
				emdashIndieweb({
					siteUrl: "https://opensourcetogether.dev",
					author: { name: "Courtney Robertson", url: "https://courtneyr.dev" },
				}),
				// Yoast-style readability + keyphrase analysis admin page.
				emdashContentAnalysis(),
			],
			// Marketplace + sandboxed webhook-notifier need worker_loaders
			// (Dynamic Workers / Workers Paid). Re-enable together:
			//   import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
			//   import webhookNotifier from "@emdash-cms/plugin-webhook-notifier";
			//   sandboxed: [webhookNotifier],
			//   sandboxRunner: sandbox(),
			//   marketplace: "https://marketplace.emdashcms.com",
			// and uncomment worker_loaders in wrangler.jsonc.
		}),
	],
	devToolbar: { enabled: false },
});
