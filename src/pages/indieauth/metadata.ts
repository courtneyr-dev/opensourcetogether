/**
 * IndieAuth server metadata (RFC 8414 shape), discovered via
 * `<link rel="indieauth-metadata">`.
 *
 * @see https://indieauth.spec.indieweb.org/#indieauth-server-metadata
 */
import type { APIRoute } from "astro";
import { jsonResponse } from "../../utils/indieweb";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const origin = url.origin;
	return jsonResponse({
		issuer: `${origin}/`,
		authorization_endpoint: `${origin}/indieauth/authorize`,
		token_endpoint: `${origin}/indieauth/token`,
		revocation_endpoint: `${origin}/indieauth/token`,
		revocation_endpoint_auth_methods_supported: ["none"],
		// Only implemented scopes: Micropub supports create only, and
		// profile-only flows carry no scope.
		scopes_supported: ["create", "profile"],
		response_types_supported: ["code"],
		grant_types_supported: ["authorization_code"],
		code_challenge_methods_supported: ["S256"],
		authorization_response_iss_parameter_supported: true,
	});
};
