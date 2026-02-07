{%- comment -%}
01-terra-attribution-ready.liquid (FIXED)

Goals:
- Persist FIRST touch (terra_ft_*) for long-term attribution
- Persist LAST touch (terra_lt_*) for latest campaign/ad that brought them back
- Persist click IDs (terra_gclid, terra_fbclid, terra_ttclid, etc.)
- Persist landing page + referrer once (terra_landing_page, terra_referrer)
- Cookies only (no ctx dependency)
- Works across ALL subdomains of terrahealthessentials.com via Domain=.terrahealthessentials.com
- Safe fallback to host-only cookies on non-Terra hosts (e.g., *.myshopify.com)

IMPORTANT:
- This snippet should run early (before identity ssot reads cookies into ctx)
{%- endcomment -%}

<script id="01-terra-attribution-ready">
(function () {
  if (window.__terra_attribution_ready_ran__) return;
  window.__terra_attribution_ready_ran__ = true;

  window.dataLayer = window.dataLayer || [];

  /* =========================
     CONFIG
  ========================= */

  // First-touch retention
  var FT_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

  // Last-touch retention
  var LT_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

  // Click IDs retention
  var CLICK_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

  // Only share cookies across these domains (protects against setting Domain on myshopify hosts)
  var ROOT_DOMAIN = "terrahealthessentials.com";

  /* =========================
     HELPERS (ES5)
  ========================= */

  function nowIso() { return new Date().toISOString(); }

  function decodePlus(s) {
    try { return decodeURIComponent(String(s || "").replace(/\+/g, " ")); }
    catch (_) { return String(s || ""); }
  }

  function endsWith(h, suffix) {
    h = String(h || "");
    suffix = String(suffix || "");
    if (!h || !suffix) return false;
    return h.slice(-suffix.length) === suffix;
  }

  function cookieDomainForHost() {
    var h = String(location.hostname || "").toLowerCase();

    // Exact root domain
    if (h === ROOT_DOMAIN) return "." + ROOT_DOMAIN;

    // Any subdomain of ROOT_DOMAIN
    if (endsWith(h, "." + ROOT_DOMAIN)) return "." + ROOT_DOMAIN;

    // Non-Terra hosts (myshopify, local preview, etc.) => host-only cookies
    return "";
  }

  function getCookie(name) {
    var m = document.cookie.match(
      new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\\[\\]\\\\\/+^])/g, "\\$1") + "=([^;]*)")
    );
    return m ? decodeURIComponent(m[1]) : null;
  }

  function setCookie(name, val, maxAgeSeconds) {
    if (val === null || val === undefined) return;
    val = String(val);
    if (!val) return;

    var p = [];
    p.push(name + "=" + encodeURIComponent(val));
    p.push("Path=/");

    var d = cookieDomainForHost();
    if (d) p.push("Domain=" + d);

    p.push("Max-Age=" + String(maxAgeSeconds));
    p.push("SameSite=Lax");
    if (location.protocol === "https:") p.push("Secure");

    document.cookie = p.join("; ");
  }

  function parseQuery(search) {
    var out = {};
    var s = String(search || "");
    if (!s) return out;
    if (s.charAt(0) === "?") s = s.slice(1);
    if (!s) return out;

    var parts = s.split("&");
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i];
      if (!kv) continue;

      var eq = kv.indexOf("=");
      var k = eq >= 0 ? kv.slice(0, eq) : kv;
      var v = eq >= 0 ? kv.slice(eq + 1) : "";

      k = decodePlus(k).toLowerCase();
      v = decodePlus(v);

      if (!k) continue;
      if (out[k] === undefined) out[k] = v;
    }
    return out;
  }

  function pick(q, key) {
    var v = q[key];
    if (v === undefined || v === null) return "";
    return String(v);
  }

  function anyNonEmpty(obj) {
    for (var k in obj) {
      if (obj.hasOwnProperty(k) && obj[k]) return true;
    }
    return false;
  }

  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (v !== undefined && v !== null && String(v)) return String(v);
    }
    return "";
  }

  /* =========================
     READ URL PARAMS
  ========================= */

  var q = parseQuery(location.search);

  // UTMs
  var utm = {
    source:  pick(q, "utm_source"),
    medium:  pick(q, "utm_medium"),
    campaign: pick(q, "utm_campaign"),
    content: pick(q, "utm_content"),
    term:    pick(q, "utm_term"),
    id:      pick(q, "utm_id")
  };

  // Click IDs
  var click = {
    gclid:   pick(q, "gclid"),
    gbraid:  pick(q, "gbraid"),
    wbraid:  pick(q, "wbraid"),
    msclkid: pick(q, "msclkid"),
    fbclid:  pick(q, "fbclid"),
    ttclid:  pick(q, "ttclid")
  };

  var hasUtm = anyNonEmpty(utm);
  var hasClick = anyNonEmpty(click);

  /* =========================
     ALWAYS: landing/referrer once
     (must not be blocked by early return)
  ========================= */

  if (!getCookie("terra_landing_page")) setCookie("terra_landing_page", location.href, FT_MAX_AGE);
  if (!getCookie("terra_referrer") && document.referrer) setCookie("terra_referrer", document.referrer, FT_MAX_AGE);

  /* =========================
     CLICK-ONLY FALLBACK (critical)
     If we have click IDs but no UTMs,
     synthesize minimal source/medium so lt/ft updates.
  ========================= */

  if (!hasUtm && hasClick) {
    // Google
    if (click.gclid || click.gbraid || click.wbraid) {
      utm.source = utm.source || "google";
      utm.medium = utm.medium || "cpc";
      hasUtm = true;
    }
    // Bing
    else if (click.msclkid) {
      utm.source = utm.source || "bing";
      utm.medium = utm.medium || "cpc";
      hasUtm = true;
    }
    // Meta
    else if (click.fbclid) {
      utm.source = utm.source || "facebook";
      utm.medium = utm.medium || "paid_social";
      hasUtm = true;
    }
    // TikTok
    else if (click.ttclid) {
      utm.source = utm.source || "tiktok";
      utm.medium = utm.medium || "paid_social";
      hasUtm = true;
    }
  }

  // If still nothing attribution-related in URL, stop here.
  if (!hasUtm && !hasClick) return;

  /* =========================
     WRITE CLICK ID COOKIES
  ========================= */

  if (click.gclid)   setCookie("terra_gclid",   click.gclid,   CLICK_MAX_AGE);
  if (click.gbraid)  setCookie("terra_gbraid",  click.gbraid,  CLICK_MAX_AGE);
  if (click.wbraid)  setCookie("terra_wbraid",  click.wbraid,  CLICK_MAX_AGE);
  if (click.msclkid) setCookie("terra_msclkid", click.msclkid, CLICK_MAX_AGE);
  if (click.fbclid)  setCookie("terra_fbclid",  click.fbclid,  CLICK_MAX_AGE);
  if (click.ttclid)  setCookie("terra_ttclid",  click.ttclid,  CLICK_MAX_AGE);

  /* =========================
     FIRST TOUCH (write once)
     - set only if not already set
     - requires a meaningful source/medium to be considered valid
  ========================= */

  if (hasUtm) {
    // Guard: don't write empty shells as first touch
    var ftSource = utm.source;
    var ftMedium = utm.medium;

    if (!getCookie("terra_ft_source") && ftSource) setCookie("terra_ft_source", ftSource, FT_MAX_AGE);
    if (!getCookie("terra_ft_medium") && ftMedium) setCookie("terra_ft_medium", ftMedium, FT_MAX_AGE);

    if (!getCookie("terra_ft_campaign") && utm.campaign) setCookie("terra_ft_campaign", utm.campaign, FT_MAX_AGE);
    if (!getCookie("terra_ft_content") && utm.content)   setCookie("terra_ft_content", utm.content, FT_MAX_AGE);
    if (!getCookie("terra_ft_term") && utm.term)         setCookie("terra_ft_term", utm.term, FT_MAX_AGE);
    if (!getCookie("terra_ft_id") && utm.id)             setCookie("terra_ft_id", utm.id, FT_MAX_AGE);
  }

  /* =========================
     LAST TOUCH (overwrite on new attribution hit)
     - update on any attribution signal (UTM or click)
     - preserves existing values if a field isn't present
  ========================= */

  if (hasUtm) {
    if (utm.source)   setCookie("terra_lt_source", utm.source, LT_MAX_AGE);
    if (utm.medium)   setCookie("terra_lt_medium", utm.medium, LT_MAX_AGE);
    if (utm.campaign) setCookie("terra_lt_campaign", utm.campaign, LT_MAX_AGE);
    if (utm.content)  setCookie("terra_lt_content", utm.content, LT_MAX_AGE);
    if (utm.term)     setCookie("terra_lt_term", utm.term, LT_MAX_AGE);
    if (utm.id)       setCookie("terra_lt_id", utm.id, LT_MAX_AGE);
  }

  /* =========================
     DATA LAYER (DEBUG PROOF)
     - Push only when attribution was observed (UTM or click id)
  ========================= */

  window.dataLayer.push({
    event: "terra_attribution_ready",
    timestamp: nowIso(),

    // Observed or synthesized UTMs for this hit
    utm_source: utm.source || "",
    utm_medium: utm.medium || "",
    utm_campaign: utm.campaign || "",
    utm_content: utm.content || "",
    utm_term: utm.term || "",
    utm_id: utm.id || "",

    // Observed click IDs for this hit
    gclid: click.gclid || "",
    gbraid: click.gbraid || "",
    wbraid: click.wbraid || "",
    msclkid: click.msclkid || "",
    fbclid: click.fbclid || "",
    ttclid: click.ttclid || "",

    // Debug: cookie domain decision
    terra_cookie_domain: cookieDomainForHost() || "(host-only)"
  });

})();
</script>
