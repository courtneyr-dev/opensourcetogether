/**
 * RFC 8414 discovery alias for the IndieAuth server metadata.
 * Same document as /indieauth/metadata (the rel="indieauth-metadata" target);
 * some OAuth tooling only looks at this well-known path.
 */
export { GET, prerender } from "../indieauth/metadata";
