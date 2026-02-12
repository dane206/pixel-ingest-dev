<!doctype html>
<html class="js" lang="{{ request.locale.iso_code }}">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="">
    <link rel="canonical" href="{{ canonical_url }}">

    {%- if settings.favicon != blank -%}
      <link rel="icon" type="image/png" href="{{ settings.favicon | image_url: width: 32, height: 32 }}">
    {%- endif -%}

    {%- unless settings.type_header_font.system? and settings.type_body_font.system? -%}
      <link rel="preconnect" href="https://fonts.shopifycdn.com" crossorigin>
    {%- endunless -%}

    <title>
      {{ page_title }}
      {%- if current_tags %} &ndash; tagged "{{ current_tags | join: ', ' }}"{% endif -%}
      {%- if current_page != 1 %} &ndash; Page {{ current_page }}{% endif -%}
      {%- unless page_title contains shop.name %} &ndash; {{ shop.name }}{% endunless -%}
    </title>

    {% render '00-terra-gtm-loader' %}
    {% render '01-terra-attribution-ready' %}
    {% render '02-terra-identity-ssot' %}
    {% render '03-terra-item-utils' %}
    {% render '04-terra-checkout-bridge' %}

    {% if request.page_type == 'product' %}
      {% render '05-terra-view-item-producer' %}
      {% render '06-terra-add-to-cart-producer' %}
    {% endif %}

    {% if request.page_type == 'collection' %}
      {% render '07-terra-view-item-list-collection' %}
    {% endif %}

    {% if request.page_type == 'search' %}
      {% render '08-terra-view-item-list-search' %}
    {% endif %}

    {% if page_description %}
      <meta name="description" content="{{ page_description | escape }}">
    {% endif %}

    {% render 'meta-tags' %}

    <script src="{{ 'constants.js' | asset_url }}" defer="defer"></script>
    <script src="{{ 'pubsub.js' | asset_url }}" defer="defer"></script>
    <script src="{{ 'global.js' | asset_url }}" defer="defer"></script>
    <script src="{{ 'details-disclosure.js' | asset_url }}" defer="defer"></script>
    <script src="{{ 'details-modal.js' | asset_url }}" defer="defer"></script>
    <script src="{{ 'search-form.js' | asset_url }}" defer="defer"></script>

    {%- if settings.animations_reveal_on_scroll -%}
      <script src="{{ 'animations.js' | asset_url }}" defer="defer"></script>
    {%- endif -%}

    {{ content_for_header }}
  </head>
  <body>
    <!-- Google Tag Manager (noscript) -->
    <noscript>
      <iframe
        src="https://www.googletagmanager.com/ns.html?id=GTM-KJ7PNVHR"
        height="0"
        width="0"
        style="display:none;visibility:hidden">
      </iframe>
    </noscript>
    <!-- End Google Tag Manager (noscript) -->
  </body>
</html>
