{% if request.page_type == 'search' %}
<script id="08-terra-view-item-list-search">
(function () {
  if (window.__terra_view_item_list_search_ran__) return;
  window.__terra_view_item_list_search_ran__ = true;

  if (!window.terra_ctx ||
      !window.terraGetUUID ||
      !window.terraNowIso ||
      !window.terraBuildCanonicalItem) return;

  window.dataLayer = window.dataLayer || [];
  var ctx = window.terra_ctx;

  var currency = {{ shop.currency | json }};
  var affiliation = 'shopify_web_store';
  var item_list_id = 'search_results';
  var item_list_name = 'Search Results';
  var search_term = {{ search.terms | json }};
  var items = [];
  var result_count = 0;

  {% assign max_items = 20 %}
  {% assign idx = 1 %}

  {% for result in search.results %}
    {% if idx > max_items %}{% break %}{% endif %}
    {% if result.object_type == 'product' %}
      {% assign product = result %}
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

          items.push(item);
          result_count++;
        })();
        {% assign idx = idx | plus: 1 %}
      {% endif %}
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

    window.dataLayer.push({
    event: 'search',
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

    search_term: search_term,
    result_count: result_count
  });

})();
</script>
{% endif %}
