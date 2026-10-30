/* Shared UI: top navigation, logo, profile card, footer and shared helpers. */
(function () {
  const P = window.PORTFOLIO;
  const me = P.profile;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- helpers ---------- */
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Renders text; anything still starting with "TODO:" gets a visible dashed outline.
  const t = (s) => {
    const str = String(s ?? "");
    const mid = str.search(/\sTODO:/); // a TODO at the end of a real sentence: keep the text, outline only the placeholder
    if (mid > 0) return esc(str.slice(0, mid)) + " " + t(str.slice(mid + 1));
    if (/^TODO\b/.test(str)) {
      const clean = str.replace(/^TODO:?\s*/, "");
      return `<span class="todo" title="Placeholder — edit js/data.js">${esc(clean || "Add content")}</span>`;
    }
    return esc(str);
  };
  const isTodo = (s) => /^TODO\b/.test(String(s ?? ""));
  const plain = (s) => String(s ?? "").replace(/^TODO:?\s*/, "");

  const img = (im, cls = "") => {
    // Side-by-side phones: { row: [ {src, caption}, … ], caption: "…" }; each phone can be missing and shows its own slot.
    if (im && Array.isArray(im.row)) {
      return `<figure class="shot shot--rowwrap ${cls}"><div class="phone-row">${im.row.map((r) => img({ ...r, eager: true }, "shot--phone")).join("")}</div>${im.caption ? `<figcaption>${esc(plain(im.caption))}</figcaption>` : ""}</figure>`;
    }
    if (im && im.fit === "phone") cls += " shot--phone";
    if (im && im.fit === "phones") cls += " shot--phone shot--phones";
    if (im && im.fit === "tall") cls += " shot--tall";
    if (im && im.fit === "wide") cls += " shot--wide";
    if (im && im.fit === "full") cls += " shot--full";
    const cap = im && im.caption ? `<figcaption>${esc(plain(im.caption))}</figcaption>` : "";
    // Video file: { video: "assets/video/demo.mp4", poster: "assets/img/poster.jpg", captions: "assets/video/demo.vtt", caption: "…" }
    if (im && im.video) {
      return `<figure class="shot shot--video ${cls}"><video controls playsinline preload="metadata"${im.poster ? ` poster="${esc(im.poster)}"` : ""}${im.loop ? " loop muted autoplay" : ""} aria-label="${esc(plain(im.caption || "Video"))}"><source src="${esc(im.video)}">${
        im.captions ? `<track kind="captions" src="${esc(im.captions)}" srclang="en" label="English" default>` : ""
      }Your browser can’t play this video.</video>${cap}</figure>`;
    }
    // Embed (Figma prototype, YouTube, Vimeo, Loom…): { embed: "https://…", caption: "…" }
    if (im && im.embed && /^https:\/\//.test(im.embed)) {
      return `<figure class="shot shot--embed ${cls}"><div class="embed-wrap"><iframe src="${esc(im.embed)}" title="${esc(plain(im.caption || "Embedded media"))}" loading="lazy" allow="fullscreen; autoplay; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>${cap}</figure>`;
    }
    if (im && im.src) {
      return `<figure class="shot ${cls}"><img src="${esc(im.src)}" alt="${esc(plain(im.alt || im.caption))}" loading="${im.eager ? "eager" : "lazy"}">${
        im.caption ? `<figcaption>${esc(plain(im.caption))}</figcaption>` : ""
      }</figure>`;
    }
    return `<figure class="shot shot--empty ${cls}"><div class="shot-ph" role="img" aria-label="Image placeholder"><span>Add image</span><small>${esc(
      plain(im?.caption || "")
    )}</small></div></figure>`;
  };

  // A slot is wired to a file name before the file exists. If the file is missing,
  // show a labeled placeholder (it turns into the real image as soon as the file is added).
  document.addEventListener(
    "error",
    (e) => {
      const i = e.target;
      if (!i || !(i.tagName === "IMG" || i.tagName === "SOURCE") || !i.closest(".shot")) return;
      const fig = i.closest(".shot");
      const name = (i.getAttribute("src") || "").split("/").pop();
      const cap = fig.querySelector("figcaption");
      const ph = document.createElement("div");
      ph.className = "shot-ph";
      ph.setAttribute("role", "img");
      ph.setAttribute("aria-label", "Image placeholder");
      ph.innerHTML = `<span>Add ${i.tagName === "SOURCE" ? "video" : "image"}</span><small>${esc(cap ? cap.textContent : "")}</small><small class="ph-file">Save the file as assets/${i.tagName === "SOURCE" ? "video" : "img"}/${esc(name)}</small>`;
      fig.classList.add("shot--empty");
      fig.classList.remove("shot--phone", "shot--tall", "shot--video");
      fig.replaceChildren(ph);
    },
    true
  );

  /* ---------- Click-to-enlarge (lightbox) ---------- */
  (function lightbox() {
    let dlg, big, cap, zoomBtn, opener;
    const build = () => {
      dlg = document.createElement("dialog");
      dlg.className = "lightbox";
      dlg.setAttribute("aria-label", "Enlarged image");
      dlg.innerHTML = `<div class="lb-bar"><button type="button" class="lb-zoom" aria-pressed="false">Actual size</button><button type="button" class="lb-close">Close</button></div><div class="lb-stage"><img alt=""></div><p class="lb-cap"></p>`;
      document.body.appendChild(dlg);
      big = dlg.querySelector("img");
      cap = dlg.querySelector(".lb-cap");
      zoomBtn = dlg.querySelector(".lb-zoom");
      dlg.querySelector(".lb-close").addEventListener("click", () => dlg.close());
      zoomBtn.addEventListener("click", () => {
        const on = dlg.classList.toggle("lb-actual");
        zoomBtn.setAttribute("aria-pressed", String(on));
        zoomBtn.textContent = on ? "Fit to screen" : "Actual size";
      });
      dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.classList.contains("lb-stage")) dlg.close(); });
      dlg.addEventListener("close", () => { dlg.classList.remove("lb-actual"); zoomBtn.setAttribute("aria-pressed", "false"); zoomBtn.textContent = "Actual size"; if (opener && opener.focus) opener.focus(); });
    };
    const open = (im) => {
      if (!dlg) build();
      opener = im;
      big.src = im.currentSrc || im.src;
      big.alt = im.alt;
      const fc = im.closest("figure") && im.closest("figure").querySelector("figcaption");
      cap.textContent = fc ? fc.textContent : "";
      dlg.showModal();
      dlg.querySelector(".lb-close").focus();
    };
    const enhance = (root) => {
      root.querySelectorAll(".shot img:not([data-lb])").forEach((im) => {
        im.dataset.lb = "1";
        im.tabIndex = 0;
        im.setAttribute("role", "button");
        im.setAttribute("aria-haspopup", "dialog");
        im.title = "Click to enlarge";
      });
    };
    document.addEventListener("click", (e) => { const im = e.target.closest && e.target.closest(".shot img[data-lb]"); if (im && typeof HTMLDialogElement !== "undefined") open(im); });
    document.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".shot img[data-lb]")) { e.preventDefault(); open(e.target); }
    });
    const start = () => { enhance(document); new MutationObserver(() => enhance(document)).observe(document.body, { childList: true, subtree: true }); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  })();

  /* ---------- SVG pieces ---------- */
  // A plain colored dot, used as a small project color marker.
  const ballSVG = (color = "#5fd6cf", cls = "") =>
    `<svg class="ball ${cls}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="${color}"/><circle cx="50" cy="50" r="46" fill="#fff" fill-opacity=".12"/></svg>`;

  const logoMark = () => `<span class="logo-mono" aria-hidden="true">LC</span>`;

  const logo = (size = "") =>
    `<a class="logo ${size}" href="index.html" aria-label="${esc(me.firstName)} ${esc(me.lastName)}, ${esc(me.title)} — home">
      ${logoMark()}
      <span class="logo-text"><span class="logo-name" aria-hidden="true">${esc(me.firstName)} ${esc(me.lastName)}</span><span class="logo-title" aria-hidden="true">${esc(me.title)}</span></span>
    </a>`;

  // Profile card: your photo with the school above and your program below.
  const portrait = (opts = {}) => {
    const lines = opts.lines || [me.degreeLine, me.gradLine];
    return `<figure class="player-card ${opts.cls || ""}">
      <p class="pc-school"><span>${esc(opts.header ?? me.school)}</span></p>
      <div class="pc-photo"><img src="${esc(opts.photo || me.photo)}" alt="${esc(opts.alt || me.photoAlt)}" width="900" height="900" decoding="async"></div>
      <figcaption class="pc-info">
        <strong>${esc(opts.title ?? me.title)}</strong>
        ${lines.filter(Boolean).map((l) => `<span>${esc(l)}</span>`).join("")}
      </figcaption>
      
    </figure>`;
  };

  /* ---------- HUD header + footer ---------- */
  const NAV = [
    { href: "index.html", label: "Home", key: "home" },
    { href: "about.html", label: "About Me", key: "about" },
    { href: "work.html", label: "My Work", key: "work" },
    { href: "resume.html", label: "Resume", key: "resume" },
    { href: "contact.html", label: "Contact", key: "contact" }
  ];

  function renderChrome() {
    const page = document.body.dataset.page;
    const header = document.getElementById("hud");
    if (header) {
      header.innerHTML = `
        <a class="skip" href="#main">Skip to content</a>
        <div class="nv-bar">
          <a class="nv-brand" href="index.html" aria-label="${esc(me.firstName)} ${esc(me.lastName)}, home">${esc(me.firstName)} ${esc(me.lastName)}</a>
          <nav class="nv-nav" aria-label="Main">
            <ul>
              ${NAV.filter((n) => n.key !== "home" && n.key !== "contact")
                .map((n) => `<li><a href="${n.href}" class="nv-link${page === n.key || (page === "project" && n.key === "work") ? " is-active" : ""}"${page === n.key ? ' aria-current="page"' : ""}>${n.label === "My Work" ? "Work" : n.label === "About Me" ? "About" : n.label}</a></li>`)
                .join("")}
              <li><a class="nv-cta${page === "contact" ? " is-active" : ""}" href="contact.html"${page === "contact" ? ' aria-current="page"' : ""}>Contact</a></li>
            </ul>
          </nav>
        </div>`;
    }
    const footer = document.getElementById("footer");
    if (footer) {
      footer.innerHTML = `
        <div class="footer-inner">
          ${logo("logo--sm")}
          <p>Designed &amp; built by ${esc(me.firstName)} ${esc(me.lastName)}.</p>
          <p class="footer-links">
            ${me.email ? `<a href="mailto:${esc(me.email)}">Email</a>` : ""}
            ${me.linkedin ? `<a href="${esc(me.linkedin)}" target="_blank" rel="noopener">LinkedIn<span class="sr-only"> (opens in a new tab)</span></a>` : ""}
            <a href="resume.html">Resume</a>
            <a href="https://layilahnasser.github.io/seatgeekportfolio/">See the interactive version</a>
          </p>
        </div>`;
    }
  }

  window.LANES = { esc, t, isTodo, plain, img, ballSVG, logo, portrait };
  renderChrome();
})();
