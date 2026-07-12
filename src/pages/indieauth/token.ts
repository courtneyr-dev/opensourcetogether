/**
 * IndieAuth token endpoint.
 *
 * POST `grant_type=authorization_code`: exchanges a code (with PKCE
 * verifier) for an access token.
 * POST `action=revoke`: revokes a token (RFC 7009 semantics — always 200).
 * GET with a bearer token: legacy token verification, returns the
 * token's `me` / `client_id` / `scope`.
 *
 * @see https://indieauth.spec.indieweb.org/#token-endpoint
 */
import type { APIRoute } from "astro";
import {
	callPublicPluginRoute,
	extractBearer,
	jsonResponse,
	oauthErrorResponse,
} from "../../utils/indieweb";

export const prerender = false;

export const POST: APIRoute = async (context) => {
	const contentType = context.request.headers.get("content-type") ?? "";
	let params: URLSearchParams;
	if (contentType.includes("application/json")) {
		const body = (await context.request.json().catch(() => ({}))) as Record<
			string,
			string
		>;
		params = new URLSearchParams(Object.entries(body));
	} else {
		params = new URLSearchParams(await context.request.text());
	}

	// RFC 7009-style revocation (also supports legacy action=revoke).
	if (params.get("action") === "revoke" || params.has("token")) {
		await callPublicPluginRoute(context, "/indieauth-revoke", {
			token: params.get("token"),
		});
		return jsonResponse({}, 200);
	}

	const result = await callPublicPluginRoute(context, "/indieauth-redeem", {
		grantType: params.get("grant_type") ?? undefined,
		code: params.get("code") ?? undefined,
		clientId: params.get("client_id") ?? undefined,
		redirectUri: params.get("redirect_uri") ?? undefined,
		codeVerifier: params.get("code_verifier") ?? undefined,
		flow: "token",
	});

	if (!result.success) {
		return oauthErrorResponse(
			"server_error",
			result.error?.message ?? "Token exchange failed",
			500,
		);
	}
	const data = result.data as Record<string, unknown>;
	if (data.error) {
		return jsonResponse(data, 400);
	}
	return jsonResponse(data);
};

export const GET: APIRoute = async (context) => {
	const token = extractBearer(context.request, context.url.searchParams);
	if (!token) {
		return oauthErrorResponse("unauthorized", "Bearer token required", 401);
	}
	const result = await callPublicPluginRoute(context, "/indieauth-verify", {
		token,
	});
	if (!result.success) {
		return oauthErrorResponse(
			"server_error",
			result.error?.message ?? "Verification failed",
			500,
		);
	}
	const verification = result.data as {
		active: boolean;
		me?: string;
		client_id?: string;
		scope?: string;
		error?: string;
	};
	if (!verification.active) {
		return oauthErrorResponse(
			"unauthorized",
			verification.error ?? "invalid token",
			401,
		);
	}
	return jsonResponse({
		me: verification.me,
		client_id: verification.client_id,
		scope: verification.scope,
	});
};
