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
			"invalid_token",
			result.error?.message ?? "Token verification failed",
			401,
		);
	}
	const verification = result.data as TokenVerification;
	if (!verification.active) {
		const insufficientScope = verification.error?.includes("scope");
		return oauthErrorResponse(
			insufficientScope ? "insufficient_scope" : "invalid_token",
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

/**
 * Micropub creates are small (form fields / JSON, no media endpoint).
 * The body is buffered BEFORE token verification, so cap it to keep
 * unauthenticated callers from tying up Worker memory.
 */
const MAX_BODY_BYTES = 1_048_576;

async function readBodyCapped(
	request: Request,
	maxBytes: number,
): Promise<ArrayBuffer | null> {
	const declared = Number(request.headers.get("content-length") ?? "");
	if (Number.isFinite(declared) && declared > maxBytes) return null;

	const reader = request.body?.getReader();
	if (!reader) return request.arrayBuffer();

	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > maxBytes) {
			await reader.cancel().catch(() => {});
			return null;
		}
		chunks.push(value);
	}
	const combined = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		combined.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return combined.buffer;
}

export const POST: APIRoute = async (context) => {
	// Buffer the raw body so it can be parsed here AND forwarded intact
	// if the request needs to be rewritten for handler escalation.
	const contentType = context.request.headers.get("content-type") ?? "";
	const rawBody = await readBodyCapped(context.request, MAX_BODY_BYTES);
	if (rawBody === null) {
		return oauthErrorResponse(
			"invalid_request",
			"Request body too large (max 1 MB; media uploads are not supported)",
			413,
		);
	}

	let body: unknown;
	let formParams: URLSearchParams | undefined;
	let parseContentType = contentType;

	if (contentType.includes("application/json")) {
		try {
			body = JSON.parse(new TextDecoder().decode(rawBody));
		} catch {
			return oauthErrorResponse("invalid_request", "Invalid JSON body", 400);
		}
	} else if (contentType.includes("application/x-www-form-urlencoded")) {
		const raw = new TextDecoder().decode(rawBody);
		formParams = new URLSearchParams(raw);
		body = raw;
	} else if (contentType.includes("multipart/form-data")) {
		// Multipart create (required of servers without a media
		// endpoint). File parts are rejected — media uploads are not
		// supported; string parts map onto the form-encoded shape.
		let formData: FormData;
		try {
			formData = await new Request(context.request.url, {
				method: "POST",
				headers: { "content-type": contentType },
				body: rawBody,
			}).formData();
		} catch {
			return oauthErrorResponse(
				"invalid_request",
				"Invalid multipart body",
				400,
			);
		}
		formParams = new URLSearchParams();
		for (const [key, value] of formData.entries()) {
			if (typeof value !== "string") {
				return oauthErrorResponse(
					"invalid_request",
					"File uploads are not supported (no media endpoint)",
					400,
				);
			}
			formParams.append(key, value);
		}
		body = formParams.toString();
		parseContentType = "application/x-www-form-urlencoded";
	} else {
		return oauthErrorResponse(
			"invalid_request",
			`Unsupported content type: ${contentType || "(none)"}`,
			415,
		);
	}

	// Authorization first: no privileged escalation happens for callers
	// without a valid `create`-scoped token. Token verification only
	// needs the public plugin surface, which every request has.
	const token = extractBearer(context.request, formParams);
	const verification = await verifyToken(context, token, "create");
	if (verification instanceof Response) return verification;

	// Publishing needs the full EmDash surface. If this request came in
	// anonymously (limited surface), rewrite once with the escalation
	// marker so the middleware initializes the full handlers. The
	// bearer token is re-verified on the escalated pass.
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
		const headers = new Headers(context.request.headers);
		headers.set(INTERNAL_HEADER, "1");
		const escalated = new Request(target, {
			method: "POST",
			headers,
			body: rawBody,
		});
		return context.rewrite(escalated);
	}

	const parsed = parseMicropubRequest(body, parseContentType);
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
