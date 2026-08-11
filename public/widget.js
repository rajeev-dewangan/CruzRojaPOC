/* Cruz Roja chat widget loader — plain ES5, no build step.
   Enqueue from WordPress; it injects a floating button and a hidden iframe. */
(function () {
  "use strict";

  // --- guard against double injection (plugin + theme, or a cached duplicate) ---
  if (window.__cruzRojaWidgetLoaded) return;
  window.__cruzRojaWidgetLoaded = true;

  // --- work out where the app lives, from this script's own URL, so the
  //     Vercel domain never has to be hardcoded in two places ---
  var FALLBACK_ORIGIN = "https://cruz-roja-bot.vercel.app";

  function resolveOrigin() {
    var el = document.currentScript;
    if (!el) {
      var all = document.getElementsByTagName("script");
      for (var i = all.length - 1; i >= 0; i--) {
        if (all[i].src && all[i].src.indexOf("widget.js") !== -1) {
          el = all[i];
          break;
        }
      }
    }
    if (el && el.src) {
      var a = document.createElement("a");
      a.href = el.src;
      if (a.protocol && a.host) return a.protocol + "//" + a.host;
    }
    return FALLBACK_ORIGIN;
  }

  var ORIGIN = resolveOrigin();
  var OPEN_ICON = "&#128172;"; // 💬
  var CLOSE_ICON = "&#10005;"; // ✕

  function init() {
    if (!document.body) return;

    // Bottom-LEFT on purpose: the Cruz Roja site has an emergency call button
    // bottom-right and it must never be covered.
    var btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = OPEN_ICON;
    btn.setAttribute("aria-label", "Abrir chat de ayuda");
    btn.setAttribute("aria-expanded", "false");
    btn.style.cssText =
      "position:fixed;bottom:24px;left:24px;z-index:2147483000;width:60px;height:60px;" +
      "border-radius:50%;background:#C8102E;color:#fff;border:none;cursor:pointer;" +
      "font-size:26px;line-height:60px;padding:0;box-shadow:0 4px 14px rgba(0,0,0,.25)";

    var frame = document.createElement("iframe");
    frame.src = ORIGIN + "/embed?ref=" + encodeURIComponent(location.pathname);
    frame.title = "Asistente virtual Cruz Roja";
    frame.setAttribute("loading", "lazy");
    frame.style.cssText =
      "position:fixed;bottom:96px;left:24px;z-index:2147483000;width:350px;height:480px;" +
      "max-width:calc(100vw - 48px);max-height:calc(100vh - 140px);border:none;" +
      "border-radius:14px;display:none;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.2)";

    btn.onclick = function () {
      var isOpen = frame.style.display === "block";
      frame.style.display = isOpen ? "none" : "block";
      btn.innerHTML = isOpen ? OPEN_ICON : CLOSE_ICON;
      btn.setAttribute("aria-label", isOpen ? "Abrir chat de ayuda" : "Cerrar chat de ayuda");
      btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
    };

    document.body.appendChild(btn);
    document.body.appendChild(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
