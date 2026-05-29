# ── flaresolverr URL-aware routing ──
# Added by openclaw-flaresolverr-rewire-2026-05-29 patch.
# Routes DEX (GeckoTerminal / Dexscreener) requests through flaresolverr
# to defeat Cloudflare 401/429. CEX traffic is unaffected (direct urllib).
#
# Enable via env: OHLC_USE_FLARESOLVERR=1
# Override URL  : FLARESOLVERR_URL=http://flaresolverr_server_1:8191/v1
# Override hosts: FLARESOLVERR_HOSTS_GLOB=api.geckoterminal.com,api.dexscreener.com
#
# To remove: delete this block + the dispatch line at the top of request_json.

_USE_FLARESOLVERR = os.getenv("OHLC_USE_FLARESOLVERR", "0") == "1"
_FLARESOLVERR_URL = os.getenv(
    "FLARESOLVERR_URL", "http://flaresolverr_server_1:8191/v1"
)
_FLARESOLVERR_HOSTS = tuple(
    h.strip().lower()
    for h in os.getenv(
        "FLARESOLVERR_HOSTS_GLOB",
        "api.geckoterminal.com,api.dexscreener.com",
    ).split(",")
    if h.strip()
)


def _should_route_via_flaresolverr(url: str) -> bool:
    if not _USE_FLARESOLVERR:
        return False
    u = url.lower()
    return any(host in u for host in _FLARESOLVERR_HOSTS)


def _request_json_via_flaresolverr(
    url: str, params: "dict[str, Any] | None" = None, timeout: int = 30
) -> Any:
    """POST to flaresolverr's /v1 to defeat Cloudflare.

    Surfaces 429 and 5xx from the target as HTTPError so the upstream
    retry_json_with_retries loop in incremental_daily.py keeps working.
    """
    if params:
        sep = "&" if "?" in url else "?"
        url = url + sep + urlencode(params)
    body = json.dumps(
        {
            "cmd": "request.get",
            "url": url,
            "maxTimeout": max(15000, int(timeout * 1000)),
        }
    ).encode("utf-8")
    req = Request(
        _FLARESOLVERR_URL,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urlopen(req, timeout=timeout + 30) as resp:
        envelope = json.loads(resp.read().decode("utf-8"))
    if envelope.get("status") != "ok":
        raise URLError(
            "flaresolverr: " + str(envelope.get("message"))[:200]
        )
    sol = envelope.get("solution") or {}
    status = int(sol.get("status") or 0)
    if status == 429 or 500 <= status <= 599:
        raise HTTPError(url, status, "flaresolverr-target", {}, None)
    if status >= 400:
        raise HTTPError(url, status, "flaresolverr-target", {}, None)
    text = sol.get("response") or ""
    return json.loads(text)
# ── end flaresolverr block ──
