{% if request.page_type == 'product' and product %}
<script id="06-terra-add-to-cart-producer">
(function () {
  if (window.__terra_add_to_cart_ran__) return;
  window.__terra_add_to_cart_ran__ = true;

  if (!window.terra_ctx ||
      !window.terraGetUUID ||
      !window.terraNowIso ||
      !window.terraBuildCanonicalItem ||
      !window.terraValidateCanonicalItem) return;

  window.dataLayer = window.dataLayer || [];
  var ctx = window.terra_ctx;

  var product_id = {{ product.id }};
  var currency = {{ shop.currency | json }};
  var affiliation = 'shopify_web_store';
  var item_list_id = {{ product.handle | json }};
  var item_list_name = {{ product.title | json }};

  function getVariantAndQuantity() {
    var variantIdEl = document.querySelector('[name="id"]');
    var variant_id = variantIdEl ? Number(variantIdEl.value) : null;

    var quantityEl = document.querySelector('[name="quantity"]');
    var quantity = quantityEl ? Number(quantityEl.value) : 1;
    if (!quantity || quantity < 1) quantity = 1;

    var variant = null;
    {% for v in product.variants %}
      if ({{ v.id }} === variant_id) {
        variant = {{ v | json }};
      }
    {% endfor %}

    return { variant, variant_id, quantity };
  }

  function fireAddToCart(variant, quantity) {
    if (!variant || !variant.id) return;
    var price = Number(variant.price) / 100;

    var item = window.terraBuildCanonicalItem({
      product_id: product_id,
      variant_id: variant.id,
      sku: variant.sku || '',

      item_name: {{ product.title | json }},
      item_variant: variant.title || '',
      item_brand: {{ product.vendor | json }},
      item_category: {{ product.type | json }},

      price: price,
      quantity: quantity,
      currency: currency,
      affiliation: affiliation,

      item_list_id: item_list_id,
      item_list_name: item_list_name,
      index: 1
    });

    window.dataLayer.push({
      event: 'add_to_cart',
      event_id: window.terraGetUUID(),
      timestamp: window.terraNowIso(),

      ctx_version: ctx.ctx_version,
      ctx_id: ctx.ctx_id,
      iso_week: ctx.iso_week,
      device_type: ctx.device_type,

      th_vid: ctx.th_vid,
      session_key: ctx.session_key,
      session_start: ctx.session_start,

      page_hostname: ctx.page_hostname,
      page_location: ctx.page_location,
      page_path: ctx.page_path,
      page_title: ctx.page_title,
      page_referrer: ctx.page_referrer,
      page_type: ctx.page_type,

      ecommerce: {
        currency: currency,
        value: price * quantity,
        item_list_id: item_list_id,
        item_list_name: item_list_name,
        items: [item]
      }
    });
  }

  // For Shopify native <form> add to cart
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.action || form.action.indexOf('/cart/add') === -1) return;

    try {
      var { variant, quantity } = getVariantAndQuantity();
      fireAddToCart(variant, quantity);
    } catch (_) {}
  }, true);

  // For Smartrr buttons (not using form)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-smartrr-add-to-cart-button]');
    if (!btn) return;

    try {
      var { variant, quantity } = getVariantAndQuantity();
      fireAddToCart(variant, quantity);
    } catch (_) {}
  }, true);
})();
</script>
{% endif %}
