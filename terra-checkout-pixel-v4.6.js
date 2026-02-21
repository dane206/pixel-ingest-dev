console.log("TERRA_CHECKOUT_PIXEL_V4.6_ACTIVE");

/* ================== ENV ================== */

var TERRA_ENV = "dev"; // "dev" | "prod"

var ENDPOINT = "";
if (TERRA_ENV === "prod") {
  ENDPOINT = "https://pixel-ingest-prod-279703303694.us-central1.run.app/v2/track";
} else {
  ENDPOINT = "https://pixel-ingest-dev-600339193870.us-central1.run.app/v2/track";
}

/* ================== UTILS ================== */

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === "x" ? r : (r & 3 | 8);
    return v.toString(16);
  });
}

function getCookie(name) {
  try {
    var match = document.cookie.match(
      new RegExp("(?:^|; )" + name + "=([^;]*)")
    );
    return match ? decodeURIComponent(match[1] || "") : null;
  } catch (e) {
    return null;
  }
}

function digits(x) {
  return String(x || "").replace(/\D/g, "");
}

function getShopifyCustomerId(checkout) {
  if (!checkout) return null;

  var id =
    (checkout.customer && checkout.customer.id) ||
    (checkout.order &&
      checkout.order.customer &&
      checkout.order.customer.id) ||
    null;

  return id ? String(id) : null;
}

function getAttr(key, attrs) {
  if (!attrs || !attrs.length) return null;
  for (var i = 0; i < attrs.length; i++) {
    if (attrs[i] && attrs[i].key === key) return attrs[i].value;
  }
  return null;
}

function getAttrAny(keys, attrs) {
  for (var i = 0; i < keys.length; i++) {
    var v = getAttr(keys[i], attrs);
    if (v != null && v !== "") return v;
  }
  return null;
}

function post(payload) {
  try {
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify(payload)
    });
  } catch (e) {
    // optional dev visibility
    // console.warn("terra post failed", e);
  }
}

/* ================== TERRA CTX FROM ATTRS ================== */

function getTerraCtx(attrs) {
  function g(k){ return getAttr(k, attrs); }

  return {
    // Terra identity
    ctx_id: g("ctx_id"),
    th_vid: g("th_vid"),
    session_key: g("session_key"),
    session_start: g("session_start"),

    terra_ft_source: g("terra_ft_source"),
    terra_ft_medium: g("terra_ft_medium"),
    terra_ft_campaign: g("terra_ft_campaign"),
    terra_ft_content: g("terra_ft_content"),
    terra_ft_term: g("terra_ft_term"),
    terra_ft_id: g("terra_ft_id"),

    terra_lt_source: g("terra_lt_source"),
    terra_lt_medium: g("terra_lt_medium"),
    terra_lt_campaign: g("terra_lt_campaign"),
    terra_lt_content: g("terra_lt_content"),
    terra_lt_term: g("terra_lt_term"),
    terra_lt_id: g("terra_lt_id"),

    terra_gclid: g("terra_gclid"),
    terra_gbraid: g("terra_gbraid"),
    terra_wbraid: g("terra_wbraid"),
    terra_msclkid: g("terra_msclkid"),
    terra_fbclid: g("terra_fbclid"),
    terra_ttclid: g("terra_ttclid")
  };
}

/* ================== BASE PAYLOAD ================== */

function basePayload(event_name, ev) {
  var checkout = ev.data && ev.data.checkout ? ev.data.checkout : null;
  var attrs = checkout && checkout.attributes ? checkout.attributes : [];

  var terra = getTerraCtx(attrs);
  var customerId = getShopifyCustomerId(checkout);

  // Read whatever you actually wrote into checkout attributes:
  // - prefer explicit ga_client_id keys if present
  // - otherwise accept ga4_* keys
  // - otherwise accept terra_ga_* keys
  var ga_client_id = getAttrAny(
    ["ga_client_id", "ga4_client_id", "terra_ga_cid", "_ga"],
    attrs
  );
  var ga_session_id = getAttrAny(
    ["ga_session_id", "ga4_session_id", "terra_ga_sid"],
    attrs
  );
  var ga_session_number = getAttrAny(
    ["ga_session_number", "ga4_session_number", "terra_ga_sn"],
    attrs
  );

  return {
    data_source: "shopify_checkout_pixel",
    event_name: event_name,
	event_id: ev.id ? String(ev.id) : uuidv4(),
	event_time: ev.timestamp || new Date().toISOString(),
    checkout_id: checkout ? checkout.id : null,
    
    user_id: customerId,
	shopify_customer_id: customerId,

    ga_client_id: ga_client_id,
    ga_session_id: ga_session_id,
    ga_session_number: ga_session_number,

    // Terra identity/stitching
    ctx_id: terra.ctx_id,
    th_vid: terra.th_vid,
    session_key: terra.session_key,
    session_start: terra.session_start,

    terra_ft_source: terra.terra_ft_source,
    terra_ft_medium: terra.terra_ft_medium,
    terra_ft_campaign: terra.terra_ft_campaign,
    terra_ft_content: terra.terra_ft_content,
    terra_ft_term: terra.terra_ft_term,
    terra_ft_id: terra.terra_ft_id,

    terra_lt_source: terra.terra_lt_source,
    terra_lt_medium: terra.terra_lt_medium,
    terra_lt_campaign: terra.terra_lt_campaign,
    terra_lt_content: terra.terra_lt_content,
    terra_lt_term: terra.terra_lt_term,
    terra_lt_id: terra.terra_lt_id,

    terra_gclid: terra.terra_gclid,
    terra_gbraid: terra.terra_gbraid,
    terra_wbraid: terra.terra_wbraid,
    terra_msclkid: terra.terra_msclkid,
    terra_fbclid: terra.terra_fbclid,
    terra_ttclid: terra.terra_ttclid,

    // MUST be object (pixel sends object; server stringifies for BQ)
    raw: ev
  };
}

/* ================== CHECKOUT STEP EVENTS ================== */

[
  "checkout_started",
  "checkout_contact_info_submitted",
  "checkout_address_info_submitted",
  "checkout_shipping_info_submitted",
  "payment_info_submitted"
].forEach(function (name) {
  analytics.subscribe(name, function (ev) {
    if (!ev || !ev.data || !ev.data.checkout) return;
    post(basePayload(name, ev));
  });
});

/* ================== PURCHASE ================== */

analytics.subscribe("checkout_completed", function (ev) {
  if (!ev || !ev.data || !ev.data.checkout) return;

  var checkout = ev.data.checkout;
  var payload = basePayload("checkout_completed", ev);
  
  // optional, but safe
  var txn = (checkout.order && checkout.order.id) ? digits(checkout.order.id) : null;

  payload.transaction_id = txn;

  post(payload);
});

/* ================== STOREFRONT EVENTS ================== */

function getTerraFromWindow() {
  var t = {};

  // PRIORITY 1 — live getter (your SSOT)
  try {
    if (window && typeof window.terraGetCTX === "function") {
  	  var live = window.terraGetCTX();
  	  if (live && live.ctx_id) t = live;
	}
  } catch (e) {}

  // PRIORITY 2 — static object fallback
  if (!t || !t.ctx_id) {
    t = (window && (window.terra_ctx || window.terra)) || {};
  }

  return {
    ctx_id: t.ctx_id || null,
    th_vid: t.th_vid || getCookie("th_vid"),
    session_key: t.session_key || null,
    session_start: t.session_start || null,

    terra_ft_source: t.terra_ft_source || getCookie("terra_ft_source"),
    terra_ft_medium: t.terra_ft_medium || getCookie("terra_ft_medium"),
    terra_ft_campaign: t.terra_ft_campaign || getCookie("terra_ft_campaign"),
    terra_ft_content: t.terra_ft_content || getCookie("terra_ft_content"),
    terra_ft_term: t.terra_ft_term || getCookie("terra_ft_term"),
    terra_ft_id: t.terra_ft_id || getCookie("terra_ft_id"),

    terra_lt_source: t.terra_lt_source || getCookie("terra_lt_source"),
    terra_lt_medium: t.terra_lt_medium || getCookie("terra_lt_medium"),
    terra_lt_campaign: t.terra_lt_campaign || getCookie("terra_lt_campaign"),
    terra_lt_content: t.terra_lt_content || getCookie("terra_lt_content"),
    terra_lt_term: t.terra_lt_term || getCookie("terra_lt_term"),
    terra_lt_id: t.terra_lt_id || getCookie("terra_lt_id"),

    terra_gclid: t.terra_gclid || getCookie("terra_gclid"),
    terra_gbraid: t.terra_gbraid || getCookie("terra_gbraid"),
    terra_wbraid: t.terra_wbraid || getCookie("terra_wbraid"),
    terra_msclkid: t.terra_msclkid || getCookie("terra_msclkid"),
    terra_fbclid: t.terra_fbclid || getCookie("terra_fbclid"),
    terra_ttclid: t.terra_ttclid || getCookie("terra_ttclid"),

    // NEW — multi-market support
    terra_landing_page: getCookie("terra_landing_page"),
    terra_referrer: getCookie("terra_referrer"),
    cart_currency: getCookie("cart_currency"),
    localization: getCookie("localization")
  };
}

[
  "page_viewed",
  "product_viewed",
  "collection_viewed",
  "product_added_to_cart",
  "product_removed_from_cart",
  "search_submitted",
  "cart_viewed"
].forEach(function (name) {
  analytics.subscribe(name, function (ev) {
    if (!ev || !ev.data) return;

    var terra = getTerraFromWindow();

    post({
      data_source: "shopify_web_pixel",
      event_name: name,
      event_id: ev.id ? String(ev.id) : uuidv4(),
      event_time: ev.timestamp || new Date().toISOString(),

      // ✅ ADDITIVE — no conflicts
      ctx_id: terra.ctx_id,
      th_vid: terra.th_vid,
      session_key: terra.session_key,
      session_start: terra.session_start,

      terra_ft_source: terra.terra_ft_source,
      terra_ft_medium: terra.terra_ft_medium,
      terra_ft_campaign: terra.terra_ft_campaign,
      terra_ft_content: terra.terra_ft_content,
      terra_ft_term: terra.terra_ft_term,
      terra_ft_id: terra.terra_ft_id,

      terra_lt_source: terra.terra_lt_source,
      terra_lt_medium: terra.terra_lt_medium,
      terra_lt_campaign: terra.terra_lt_campaign,
      terra_lt_content: terra.terra_lt_content,
      terra_lt_term: terra.terra_lt_term,
      terra_lt_id: terra.terra_lt_id,

      terra_gclid: terra.terra_gclid,
      terra_gbraid: terra.terra_gbraid,
      terra_wbraid: terra.terra_wbraid,
      terra_msclkid: terra.terra_msclkid,
      terra_fbclid: terra.terra_fbclid,
      terra_ttclid: terra.terra_ttclid,
      
      terra_landing_page: terra.terra_landing_page,
	  terra_referrer: terra.terra_referrer,
	  cart_currency: terra.cart_currency,
	  localization: terra.localization,

      raw: ev
    });
  });
});