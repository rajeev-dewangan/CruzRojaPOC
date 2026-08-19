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

  // --- orb animation: keyframes live in one injected <style>, prefixed so they
  //     can never clash with anything the host theme already defines ---
  function injectStyles() {
    var css =
      "@keyframes crOrbPulse{" +
        "0%{transform:scale(1)}10%{transform:scale(1.07)}20%{transform:scale(1)}" +
        "30%{transform:scale(1.07)}40%,60%{transform:scale(1)}68%{transform:scale(1.32)}" +
        "76%{transform:scale(.92)}84%{transform:scale(1.1)}92%,100%{transform:scale(1)}}" +
      "@keyframes crOrbRipple{" +
        "0%{transform:scale(1);opacity:.65}100%{transform:scale(2.6);opacity:0}}" +
      "@keyframes crOrbSpinCW{from{transform:rotate(0)}to{transform:rotate(360deg)}}" +
      "@keyframes crOrbSpinCCW{from{transform:rotate(0)}to{transform:rotate(-360deg)}}" +
      ".cr-orb-pulse{animation:crOrbPulse 6s ease-in-out infinite}" +
      ".cr-orb-ripple{animation:crOrbRipple 2.2s ease-out infinite}" +
      ".cr-orb-cw{animation:crOrbSpinCW 16s linear infinite}" +
      ".cr-orb-ccw{animation:crOrbSpinCCW 11s linear infinite}" +
      "@media (prefers-reduced-motion:reduce){" +
        ".cr-orb-pulse,.cr-orb-ripple,.cr-orb-cw,.cr-orb-ccw{animation:none}}";
    var style = document.createElement("style");
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  // Decorative rings around the button. They must never swallow a click, hence
  // pointer-events:none on every one of them.
  function makeDecor(cls, css) {
    var el = document.createElement("div");
    el.className = cls;
    el.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;" + css;
    return el;
  }

  function init() {
    if (!document.body) return;

    injectStyles();

    // Bottom-LEFT on purpose: the Cruz Roja site has an emergency call button
    // bottom-right and it must never be covered. The button now sits inside a
    // wrapper so the rings can overflow past its edge without moving it;
    // position:fixed lives on the wrapper.
    var wrap = document.createElement("div");
    wrap.style.cssText =
      "position:fixed;bottom:24px;left:24px;z-index:2147483000;width:60px;height:60px;";

    var ring1 = makeDecor("cr-orb-ripple", "top:-12px;right:-12px;bottom:-12px;left:-12px;border:2px solid #C8102E;opacity:.7;");
    var ring2 = makeDecor("cr-orb-ripple", "top:-12px;right:-12px;bottom:-12px;left:-12px;border:2px solid #C8102E;opacity:.7;animation-delay:1.1s;");
    var ticks = makeDecor("cr-orb-cw",
      "top:-9px;right:-9px;bottom:-9px;left:-9px;background:repeating-conic-gradient(#C8102E 0deg 3deg, transparent 3deg 15deg);" +
      "-webkit-mask:radial-gradient(circle, transparent 68%, black 70%, black 100%);" +
      "mask:radial-gradient(circle, transparent 68%, black 70%, black 100%);");
    var dashed = makeDecor("cr-orb-ccw", "top:1px;right:1px;bottom:1px;left:1px;border:2px dashed #8A0B20;opacity:.8;");
    var decor = [ring1, ring2, ticks, dashed];

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cr-orb-pulse";
    btn.innerHTML = OPEN_ICON;
    btn.setAttribute("aria-label", "Abrir chat de ayuda");
    btn.setAttribute("aria-expanded", "false");
    btn.style.cssText =
      "position:relative;z-index:1;width:60px;height:60px;" +
      "border-radius:50%;color:#fff;border:none;cursor:pointer;" +
      "font-size:26px;line-height:60px;padding:0;" +
      "background:radial-gradient(circle at 32% 28%, #ffffff 0%, #FF6B81 10%, #C8102E 48%, #6B0819 100%);" +
      "box-shadow:0 4px 14px rgba(0,0,0,.25), 0 0 0 5px rgba(200,16,46,.22), 0 0 40px 8px rgba(200,16,46,.5)";

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
      // While the chat is open the orb goes quiet so it stops pulling focus.
      btn.style.animationPlayState = isOpen ? "running" : "paused";
      for (var d = 0; d < decor.length; d++) {
        decor[d].style.display = isOpen ? "" : "none";
      }
    };

    for (var d = 0; d < decor.length; d++) wrap.appendChild(decor[d]);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
    document.body.appendChild(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
