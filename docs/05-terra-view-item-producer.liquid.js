{% if request.page_type == 'product' and product %}
<script id="05-terra-view-item-producer">
(function () {
  if (window.__terra_view_item_ran__) return;
  window.__terra_view_item_ran__ = true;

  if (!window.terra_ctx ||
      !window.terraGetUUID ||
      !window.terraNowIso ||
      !window.terraBuildCanonicalItem ||
      !window.terraValidateCanonicalItem) return;

  window.dataLayer = window.dataLayer || [];
  var ctx = window.terra_ctx;

  var product_id = {{ product.id }};
  var variant = {{ product.selected_or_first_available_variant | json }};
  if (!variant || !variant.id) return;

  var price = Number(variant.price) / 100;
  var currency = {{ shop.currency | json }};
  var affiliation = 'shopify_web_store';

  var item_list_id = {{ product.handle | json }};
  var item_list_name = {{ product.title | json }};

  var item = window.terraBuildCanonicalItem({
    product_id: product_id,
    variant_id: variant.id,
    sku: variant.sku || '',

    item_name: {{ product.title | json }},
    item_variant: variant.title || '',
    item_brand: {{ product.vendor | json }},
    item_category: {{ product.type | json }},

    price: price,
    quantity: 1,
    currency: currency,
    affiliation: affiliation,

    item_list_id: item_list_id,
    item_list_name: item_list_name,
    index: 1
  });

  window.dataLayer.push({
    event: 'view_item',
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
      value: price,
      item_list_id: item_list_id,
      item_list_name: item_list_name,
      items: [item]
    }
  });

})();
</script>
{% endif %}
