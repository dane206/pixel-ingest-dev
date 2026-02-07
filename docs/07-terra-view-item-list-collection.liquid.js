{% if request.page_type == 'collection' and collection %}
<script id="terra-view-item-list-collection">
(function () {
  if (window.__terra_view_item_list_collection_ran__) return;
  window.__terra_view_item_list_collection_ran__ = true;

  if (!window.terra_ctx ||
      !window.terraGetUUID ||
      !window.terraNowIso ||
      !window.terraBuildCanonicalItem) return;

  window.dataLayer = window.dataLayer || [];
  var ctx = window.terra_ctx;

  var currency = {{ shop.currency | json }};
  var item_list_id = {{ collection.handle | json }};
  var item_list_name = {{ collection.title | json }};
  var affiliation = 'shopify_web_store';

  var items = [];

  {% assign max_items = 20 %}
  {% assign idx = 1 %}

  {% for product in collection.products %}
    {% if idx > max_items %}{% break %}{% endif %}
    {% assign variant = product.selected_or_first_available_variant %}
    {% if variant and variant.id %}

      (function () {
        var item = window.terraBuildCanonicalItem({
          product_id: {{ product.id }},
          variant_id: {{ variant.id }},
          sku: {{ variant.sku | json }},

          item_name: {{ product.title | json }},
          item_variant: {{ variant.title | json }},
          item_brand: {{ product.vendor | json }},
          item_category: {{ product.type | json }},

          price: {{ variant.price | divided_by: 100.0 }},
          quantity: 1,
          currency: currency,
          affiliation: affiliation,
          item_list_id: item_list_id,
          item_list_name: item_list_name,
          index: {{ idx }}
        });

        if (item) items.push(item);
      })();

      {% assign idx = idx | plus: 1 %}
    {% endif %}
  {% endfor %}

  if (!items.length) return;

  window.dataLayer.push({
    event: 'view_item_list',
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
      item_list_id: item_list_id,
      item_list_name: item_list_name,
      items: items
    }
  });

})();
</script>
{% endif %}
