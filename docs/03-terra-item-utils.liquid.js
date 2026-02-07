<script id="03-terra-item-utils">
(function () {

  if (window.terraBuildCanonicalItem) return;

    /* =========================
      CANONICAL SCHEMA (LOCKED)
    ========================= */

    var CANONICAL_ITEM_KEYS = [
      "item_id","item_name","affiliation","coupon","currency","discount","index",
      "item_brand","item_category","item_category2","item_category3","item_category4","item_category5",
      "item_list_id","item_list_name","item_variant","location_id",
      "price","quantity","creative_name","creative_slot",
      "promotion_id","promotion_name","sku","item_group_id","variant_id"
    ];

    function assertItemSchema(item) {
      for (var i = 0; i < CANONICAL_ITEM_KEYS.length; i++) {
        var k = CANONICAL_ITEM_KEYS[i];
        if (!(k in item)) {
          console.error("TERRA SCHEMA VIOLATION:", k, item);
          return false;
        }
      }
      return true;
    }

    /* =========================
      Helpers
    ========================= */

    function digits(x) {
      return String(x || "").replace(/\D/g, "");
    }

    function toNumber(x) {
      var n = Number(x);
      return isFinite(n) ? n : null;
    }

    function s(x) { return x == null ? "" : String(x); }

    /* =========================
      Canonical Item Builder
    ========================= */

    function buildCanonicalItem(input) {
      input = input || {};

      var productId = digits(input.product_id);
      var variantId = digits(input.variant_id);
      var price = toNumber(input.price);
      var qty = toNumber(input.quantity);

      if (!productId || !variantId || price == null || qty == null) {
        console.error("TERRA INVALID ITEM INPUT", input);
        return null;
      }

      var item = {
        item_id: "shopify_US_" + productId + "_" + variantId,
        item_group_id: "shopify_US_" + productId,
        variant_id: variantId,
        sku: s(input.sku),

        item_name: s(input.item_name),
        affiliation: s(input.affiliation || "shopify_web_store"),
        currency: s(input.currency || "USD"),
        price: price,
        quantity: qty,

        coupon: s(input.coupon),
        discount: toNumber(input.discount) || 0,
        index: toNumber(input.index) || 0,

        item_brand: s(input.item_brand || "Terra Health Essentials"),
        item_category: s(input.item_category),
        item_category2: s(input.item_category2),
        item_category3: s(input.item_category3),
        item_category4: s(input.item_category4),
        item_category5: s(input.item_category5),

        item_list_id: s(input.item_list_id),
        item_list_name: s(input.item_list_name),
        item_variant: s(input.item_variant),
        location_id: s(input.location_id),

        creative_name: input.creative_name || null,
        creative_slot: input.creative_slot || null,
        promotion_id: input.promotion_id || null,
        promotion_name: input.promotion_name || null
      };

      if (!assertItemSchema(item)) return null;

      return item;
    }

    /* =========================
      Public API
    ========================= */

    window.terraBuildCanonicalItem = buildCanonicalItem;
    window.terraAssertItemSchema = assertItemSchema;
    window.terraValidateCanonicalItem = function (item) {
      var ok = item != null && window.terraAssertItemSchema(item);
      return { ok: ok };
    };

})();
</script>
