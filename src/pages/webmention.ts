/**
 * Webmention endpoint (W3C Webmention receiver).
 *
 * POST (form-encoded `source` + `target`): accepts the mention, stores
 * it via the indieweb plugin, and verifies asynchronously.
 * GET (`?target=`): returns verified mentions for a page as JSON, for
 * client-side rendering.
 *
 * @see https://www.w3.org/TR/webmention/
 */
import type { APIRoute } from "astro";
import { callPublicPluginRoute, jsonResponse } from "../utils/indieweb";

export const prerender = false;

export const POST: APIRoute = async (context) => {
	const contentType = context.request.headers.get("content-type") ?? "";
	let source: string | null = null;
	let target: string | null = null;

	if (contentType.includes("application/x-www-form-urlencoded")) {
		const params = new URLSearchParams(await context.request.text());
		source = params.get("source");
		target = params.get("target");
	} else if (contentType.includes("application/json")) {
		const body = (await context.request.json().catch(() => null)) as {
			source?: string;
			target?: string;
		} | null;
		source = body?.source ?? null;
		target = body?.target ?? null;
	}

	if (!source || !target) {
		return jsonResponse(
			{ error: "source and target parameters are required" },
			400,
		);
	}

	const result = await callPublicPluginRoute(context, "/webmention", {
		source,
		target,
	});

	if (!result.success) {
		return jsonResponse(
			{ error: result.error?.message ?? "Webmention processing failed" },
			result.status ?? 500,
		);
	}
	const data = result.data as { error?: string; status?: string };
	if (data?.error) {
		return jsonResponse({ error: data.error }, 400);
	}
	return jsonResponse({ status: "accepted" }, 202);
};

export const GET: APIRoute = async (context) => {
	const target = context.url.searchParams.get("target");
	if (!target) {
		return jsonResponse({ error: "Missing target query parameter" }, 400);
	}

	const result = await callPublicPluginRoute(context, "/webmention", {
		op: "list",
		target,
	});

	if (!result.success) {
		return jsonResponse(
			{ error: result.error?.message ?? "Lookup failed" },
			result.status ?? 500,
		);
	}
	return jsonResponse(result.data ?? { webmentions: [] });
};
