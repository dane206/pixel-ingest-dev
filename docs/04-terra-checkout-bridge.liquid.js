<script id="04-terra-checkout-bridge">
(function () {
  if (window.__terra_checkout_bridge_ran__) return;
  window.__terra_checkout_bridge_ran__ = true;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function pushToCart() {
    if (!window.terra_ctx) return;

    var ctx = window.terra_ctx;
    var attrs = {};

    // Identity
    if (ctx.th_vid) attrs.th_vid = String(ctx.th_vid);
    if (ctx.session_key) attrs.session_key = String(ctx.session_key);
    if (ctx.session_start) attrs.session_start = String(ctx.session_start);

    // GA4 stitching (WRITE BOTH: terra_* + ga4_*)
    // Source of truth in ctx is terra_ga_* (per your system)
    if (ctx.terra_ga_cid) {
      attrs.terra_ga_cid = String(ctx.terra_ga_cid);
      attrs.ga4_client_id = String(ctx.terra_ga_cid);
    }
    if (ctx.terra_ga_sid) {
      attrs.terra_ga_sid = String(ctx.terra_ga_sid);
      attrs.ga4_session_id = String(ctx.terra_ga_sid);
    }
    if (ctx.terra_ga_sn != null) {
      attrs.terra_ga_sn = String(ctx.terra_ga_sn);
      attrs.ga4_session_number = String(ctx.terra_ga_sn);
    }

    // First touch (terra_* only)
    if (ctx.terra_ft_source)   attrs.terra_ft_source   = String(ctx.terra_ft_source);
    if (ctx.terra_ft_medium)   attrs.terra_ft_medium   = String(ctx.terra_ft_medium);
    if (ctx.terra_ft_campaign) attrs.terra_ft_campaign = String(ctx.terra_ft_campaign);
    if (ctx.terra_ft_content)  attrs.terra_ft_content  = String(ctx.terra_ft_content);
    if (ctx.terra_ft_term)     attrs.terra_ft_term     = String(ctx.terra_ft_term);
    if (ctx.terra_ft_id)       attrs.terra_ft_id       = String(ctx.terra_ft_id);

    // Last touch (terra_* only)
    if (ctx.terra_lt_source)   attrs.terra_lt_source   = String(ctx.terra_lt_source);
    if (ctx.terra_lt_medium)   attrs.terra_lt_medium   = String(ctx.terra_lt_medium);
    if (ctx.terra_lt_campaign) attrs.terra_lt_campaign = String(ctx.terra_lt_campaign);
    if (ctx.terra_lt_content)  attrs.terra_lt_content  = String(ctx.terra_lt_content);
    if (ctx.terra_lt_term)     attrs.terra_lt_term     = String(ctx.terra_lt_term);
    if (ctx.terra_lt_id)       attrs.terra_lt_id       = String(ctx.terra_lt_id);

    // Click IDs (terra_* only)
    if (ctx.terra_gclid)   attrs.terra_gclid   = String(ctx.terra_gclid);
    if (ctx.terra_gbraid)  attrs.terra_gbraid  = String(ctx.terra_gbraid);
    if (ctx.terra_wbraid)  attrs.terra_wbraid  = String(ctx.terra_wbraid);
    if (ctx.terra_msclkid) attrs.terra_msclkid = String(ctx.terra_msclkid);
    if (ctx.terra_fbclid)  attrs.terra_fbclid  = String(ctx.terra_fbclid);
    if (ctx.terra_ttclid)  attrs.terra_ttclid  = String(ctx.terra_ttclid);

    if (!Object.keys(attrs).length) return;

    fetch("/cart/update.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attributes: attrs })
    }).catch(function () {});
  }

  ready(pushToCart);

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t) return;

    if (
      t.matches('[href*="/checkout"]') ||
      t.matches('button[name="checkout"]') ||
      (t.closest && t.closest('form[action*="/cart"] button[type="submit"]'))
    ) {
      pushToCart();
    }
  });
})();
</script>
