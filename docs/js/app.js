// Interface VidGrab : analyse du lien, téléchargement, historique.
var P = {
  x: { n: "X (Twitter)", re: /(^|\.)(twitter\.com|x\.com)$/, c: "#111" },
  ig: { n: "Instagram", re: /(^|\.)instagram\.com$/, c: "#c13584" },
  fb: { n: "Facebook", re: /(^|\.)(facebook\.com|fb\.watch)$/, c: "#1877f2" },
  tt: { n: "TikTok", re: /(^|\.)tiktok\.com$/, c: "#0f9d9a" },
};
var A = ["320 kbps", "192 kbps", "128 kbps"];
var $ = function (i) {
  return document.getElementById(i);
};
var cur = null,
  fmt = "v",
  hist = [],
  busy = false;
function detect(u) {
  try {
    var h = new URL(u).hostname.toLowerCase();
    for (var k in P) {
      if (P[k].re.test(h)) return k;
    }
  } catch (e) {}
  return null;
}
function platformIcon(key) {
  var ns = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  var bg = document.createElementNS(ns, "rect");
  bg.setAttribute("x", "1"); bg.setAttribute("y", "1");
  bg.setAttribute("width", "22"); bg.setAttribute("height", "22");
  bg.setAttribute("rx", "7"); bg.setAttribute("fill", P[key].c);
  svg.appendChild(bg);
  if (key === "ig") {
    var frame = document.createElementNS(ns, "rect");
    frame.setAttribute("x", "5"); frame.setAttribute("y", "5");
    frame.setAttribute("width", "14"); frame.setAttribute("height", "14");
    frame.setAttribute("rx", "4"); frame.setAttribute("fill", "none");
    frame.setAttribute("stroke", "#fff"); frame.setAttribute("stroke-width", "1.8");
    var lens = document.createElementNS(ns, "circle");
    lens.setAttribute("cx", "12"); lens.setAttribute("cy", "12");
    lens.setAttribute("r", "3.2"); lens.setAttribute("fill", "none");
    lens.setAttribute("stroke", "#fff"); lens.setAttribute("stroke-width", "1.8");
    var dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", "16.7"); dot.setAttribute("cy", "7.4");
    dot.setAttribute("r", "1"); dot.setAttribute("fill", "#fff");
    svg.appendChild(frame); svg.appendChild(lens); svg.appendChild(dot);
  } else {
    var mark = document.createElementNS(ns, "path");
    mark.setAttribute("fill", "#fff");
    if (key === "x") mark.setAttribute("d", "M6.1 4.5h3.6l8.2 15h-3.6zM17.2 4.5h2.7l-9.7 15H7.5z");
    if (key === "fb") mark.setAttribute("d", "M13.7 20v-7.1h2.4l.4-2.8h-2.8V8.3c0-.8.2-1.4 1.4-1.4h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.3 0-3.8 1.4-3.8 3.9v1.9H8.1v2.8h2.5V20z");
    if (key === "tt") mark.setAttribute("d", "M15.1 4h3c.2 2 1.3 3.5 3 4v3.1a8 8 0 0 1-3-1v5.1c0 3.2-2.3 5.3-5.5 5.3-2.8 0-4.8-1.8-4.8-4.5 0-3.2 2.7-5.1 6-4.6v3.2c-1.8-.6-3 .1-3 1.4 0 .9.7 1.5 1.7 1.5 1.2 0 2-.8 2-2.4z");
    svg.appendChild(mark);
  }
  return svg;
}
function chips(k) {
  $("chips").textContent = "";
  for (var i in P) {
    var s = document.createElement("span");
    s.className = "chip" + (i === k ? " on" : "");
    var icon = document.createElement("span");
    icon.className = "chip-icon";
    icon.style.color = P[i].c;
    icon.appendChild(platformIcon(i));
    s.appendChild(icon);
    s.appendChild(document.createTextNode(P[i].n));
    $("chips").appendChild(s);
  }
}
function lbl() {
  return $("auto").checked ? "Télécharger" : "Analyser le lien";
}
function err(t) {
  $("msg").textContent = t;
  $("msg").hidden = !t;
}
function syncInputActions() {
  var hasValue = $("url").value.trim().length > 0;
  $("clear").hidden = !hasValue;
  $("paste").hidden = hasValue;
}
function fmtDur(d) {
  d = d || 0;
  return Math.floor(d / 60) + ":" + ("0" + (d % 60)).slice(-2);
}
function opts() {
  var l;
  if (fmt === "v") {
    l = (cur.heights || [])
      .filter(function (h) {
        return h <= 1080;
      })
      .slice(0, 4)
      .map(function (h) {
        return h + "p";
      });
    if (!l.length) l = ["720p"];
  } else l = A;
  $("q").textContent = "";
  l.forEach(function (x) {
    var o = document.createElement("option");
    o.value = x;
    o.textContent = x;
    $("q").appendChild(o);
  });
}
function api(p) {
  return fetch(API + p).catch(function () {
    throw new Error("API injoignable. Vérifie que uvicorn tourne sur " + API);
  });
}
function fail(r) {
  return r.json().then(
    function (j) {
      throw new Error(
        typeof j.detail === "string" ? j.detail : "Requête invalide",
      );
    },
    function () {
      throw new Error("Erreur " + r.status);
    },
  );
}
function analyse() {
  err("");
  $("res").hidden = true;
  var u = $("url").value.trim();
  if (!u) {
    err("Colle d’abord un lien.");
    return;
  }
  var k = detect(u);
  chips(k);
  if (!k) {
    err(
      "Lien non reconnu. Plateformes prises en charge : X, Instagram, Facebook, TikTok.",
    );
    return;
  }
  $("go").disabled = true;
  $("go").textContent = "Analyse…";
  var wk = setTimeout(function () {
    $("go").textContent = "Réveil du serveur…";
  }, 6000);
  api("/info?url=" + encodeURIComponent(u))
    .then(function (r) {
      return r.ok ? r.json() : fail(r);
    })
    .then(function (d) {
      if (d.too_long) throw new Error("Vidéo trop longue pour ce service.");
      cur = { k: k, u: u, heights: d.heights };
      var g = "linear-gradient(135deg," + P[k].c + ",#888)",
        t = $("thumb");
      t.style.background = /^https:\/\//.test(d.thumbnail || "")
        ? "url('" +
          encodeURI(d.thumbnail).replace(/['()]/g, escape) +
          "') center/cover," +
          g
        : g;
      t.textContent = d.thumbnail ? "" : "▶";
      $("title").textContent = d.title;
      $("info").textContent =
        fmtDur(d.duration) + (d.uploader ? " · " + d.uploader : "");
      fmt = "v";
      $("fv").className = "on";
      $("fa").className = "";
      opts();
      $("bar").hidden = true;
      $("done").hidden = true;
      $("dl").disabled = false;
      $("res").hidden = false;
      if ($("auto").checked) dl();
    })
    .catch(function (e) {
      err(e.message);
    })
    .then(function () {
      clearTimeout(wk);
      $("go").disabled = false;
      $("go").textContent = lbl();
    });
}
function setF(f) {
  if (!cur) return;
  fmt = f;
  $("fv").className = f === "v" ? "on" : "";
  $("fa").className = f === "a" ? "on" : "";
  opts();
}
function dl() {
  if (busy || !cur) return;
  busy = true;
  $("dl").disabled = true;
  $("done").hidden = true;
  err("");
  $("bar").hidden = false;
  $("fill").style.width = "5%";
  var q = $("q").value,
    f = fmt === "v" ? "mp4" : "mp3",
    name = "video." + f;
  api(
    "/download?url=" +
      encodeURIComponent(cur.u) +
      "&format=" +
      f +
      "&quality=" +
      encodeURIComponent(q),
  )
    .then(function (r) {
      if (!r.ok) return fail(r);
      var m = /filename\*=utf-8''([^;]+)|filename="?([^";]+)"?/i.exec(
        r.headers.get("Content-Disposition") || "",
      );
      if (m) {
        try {
          name = decodeURIComponent(m[1] || m[2]).replace(/[\\/:*?"<>|]/g, "_");
        } catch (e) {}
      }
      var tot = +r.headers.get("Content-Length") || 0,
        got = 0,
        parts = [],
        rd = r.body.getReader();
      function pump() {
        return rd.read().then(function (x) {
          if (x.done) return new Blob(parts);
          parts.push(x.value);
          got += x.value.length;
          if (tot) $("fill").style.width = Math.max(5, (got / tot) * 100) + "%";
          return pump();
        });
      }
      return pump();
    })
    .then(function (b) {
      $("fill").style.width = "100%";
      var a = document.createElement("a"),
        url = URL.createObjectURL(b);
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 10000);
      $("done").textContent = "Terminé : " + name;
      $("done").hidden = false;
      hist.unshift({
        n: P[cur.k].n,
        f: f.toUpperCase(),
        q: q,
        s: (b.size / 1048576).toFixed(1),
      });
      hist = hist.slice(0, 20);
      save();
      render();
    })
    .catch(function (e) {
      err(e.message);
      $("bar").hidden = true;
    })
    .then(function () {
      busy = false;
      $("dl").disabled = false;
    });
}
function render() {
  var h = $("hist");
  if (!hist.length) {
    h.innerHTML = '<div class="mu">Aucun téléchargement pour l’instant.</div>';
    return;
  }
  h.textContent = "";
  hist.forEach(function (e) {
    var r = document.createElement("div");
    r.className = "h";
    var a = document.createElement("span");
    a.textContent = e.n + " · " + e.f + " " + e.q;
    var b = document.createElement("span");
    b.className = "mu";
    b.textContent = e.s + " Mo";
    r.appendChild(a);
    r.appendChild(b);
    h.appendChild(r);
  });
}
function save() {
  try {
    localStorage.setItem("vg_hist", JSON.stringify(hist));
  } catch (e) {}
}
function load() {
  try {
    var s = localStorage.getItem("vg_hist");
    if (s) hist = JSON.parse(s) || [];
  } catch (e) {
    hist = [];
  }
}
$("go").onclick = analyse;
$("fv").onclick = function () {
  setF("v");
};
$("fa").onclick = function () {
  setF("a");
};
$("dl").onclick = dl;
$("url").addEventListener("keydown", function (e) {
  if (e.key === "Enter") analyse();
});
$("url").addEventListener("input", function () {
  chips(detect($("url").value.trim()));
  syncInputActions();
});
$("paste").onclick = function () {
  try {
    navigator.clipboard
      .readText()
      .then(function (t) {
        $("url").value = t;
        syncInputActions();
        analyse();
      })
      .catch(function () {
        err("Accès au presse-papiers refusé : colle le lien manuellement.");
      });
  } catch (e) {
    err("Colle le lien manuellement.");
  }
};
$("clear").onclick = function () {
  $("url").value = "";
  syncInputActions();
  chips(null);
  err("");
  $("res").hidden = true;
  $("url").focus();
};
$("clr").onclick = function () {
  hist = [];
  save();
  render();
};
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  var dark = theme === "dark";
  var toggle = $("theme-toggle");
  if (!toggle) return;
  var label = dark ? "Passer au mode clair" : "Passer au mode sombre";
  toggle.setAttribute("aria-label", label);
  toggle.setAttribute("title", label);
}
var savedTheme = localStorage.getItem("vg_theme");
var initialTheme = savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
applyTheme(initialTheme);
$("theme-toggle").onclick = function () {
  var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("vg_theme", next);
  applyTheme(next);
};
syncInputActions();
chips(null);
load();
render();
if (API.indexOf("localhost") < 0) fetch(API + "/health").catch(function () {});
try {
  $("auto").checked = localStorage.getItem("vg_auto") !== "0";
} catch (e) {}
$("auto").onchange = function () {
  try {
    localStorage.setItem("vg_auto", $("auto").checked ? "1" : "0");
  } catch (e) {}
  $("go").textContent = lbl();
};
$("go").textContent = lbl();
