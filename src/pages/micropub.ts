/**
 * Micropub endpoint.
 *
 * GET: `q=config` / `q=syndicate-to` queries (token required).
 * POST: create posts (JSON or form-encoded), publishing through the
 * EmDash content pipeline so kind auto-detection, webmention sending,
 * and POSSE syndication hooks all run.
 *
 * Publishing requires the full EmDash handler surface, which the
 * middleware only initializes for privileged request shapes. Anonymous
 * bearer-token requests are escalated by rewriting once with the
 * `_preview` marker (which makes the middleware initialize the full
 * surface); authorization is enforced here via IndieAuth tokens either
 * way.
 *
 * @see https://micropub.spec.indieweb.org/
 */
import type { APIContext, APIRoute } from "astro";
import {
	parseMicropubRequest,
	mapMicropubToPostFields,
	isCreateRequest,
} from "@opensourcetogether/indieweb-core/micropub";
import type { MicropubRequest } from "@opensourcetogether/indieweb-core/micropub";
import {
	callPublicPluginRoute,
	extractBearer,
	jsonResponse,
	oauthErrorResponse,
} from "../utils/indieweb";

export const prerender = false;

const ESCALATION_PARAM = "_preview";
const INTERNAL_HEADER = "x-indieweb-internal";

interface TokenVerification {
	active: boolean;
	me?: string;
	scope?: string;
	error?: string;
}

async function verifyToken(
	context: APIContext,
	token: string | undefined,
	requiredScope?: string,
): Promise<TokenVerification | Response> {
	if (!token) {
		return oauthErrorResponse("unauthorized", "Bearer token required", 401);
	}
	const result = await callPublicPluginRoute(context, "/indieauth-verify", {
		token,
		...(requiredScope ? { requiredScope } : {}),
	});
	if (!result.success) {
		return oauthErrorResponse(
			"unauthorized",
			result.error?.message ?? "Token verification failed",
			401,
		);
	}
	const verification = result.data as TokenVerification;
	if (!verification.active) {
		const insufficientScope = verification.error?.includes("scope");
		return oauthErrorResponse(
			insufficientScope ? "insufficient_scope" : "unauthorized",
			verification.error ?? "invalid token",
			insufficientScope ? 403 : 401,
		);
	}
	return verification;
}

export const GET: APIRoute = async (context) => {
	const q = context.url.searchParams.get("q");
	const token = extractBearer(context.request, context.url.searchParams);

	if (q === "config" || q === "syndicate-to") {
		const verification = await verifyToken(context, token);
		if (verification instanceof Response) return verification;

		const result = await callPublicPluginRoute(context, "/micropub-config", {});
		const config = (result.success ? result.data : {}) as Record<
			string,
			unknown
		>;
		if (q === "syndicate-to") {
			return jsonResponse({
				"syndicate-to": config["syndicate-to"] ?? [],
			});
		}
		return jsonResponse(config);
	}

	if (q) {
		return oauthErrorResponse(
			"invalid_request",
			`Unsupported query: ${q}`,
			400,
		);
	}
	return oauthErrorResponse(
		"invalid_request",
		"Missing q parameter (try q=config)",
		400,
	);
};

export const POST: APIRoute = async (context) => {
	// Publishing needs the full EmDash surface. If this request came in
	// anonymously (limited surface), rewrite once with the escalation
	// marker so the middleware initializes the full handlers.
	if (!context.locals.emdash?.handleContentCreate) {
		if (context.request.headers.get(INTERNAL_HEADER) === "1") {
			return oauthErrorResponse(
				"server_error",
				"EmDash content handlers unavailable",
				500,
			);
		}
		const target = new URL(context.request.url);
		target.searchParams.set(ESCALATION_PARAM, "1");
		const escalated = new Request(target, context.request);
		escalated.headers.set(INTERNAL_HEADER, "1");
		return context.rewrite(escalated);
	}

	const contentType = context.request.headers.get("content-type") ?? "";
	let body: unknown;
	let formParams: URLSearchParams | undefined;

	if (contentType.includes("application/json")) {
		body = await context.request.json().catch(() => null);
		if (!body) {
			return oauthErrorResponse("invalid_request", "Invalid JSON body", 400);
		}
	} else if (contentType.includes("application/x-www-form-urlencoded")) {
		const raw = await context.request.text();
		formParams = new URLSearchParams(raw);
		body = raw;
	} else {
		return oauthErrorResponse(
			"invalid_request",
			`Unsupported content type: ${contentType || "(none)"}`,
			415,
		);
	}

	const token = extractBearer(context.request, formParams);
	const verification = await verifyToken(context, token, "create");
	if (verification instanceof Response) return verification;

	const parsed = parseMicropubRequest(body, contentType);
	if ("error" in parsed) {
		return oauthErrorResponse(
			parsed.error,
			parsed.error_description ?? "Invalid Micropub request",
			400,
		);
	}

	const request = parsed as MicropubRequest;
	if (!isCreateRequest(request)) {
		return oauthErrorResponse(
			"invalid_request",
			"Only create requests are supported (update/delete are not implemented)",
			400,
		);
	}

	const mapped = mapMicropubToPostFields(request);
	const now = new Date().toISOString();
	const result = await context.locals.emdash.handleContentCreate("posts", {
		data: mapped.fields,
		...(mapped.slug ? { slug: mapped.slug } : {}),
		status: mapped.status,
		...(mapped.status === "published" ? { publishedAt: now } : {}),
	});

	if (!result.success) {
		const error = (result as { error?: { message?: string } }).error;
		return oauthErrorResponse(
			"invalid_request",
			error?.message ?? "Content creation failed",
			400,
		);
	}

	const item = (result.data as { item?: { slug?: string | null; id: string } })
		?.item;
	const slug = item?.slug ?? item?.id ?? "";
	const location = `${context.url.origin}/posts/${slug}`;

	return new Response(null, {
		status: 201,
		headers: { Location: location, "Cache-Control": "no-store" },
	});
};
