/**
 * ChartRunner — Account deletion worker.
 *
 * Route: chartrunner.xyz/account/delete  (POST; see wrangler.toml)
 *
 * Flow (self-service, at-most-your-own-account):
 *   1. Read the caller's Supabase JWT from `Authorization: Bearer <token>`.
 *   2. Verify it via GET /auth/v1/user (apikey = public anon key). The uid comes
 *      ONLY from this verified response — never from the request body — so a
 *      caller can never delete anyone else's account.
 *   3. With the service-role key: delete the user's app rows (profiles,
 *      cr_alerts, and best-effort cr_names by email), then delete the auth user
 *      via the Admin API. The auth-user delete is authoritative — the call only
 *      reports success if that succeeds.
 *
 * Secrets / vars (wrangler.toml + README):
 *   SUPABASE_SERVICE_ROLE_KEY  — Wrangler secret (service-role; server-only).
 *   SUPABASE_URL, SUPABASE_ANON_KEY — plaintext vars (anon key is already public).
 */

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
function base(env) {
  return env.SUPABASE_URL.replace(/\/+$/, "");
}
function svcHeaders(env) {
  const k = env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: k, Authorization: "Bearer " + k, "Content-Type": "application/json" };
}

// Verify the caller's JWT and return the user object (with .id, .email) or null.
async function verifyUser(env, token) {
  try {
    const r = await fetch(base(env) + "/auth/v1/user", {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token },
    });
    if (!r.ok) return null;
    const u = await r.json().catch(() => null);
    return u && u.id ? u : null;
  } catch (_) {
    return null;
  }
}

// Service-role DELETE against a PostgREST path. Returns true on 2xx.
async function sbDelete(env, path) {
  try {
    const r = await fetch(base(env) + path, {
      method: "DELETE",
      headers: { ...svcHeaders(env), Prefer: "return=minimal" },
    });
    return r.ok;
  } catch (_) {
    return false;
  }
}

// Admin API: delete the auth user. Authoritative step.
async function adminDeleteUser(env, uid) {
  try {
    const r = await fetch(base(env) + "/auth/v1/admin/users/" + encodeURIComponent(uid), {
      method: "DELETE",
      headers: svcHeaders(env),
    });
    return r.ok;
  } catch (_) {
    return false;
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    const url = new URL(request.url);
    if (request.method !== "POST" || !/\/account\/delete\/?$/.test(url.pathname)) {
      return json(404, { error: "not_found" }, request);
    }
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      return json(503, { error: "not_configured" }, request);
    }

    const authz = request.headers.get("Authorization") || "";
    const m = authz.match(/^Bearer\s+(.+)$/i);
    if (!m) return json(401, { error: "no_token" }, request);

    const user = await verifyUser(env, m[1].trim());
    if (!user) return json(401, { error: "invalid_token" }, request);

    const uid = user.id;
    const email = user.email || "";

    // Delete app data first (best-effort), then the auth user (authoritative).
    const deleted = {};
    deleted.profiles = await sbDelete(env, "/rest/v1/profiles?id=eq." + encodeURIComponent(uid));
    deleted.alerts = await sbDelete(env, "/rest/v1/cr_alerts?owner=eq." + encodeURIComponent(uid));
    // cr_names.owner is the uid for pre-v1.0.752 / backfilled accounts and the
    // email for current off-chain sign-ups — release both (best-effort). eq. is
    // exact-match on unique keys, so neither can touch another user's rows.
    deleted.names_uid = await sbDelete(env, "/rest/v1/cr_names?owner=eq." + encodeURIComponent(uid));
    if (email) {
      deleted.names_email = await sbDelete(env, "/rest/v1/cr_names?owner=eq." + encodeURIComponent(email));
    }

    const userDeleted = await adminDeleteUser(env, uid);
    if (!userDeleted) return json(502, { error: "delete_failed", deleted }, request);

    return json(200, { ok: true, uid, deleted }, request);
  },
};
