/**
 * ChartRunner — Pyth Hermes proxy worker.
 *
 * Route: chartrunner.xyz/hermes/*  (see wrangler.toml)
 *
 * Purpose
 * -------
 * Pyth is switching the public Hermes API to mandatory authentication
 * (deadline 2026-07-31). This worker sits in front of Hermes so the game can
 * keep calling a same-origin path (chartrunner.xyz/hermes/...) while the API
 * key is injected server-side and never ships to the browser.
 *
 * It is NOT an open proxy: requests are only ever forwarded to the single
 * HERMES_UPSTREAM origin, and only safe read methods (GET/HEAD) are allowed.
 * Server-Sent Events (…/v2/updates/price/stream) are passed through unbuffered.
 *
 * Secrets / vars (see wrangler.toml + README):
 *   HERMES_API_KEY   — Wrangler secret. Injected as `Authorization: Bearer …`.
 *   HERMES_UPSTREAM  — plaintext var, defaults to https://hermes.pyth.network
 */

const DEFAULT_UPSTREAM = "https://hermes.pyth.network";
const ALLOWED_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Minimal CORS so the widget/game can also call from other ChartRunner origins. */
function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(status, obj, request) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (!ALLOWED_METHODS.has(request.method)) {
      return json(405, { error: "method_not_allowed", allowed: ["GET", "HEAD"] }, request);
    }

    if (!env.HERMES_API_KEY) {
      // Deployed but not yet keyed. Fail loud and explicit rather than leaking
      // an unauthenticated call to Hermes that will start 401-ing after the
      // mandatory-auth cutover.
      return json(
        503,
        {
          error: "hermes_key_unset",
          detail:
            "HERMES_API_KEY secret is not set on this worker. " +
            "Run: wrangler secret put HERMES_API_KEY --name chartrunner-hermes-proxy",
        },
        request
      );
    }

    const url = new URL(request.url);

    // Strip the /hermes prefix; everything after it is the Hermes path.
    // /hermes            -> /
    // /hermes/           -> /
    // /hermes/v2/foo?bar -> /v2/foo?bar
    let path = url.pathname.replace(/^\/hermes/, "");
    if (path === "") path = "/";

    const upstreamBase = (env.HERMES_UPSTREAM || DEFAULT_UPSTREAM).replace(/\/+$/, "");
    const upstreamUrl = upstreamBase + path + url.search;

    // Forward a minimal, safe header set. Accept is preserved so SSE
    // (text/event-stream) negotiation on the streaming endpoint works.
    const fwdHeaders = new Headers();
    const accept = request.headers.get("Accept");
    if (accept) fwdHeaders.set("Accept", accept);
    fwdHeaders.set("Authorization", `Bearer ${env.HERMES_API_KEY}`);

    let upstreamResp;
    try {
      upstreamResp = await fetch(upstreamUrl, {
        method: request.method,
        headers: fwdHeaders,
        // No client body is forwarded (GET/HEAD only), so this is safe.
      });
    } catch (err) {
      return json(502, { error: "hermes_upstream_unreachable", detail: String(err) }, request);
    }

    // Stream the upstream response straight back (works for JSON and SSE),
    // adding CORS. Keep upstream Content-Type / cache headers intact.
    const respHeaders = new Headers(upstreamResp.headers);
    const cors = corsHeaders(request);
    for (const [k, v] of Object.entries(cors)) respHeaders.set(k, v);

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      statusText: upstreamResp.statusText,
      headers: respHeaders,
    });
  },
};
