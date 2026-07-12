/**
 * Helpers for calling emdash-indieweb plugin routes from Astro wire
 * endpoints (/webmention, /micropub, /indieauth/*).
 *
 * The plugin owns protocol state (webmentions, IndieAuth codes/tokens,
 * syndication settings); these wire routes own the HTTP formats the
 * IndieWeb specs require. Plugin routes are invoked in-process through
 * the EmDash runtime with a synthetic JSON request.
 */
import type { APIContext } from "astro";

export const INDIEWEB_PLUGIN_ID = "indieweb";

interface PluginRouteResult {
	success: boolean;
	data?: unknown;
	error?: { code?: string; message?: string };
	status?: number;
}

function syntheticJsonRequest(
	origin: string,
	path: string,
	payload: Record<string, unknown>,
): Request {
	return new Request(
		`${origin}/_emdash/api/plugins/${INDIEWEB_PLUGIN_ID}${path}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		},
	);
}

/**
 * Call a PUBLIC plugin route. Available on every request (the EmDash
 * middleware exposes `handlePublicPluginApiRoute` even to anonymous
 * visitors).
 */
export async function callPublicPluginRoute(
	context: APIContext,
	path: string,
	payload: Record<string, unknown>,
): Promise<PluginRouteResult> {
	const handler = context.locals.emdash?.handlePublicPluginApiRoute;
	if (!handler) {
		return {
			success: false,
			error: { code: "NOT_CONFIGURED", message: "EmDash is not initialized" },
			status: 500,
		};
	}
	return (await handler(
		INDIEWEB_PLUGIN_ID,
		"POST",
		path,
		syntheticJsonRequest(context.url.origin, path, payload),
	)) as PluginRouteResult;
}

/**
 * Call a PRIVATE plugin route. Only available when the full EmDash
 * surface is initialized (authenticated session) — the caller must
 * verify `context.locals.user` first.
 */
export async function callPrivatePluginRoute(
	context: APIContext,
	path: string,
	payload: Record<string, unknown>,
): Promise<PluginRouteResult> {
	const handler = context.locals.emdash?.handlePluginApiRoute;
	if (!handler) {
		return {
			success: false,
			error: { code: "NOT_CONFIGURED", message: "EmDash is not initialized" },
			status: 500,
		};
	}
	return (await handler(
		INDIEWEB_PLUGIN_ID,
		"POST",
		path,
		syntheticJsonRequest(context.url.origin, path, payload),
	)) as PluginRouteResult;
}

/**
 * Extract a bearer token from the Authorization header or an
 * `access_token` body/query parameter (both allowed by the Micropub
 * and IndieAuth specs).
 */
export function extractBearer(
	request: Request,
	params?: URLSearchParams,
): string | undefined {
	const header = request.headers.get("authorization") ?? "";
	if (header.toLowerCase().startsWith("bearer ")) {
		return header.slice(7).trim() || undefined;
	}
	return params?.get("access_token") ?? undefined;
}

/** JSON response helper with OAuth-friendly cache headers. */
export function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

/** OAuth/Micropub error response. */
export function oauthErrorResponse(
	error: string,
	description: string,
	status = 400,
): Response {
	return jsonResponse({ error, error_description: description }, status);
}
