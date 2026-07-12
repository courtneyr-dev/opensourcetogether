import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

/** Static routes that always exist, relative to the site root. */
const STATIC_PATHS = ["/", "/posts", "/blogroll", "/search"];

export const GET: APIRoute = async ({ site, url }) => {
	const siteUrl = (site?.toString() || url.origin).replace(/\/$/, "");

	const [{ entries: posts }, { entries: pages }] = await Promise.all([
		getEmDashCollection("posts"),
		getEmDashCollection("pages"),
	]);

	const urls: Array<{ loc: string; lastmod?: string }> = STATIC_PATHS.map(
		(path) => ({ loc: `${siteUrl}${path}` }),
	);

	for (const post of posts) {
		urls.push({
			loc: `${siteUrl}/posts/${post.id}`,
			lastmod: (
				post.data.updatedAt ?? post.data.publishedAt
			)?.toISOString(),
		});
	}

	for (const page of pages) {
		urls.push({
			loc: `${siteUrl}/pages/${page.data.slug || page.id}`,
			lastmod: (
				page.data.updatedAt ?? page.data.publishedAt
			)?.toISOString(),
		});
	}

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(u) =>
			`  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
	)
	.join("\n")}
</urlset>`;

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}
