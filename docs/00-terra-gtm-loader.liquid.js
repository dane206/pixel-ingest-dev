<script id="00-terra-gtm-loader">
(function () {
  if (window.__terra_gtm_loader_ran__) return;
  window.__terra_gtm_loader_ran__ = true;

  window.dataLayer = window.dataLayer || [];
  window.__terra_event_queue__ = [];

  window.terraPushEvent = function (eventName, payload) {
    var evt = {
      event: String(eventName || ""),
      event_id: (window.terraGetUUID ? window.terraGetUUID() : String(Date.now())),
      timestamp: (window.terraNowIso ? window.terraNowIso() : new Date().toISOString())
    };

    for (var k in (payload || {})) evt[k] = payload[k];

    // If GTM not loaded yet → queue
    if (!window.__terra_gtm_loaded__) {
      window.__terra_event_queue__.push(evt);
      return;
    }

    window.dataLayer.push(evt);
  };

  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

    var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s);

    j.async=true;
    j.onload = function () {
      window.__terra_gtm_loaded__ = true;

      // flush queued events
      for (var q = 0; q < window.__terra_event_queue__.length; q++) {
        var evt = window.__terra_event_queue__[q];

        // Defer identity until attribution is present
        if (evt.event === "terra_identity_ready") {
          var hasAttribution = window.dataLayer.some(function (e) {
            return e.event === "terra_attribution_ready";
          });

          if (!hasAttribution) {
            setTimeout(function () {
              window.dataLayer.push(evt);
            }, 50);
            continue;
          }
        }

        window.dataLayer.push(evt);
      }

      window.__terra_event_queue__ = [];
    };

    j.src='https://www.googletagmanager.com/gtm.js?id=GTM-KJ7PNVHR';
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-KJ7PNVHR');
})();
</script>
