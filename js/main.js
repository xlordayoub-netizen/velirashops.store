/* ============================================================
   VELIRA — main.js
   1. Hydratation du contenu depuis content.json (édité via admin.html)
   2. Interface : header, menu, révélations, accordéon, WhatsApp,
      horloge, newsletter.
   Le HTML statique sert de secours si content.json est absent.
   ============================================================ */
(function () {
  "use strict";

  const FALLBACK_WHATSAPP = "212617753569";
  let whatsappNumber = FALLBACK_WHATSAPP;
  let waMessage =
    "مرحبًا VELIRA،\n\nأرغب في طلب هذه الساعة:\n\n⌚ الموديل: {produit}\n💰 السعر: {prix}\n🔗 {url}\n\nيرجى تأكيد التوفر وطرق التوصيل.\n\nمع خالص التحية.";
  let productCtaLabel = "اطلب عبر واتساب";
  let newsletterMsgs = {
    success: "شكرًا — تم تسجيلك بنجاح.",
    error: "أدخل بريدًا إلكترونيًا صحيحًا."
  };

  /* ---------- Utilitaires ---------- */
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  /* Placeholder SVG gris avec libellé, pour les images non encore fournies */
  const placeholder = (label, w, h, bg) =>
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
        `<rect width='100%' height='100%' fill='${bg || "#F5F5F5"}'/>` +
        `<text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle' ` +
        `font-family='Arial, sans-serif' font-size='34' letter-spacing='2' fill='#666666'>${label}</text></svg>`
    );

  /* N'écrit QUE si la valeur diffère réellement.
     Réécrire un texte identique recrée le noeud et repousse le LCP :
     le <h1> d'accueil était repeint après l'aller-retour CMS, faisant
     passer le LCP de ~2 s à ~5,5 s sur 3G alors que le texte affiché
     était déjà le bon dans le HTML statique. */
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el && value != null && el.textContent !== value) el.textContent = value;
  };

  /* ---------- Constructeur d'URL WhatsApp (source unique) ----------
     Toute URL WhatsApp du site passe par ici. Aucune concaténation
     manuelle ailleurs.
     - le téléphone est nettoyé de tout caractère non numérique
       (« +212 617-753-569 » saisi dans le Studio produisait sinon une URL
       invalide et cassait TOUS les boutons du site) ;
     - le message est encodé avec encodeURIComponent (accents, apostrophes,
       tirets cadratins, arabe, emojis). */
  function buildWhatsAppUrl(phone, message) {
    let cleanPhone = String(phone == null ? "" : phone).replace(/[^0-9]/g, "");
    /* Filets de sécurité pour une saisie « naturelle » dans le Studio :
       « 00212… » → « 212… »  et  « 0617753569 » (format local marocain)
       → « 212617753569 ». Sans cela, wa.me renvoie une erreur et TOUS les
       boutons de commande cessent de fonctionner. */
    if (cleanPhone.startsWith("00")) cleanPhone = cleanPhone.slice(2);
    else if (cleanPhone.length === 10 && cleanPhone.startsWith("0")) {
      cleanPhone = "212" + cleanPhone.slice(1);
    }
    const encodedMessage = encodeURIComponent(message == null ? "" : message);
    return "https://wa.me/" + cleanPhone + "?text=" + encodedMessage;
  }

  /* Ancre URL stable dérivée du nom du produit : « Éclipse » → « eclipse » */
  const slugFor = (name) =>
    String(name == null ? "" : name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "montre";

  /* URL canonique d'un produit : page /produits/<slug> générée au build
     avec ses balises Open Graph → WhatsApp affiche l'aperçu photo du
     produit. Elle redirige le visiteur vers la fiche sur l'accueil. */
  const productUrlFor = (name) => location.origin + "/produits/" + slugFor(name);

  /* Compose le message pour un produit puis renvoie l'URL complète.
     Les remplacements utilisent une FONCTION : avec une chaîne, les motifs
     « $& » ou « $1 » d'un nom de produit corrompraient le message.
     Les lignes dont la valeur est vide (prix ou url absents sur les CTA
     génériques) sont retirées pour ne pas envoyer « Prix : » à vide. */
  function waHrefFor(product, price, url) {
    const filled = waMessage
      .replace("{produit}", () => (product == null ? "" : product))
      .replace("{prix}", () => (price == null ? "" : price))
      .replace("{url}", () => (url == null ? "" : url));
    const message = filled
      .split("\n")
      .filter((line) => {
        const t = line.trim();
        const isDetailLine = /^[⌚💰🔗]/u.test(t);
        const isEmpty = /:$/.test(t) || /^[⌚💰🔗]$/u.test(t);
        return !(isDetailLine && isEmpty);
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
    return buildWhatsAppUrl(whatsappNumber, message);
  }

  /* ---------- Constructeur d'URL d'images Sanity ----------
     Le CDN Sanity expose ses transformations via des paramètres d'URL.
     Ces deux fonctions produisent exactement les mêmes URLs que
     @sanity/image-url (w / q / auto=format / fit=max) sans ajouter de
     dépendance npm ni d'étape de build à ce site statique.

     Sans paramètres, Sanity renvoie le fichier ORIGINAL : 2048×2048 et
     1,6 Mo pour une vignette de 276 px — lent, et redimensionné par le
     navigateur (qualité inférieure au rééchantillonnage du CDN). */
  const isSanity = (src) => typeof src === "string" && src.includes("cdn.sanity.io");
  const isSvg = (src) => /\.svg($|\?)/i.test(src || "");

  function sanityImg(src, opts) {
    const o = opts || {};
    if (!isSanity(src) || isSvg(src)) return src;   /* SVG : jamais rasterisé */
    const p = new URLSearchParams();
    if (o.w) p.set("w", String(Math.round(o.w)));
    p.set("q", String(o.q == null ? 90 : o.q));
    p.set("auto", "format");                        /* WebP/AVIF si supporté */
    p.set("fit", o.fit || "max");                   /* jamais d'agrandissement */
    return src + (src.includes("?") ? "&" : "?") + p.toString();
  }

  /* srcset réel : le navigateur choisit selon la largeur ET le DPR. */
  function sanitySrcset(src, widths, q) {
    if (!isSanity(src) || isSvg(src)) return "";
    return widths
      .map((w) => sanityImg(src, { w: w, q: q == null ? 90 : q }) + " " + w + "w")
      .join(", ");
  }

  /* Largeurs de rendu par contexte (≥ 2× l'affichage pour les écrans retina) */
  const W_PRODUCT = [600, 1200, 1800];   /* affiché ~276 px  → 2×/3× couverts */
  const W_HERO    = [800, 1600, 2400];   /* affiché ~560 px  → jusqu'à 4×     */
  const SIZES_PRODUCT = "(min-width:1024px) 300px, (min-width:560px) 45vw, 90vw";
  const SIZES_WIDE    = "(min-width:860px) 560px, 92vw";

  const waIconSvg =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

  /* Logo WhatsApp officiel (glyphe plein) */
  const waLogoSvg =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>';

  /* ---------- Hydratation depuis content.json ---------- */
  function applyContent(c) {
    whatsappNumber = c.whatsappNumber || FALLBACK_WHATSAPP;
    /* Le modèle du CMS n'est adopté que s'il contient {produit} — le seul
       repère indispensable (le vendeur doit savoir QUELLE montre). Si le
       client le supprime par mégarde, on conserve le modèle par défaut
       intégré : le message reste toujours exploitable, jamais cassé. */
    if (c.waMessage && c.waMessage.includes("{produit}")) waMessage = c.waMessage;
    if (c.productCta) productCtaLabel = c.productCta;

    /* SEO : le HTML statique fait AUTORITÉ, le CMS ne l'écrase plus.
       Auparavant c.seo remplaçait <title> et la meta description après
       chargement : Googlebot lisait une valeur au premier passage (HTML
       servi) et une autre au second (après rendu JS). Résultat : deux
       titres concurrents pour la même URL, un extrait SERP imprévisible
       et des signaux de pertinence instables — sans compter la langue
       qui basculait de l'arabe au français sur un document lang="ar".
       Ces balises sont désormais figées dans index.html.
       Pour les modifier, éditer index.html — plus siteSettings.seo. */

    /* Navigation (desktop + mobile) : libellés des 4 liens */
    if (Array.isArray(c.nav)) {
      ["nav-desktop", "nav-mobile"].forEach((id) => {
        const links = document.querySelectorAll(`#${id} > li > a:not(.btn)`);
        links.forEach((a, i) => {
          if (c.nav[i] != null) a.textContent = c.nav[i];
        });
      });
    }

    /* Bandeau de confiance */
    if (c.trustBar) {
      setText("trust-score", c.trustBar.score);
      setText("trust-count", c.trustBar.count);
      const stars = document.querySelector(".trust-bar .stars");
      if (stars && c.trustBar.score) {
        stars.setAttribute("aria-label", "تقييم " + c.trustBar.score.replace("/", " من "));
      }
      const items = document.getElementById("trust-items");
      if (items && Array.isArray(c.trustBar.items)) {
        items.innerHTML = c.trustBar.items.map((t) => `<li>${esc(t)}</li>`).join("");
      }
    }

    /* Titres et eyebrows de sections */
    if (c.sections) {
      const map = {
        collection: ["collection-eyebrow", "collection-title"]
      };
      Object.keys(map).forEach((key) => {
        const s = c.sections[key];
        if (s) {
          setText(map[key][0], s.eyebrow);
          setText(map[key][1], s.title);
        }
      });
    }

    /* LOGO — volontairement NON piloté par le CMS.
       Le logo est un actif de marque figé, servi depuis
       images/velira-primary-transparent.png et écrit en dur dans le HTML.
       Le client ne peut pas le remplacer depuis le Studio. */

    setText("header-cta-label", c.headerCta);

    /* Hero */
    if (c.hero) {
      setText("hero-eyebrow", c.hero.eyebrow);
      const title = document.getElementById("hero-title");
      if (title && c.hero.titleMain != null) {
        /* Élément LCP : ne jamais le réécrire si le rendu est identique. */
        const next =
          esc(c.hero.titleMain) +
          (c.hero.titleItalic ? " <em>" + esc(c.hero.titleItalic) + "</em>" : "");
        if (title.innerHTML.trim() !== next) title.innerHTML = next;
      }
      setText("hero-sub", c.hero.sub);
      setText("hero-cta-label", c.hero.ctaPrimary);
      setText("hero-cta-secondary", c.hero.ctaSecondary);
      setText("hero-trustline", c.hero.trustLine);
      /* Hero image removed — layout is text-only now. */
    }

    /* Produits */
    if (Array.isArray(c.products)) {
      const grid = document.getElementById("product-grid");
      if (grid) {
        const nextHtml = c.products
          .map((p, i) => {
            /* Vignettes produit : srcset 600/1200/1800 + sizes calé sur la
               grille (4 col. ≥1024px, 2 col. ≥560px, 1 col. mobile). */
            const frontSet = sanitySrcset(p.imgFront, W_PRODUCT);
            const hoverSet = sanitySrcset(p.imgHover, W_PRODUCT);
            const front = p.imgFront
              ? sanityImg(p.imgFront, { w: 1200 })
              : placeholder(`[IMAGE — ${esc(p.name)}]`, 900, 1080);
            const hover = p.imgHover
              ? sanityImg(p.imgHover, { w: 1200 })
              : placeholder(`[AUTRE ANGLE — ${esc(p.name)}]`, 900, 1080, "#D9D9D9");
            const frontAttrs = frontSet ? ` srcset="${frontSet}" sizes="${SIZES_PRODUCT}"` : "";
            const hoverAttrs = hoverSet ? ` srcset="${hoverSet}" sizes="${SIZES_PRODUCT}"` : "";
            const badge = p.badge ? `<span class="product-badge">${esc(p.badge)}</span>` : "";
            const slug = slugFor(p.name);
            return `
          <li class="product-card" id="produit-${slug}">
            <a class="product-link js-wa" href="${esc(waHrefFor("VELIRA " + p.name, p.price + " DH", productUrlFor(p.name)))}" target="_blank" rel="noopener noreferrer" data-product="VELIRA ${esc(p.name)}" data-price="${esc(p.price)} DH" data-slug="${slug}"
               aria-label="اطلب VELIRA ${esc(p.name)}، ${esc(p.price)} درهم، عبر واتساب">
              <figure class="product-media">
                ${badge}
                <img class="img-front" src="${front}"${frontAttrs} alt="VELIRA ${esc(p.name)} — ${esc(p.desc)}" width="900" height="1080" loading="lazy" decoding="async">
                <img class="img-alt" aria-hidden="true" src="${hover}"${hoverAttrs} alt="" width="900" height="1080" loading="lazy" decoding="async">
              </figure>
              <div class="product-meta">
                <h3 class="product-name">${esc(p.name)}</h3>
                <p class="product-desc">${esc(p.desc)}</p>
                <p class="product-price">${esc(p.price)}&nbsp;DH</p>
                <span class="product-cta">${waLogoSvg}اطلب<span class="cta-suffix"> عبر واتساب</span></span>
              </div>
            </a>
          </li>`;
          })
          .join("");
        /* Ne remplace la grille que si son rendu change réellement :
           évite de détruire/recréer 9 cartes (et leurs images) à chaque
           chargement quand le contenu CMS est identique au HTML servi. */
        if (grid.innerHTML.trim() !== nextHtml.trim()) grid.innerHTML = nextHtml;
      }
    }

    /* CTA final */
    if (c.finalCta) {
      setText("cta-eyebrow", c.finalCta.eyebrow);
      setText("cta-title", c.finalCta.title);
      setText("cta-sub", c.finalCta.sub);
      setText("cta-button-label", c.finalCta.button);
      setText("cta-trustline", c.finalCta.trustLine);
    }

    /* Pied de page */
    if (c.footer) {
      const f = c.footer;
      setText("footer-tagline", f.tagline);
      setText("clock-label-text", f.clockLabel);
      setText("footer-collection-title", f.collectionTitle);
      setText("footer-help-title", f.helpTitle);
      setText("newsletter-title", f.newsletterTitle);
      setText("newsletter-text", f.newsletterText);
      setText("newsletter-label", f.newsletterLabel);
      setText("newsletter-btn", f.newsletterButton);
      setText("footer-copy", f.copyright);
      if (f.newsletterPlaceholder) {
        const input = document.getElementById("newsletter-email");
        if (input) input.placeholder = f.newsletterPlaceholder;
      }
      if (f.newsletterSuccess) newsletterMsgs.success = f.newsletterSuccess;
      if (f.newsletterError) newsletterMsgs.error = f.newsletterError;

      /* Liens "Aide" : libellés éditables, destinations fixes (3 × FAQ + contact WhatsApp) */
      const helpList = document.getElementById("footer-help-links");
      if (helpList && Array.isArray(f.helpLinks)) {
        helpList.innerHTML = f.helpLinks
          .map((label, i) =>
            i === f.helpLinks.length - 1
              ? `<li><a class="js-wa" href="${esc(waHrefFor("Question"))}" target="_blank" rel="noopener noreferrer" data-product="Question">${esc(label)}</a></li>`
              : `<li><a href="#faq">${esc(label)}</a></li>`
          )
          .join("");
      }

      /* Liens légaux */
      const legal = document.getElementById("legal-links");
      if (legal && Array.isArray(f.legalLinks)) {
        legal.innerHTML = f.legalLinks
          .map((l) => `<li><a href="${esc(l.href || "#")}">${esc(l.label)}</a></li>`)
          .join("");
      }
    }

    /* Colonne Collection du pied de page : générée depuis la liste des produits */
    if (Array.isArray(c.products)) {
      const list = document.getElementById("footer-collection-links");
      if (list) {
        list.innerHTML = c.products
          .map((p) => `<li><a href="#collection">${esc(p.name)}</a></li>`)
          .join("");
      }
    }

    /* Contact : réseaux sociaux + e-mail. Une icône sans URL réelle est
       masquée plutôt que de pointer vers "#". */
    if (c.contact) {
      document.querySelectorAll("[data-social]").forEach((a) => {
        const url = c.contact[a.dataset.social];
        if (url && url !== "#") {
          a.href = url;
          a.closest("li").hidden = false;
        } else {
          a.closest("li").hidden = true;
        }
      });
      if (c.contact.email) {
        const helpList = document.getElementById("footer-help-links");
        if (helpList) {
          helpList.insertAdjacentHTML(
            "beforeend",
            `<li><a href="mailto:${esc(c.contact.email)}">${esc(c.contact.email)}</a></li>`
          );
        }
      }
    }
  }

  /* ---------- Interface ---------- */
  function initHeader() {
    const header = document.getElementById("site-header");
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const toggle = document.getElementById("nav-toggle");
    const mobileNav = document.getElementById("mobile-nav");
    if (toggle && mobileNav) {
      toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        toggle.setAttribute("aria-label", open ? "فتح القائمة" : "إغلاق القائمة");
        mobileNav.hidden = open;
      });
      mobileNav.addEventListener("click", (e) => {
        if (e.target.closest("a")) {
          toggle.setAttribute("aria-expanded", "false");
          mobileNav.hidden = true;
        }
      });
    }
  }

  function initWhatsAppLinks() {
    document.querySelectorAll(".js-wa").forEach((link) => {
      const product = link.dataset.product || "مجموعة VELIRA";
      /* data-slug présent = carte produit → URL /produits/<slug> incluse
         dans le message (aperçu photo côté WhatsApp). CTA génériques :
         pas de ligne prix/lien. */
      const url = link.dataset.slug ? location.origin + "/produits/" + link.dataset.slug : null;
      link.href = waHrefFor(product, link.dataset.price, url);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
  }

  /* ---------- Anti double-appui sur les boutons de commande ----------
     Un appui accidentel en double ouvrirait DEUX conversations WhatsApp.
     Le PREMIER appui n'est jamais intercepté (la navigation se fait
     normalement) ; seul un second appui sur le MÊME bouton dans les
     1,2 s est ignoré. Délégué sur document → couvre aussi les cartes
     produit recréées après rafraîchissement du contenu. */
  function initTapGuard() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest(".js-wa");
      if (!link) return;
      const now = Date.now();
      const prev = Number(link.dataset.lastTap || 0);
      if (prev && now - prev < 1200) {
        e.preventDefault();          /* doublon uniquement */
        return;
      }
      link.dataset.lastTap = String(now);
      link.classList.add("is-busy");
      setTimeout(() => link.classList.remove("is-busy"), 1800);
    });
  }

  /* Limite anti-robot : 3 inscriptions newsletter par minute maximum. */
  let nlStamps = [];
  function newsletterAllowed() {
    const now = Date.now();
    nlStamps = nlStamps.filter((t) => now - t < 60000);
    if (nlStamps.length >= 3) return false;
    nlStamps.push(now);
    return true;
  }

  function initClock() {
    const hourHand = document.getElementById("clock-hour");
    const minuteHand = document.getElementById("clock-minute");
    const clockTime = document.getElementById("clock-time");

    function tick() {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      if (hourHand && minuteHand) {
        /* Pivot 24,24 = centre du viewBox 48 (identique au logo). */
        hourHand.setAttribute("transform", `rotate(${(h % 12) * 30 + m * 0.5} 24 24)`);
        minuteHand.setAttribute("transform", `rotate(${m * 6} 24 24)`);
      }
      if (clockTime) {
        clockTime.textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
      }
    }
    tick();
    setInterval(tick, 30000);
  }

  function initNewsletter() {
    const form = document.querySelector(".newsletter");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input[type='email']");
      const msg = document.getElementById("newsletter-msg");
      if (!input.value || !input.checkValidity()) {
        msg.textContent = newsletterMsgs.error;
        input.focus();
        return;
      }
      if (!newsletterAllowed()) {
        msg.textContent = "محاولات كثيرة. أعد المحاولة بعد دقيقة.";
        return;
      }
      msg.textContent = newsletterMsgs.success;
      form.reset();
    });
  }

  /* ---------- Search ---------- */
  function initSearch() {
    var toggle = document.getElementById("search-toggle");
    var overlay = document.getElementById("search-overlay");
    var input = document.getElementById("search-input");
    var resultsEl = document.getElementById("search-results");
    var closeBtn = document.getElementById("search-close");
    if (!toggle || !overlay || !input || !resultsEl) return;

    var activeIndex = -1;

    function getProducts() {
      var cards = document.querySelectorAll("#product-grid .product-card");
      var products = [];
      cards.forEach(function (card) {
        var link = card.querySelector(".product-link");
        var name = card.querySelector(".product-name");
        var desc = card.querySelector(".product-desc");
        var price = card.querySelector(".product-price");
        var img = card.querySelector(".img-front");
        if (name) {
          products.push({
            id: card.id,
            name: name.textContent || "",
            desc: desc ? desc.textContent : "",
            price: price ? price.textContent : "",
            img: img ? img.src : "",
            href: link ? link.href : ""
          });
        }
      });
      return products;
    }

    function renderResults(query) {
      activeIndex = -1;
      if (!query || query.length < 1) {
        resultsEl.innerHTML = "";
        return;
      }
      var q = query.toLowerCase().trim();
      var products = getProducts();
      var matches = products.filter(function (p) {
        return (
          p.name.toLowerCase().indexOf(q) !== -1 ||
          p.desc.toLowerCase().indexOf(q) !== -1 ||
          p.price.toLowerCase().indexOf(q) !== -1
        );
      });

      if (matches.length === 0) {
        resultsEl.innerHTML = '<div class="search-empty">لا توجد نتائج لـ \"' + esc(query) + '"</div>';
        return;
      }

      resultsEl.innerHTML = matches
        .map(function (p, i) {
          return (
            '<a class="search-result-item" role="option" id="sr-' + i + '" href="#' + esc(p.id) + '" data-id="' + esc(p.id) + '">' +
            '<img class="search-result-img" src="' + esc(p.img) + '" alt="" width="48" height="48" loading="lazy">' +
            '<div class="search-result-info">' +
            '<div class="search-result-name">' + esc(p.name) + "</div>" +
            '<div class="search-result-desc">' + esc(p.desc) + "</div>" +
            "</div>" +
            '<span class="search-result-price">' + esc(p.price) + "</span>" +
            "</a>"
          );
        })
        .join("");
    }

    function openSearch() {
      overlay.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      setTimeout(function () { input.focus(); }, 60);
      renderResults("");
    }

    function closeSearch() {
      overlay.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      input.value = "";
      resultsEl.innerHTML = "";
      toggle.focus();
    }

    function scrollToProduct(id) {
      var card = document.getElementById(id);
      if (card) {
        closeSearch();
        card.scrollIntoView({ block: "center", behavior: "smooth" });
        card.classList.add("is-linked");
        setTimeout(function () { card.classList.remove("is-linked"); }, 2000);
      }
    }

    function setActiveIndex(idx) {
      var items = resultsEl.querySelectorAll(".search-result-item");
      items.forEach(function (el) { el.removeAttribute("aria-selected"); });
      if (idx >= 0 && idx < items.length) {
        activeIndex = idx;
        items[idx].setAttribute("aria-selected", "true");
        items[idx].scrollIntoView({ block: "nearest" });
      } else {
        activeIndex = -1;
      }
    }

    toggle.addEventListener("click", function () {
      if (overlay.hidden) openSearch();
      else closeSearch();
    });

    if (closeBtn) closeBtn.addEventListener("click", closeSearch);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeSearch();
    });

    input.addEventListener("input", function () {
      renderResults(input.value);
    });

    resultsEl.addEventListener("click", function (e) {
      var item = e.target.closest(".search-result-item");
      if (item) {
        e.preventDefault();
        var id = item.getAttribute("data-id");
        if (id) scrollToProduct(id);
      }
    });

    input.addEventListener("keydown", function (e) {
      var items = resultsEl.querySelectorAll(".search-result-item");
      var count = items.length;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex(activeIndex < count - 1 ? activeIndex + 1 : 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(activeIndex > 0 ? activeIndex - 1 : count - 1);
      } else if (e.key === "Enter" && activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        var id = items[activeIndex].getAttribute("data-id");
        if (id) scrollToProduct(id);
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeSearch();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !overlay.hidden) {
        e.preventDefault();
        closeSearch();
      }
      /* Ctrl+K / Cmd+K shortcut to open search */
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (overlay.hidden) openSearch();
        else closeSearch();
      }
    });

    /* Auto-open search when arriving from another page with ?search=1 */
    if (new URLSearchParams(location.search).get("search") === "1") {
      setTimeout(openSearch, 300);
      /* Clean up the URL */
      if (window.history && history.replaceState) {
        var cleanUrl = location.pathname + location.hash;
        history.replaceState(null, "", cleanUrl);
      }
    }
  }

  function initAll() {
    initHeader();
    initWhatsAppLinks();
    initTapGuard();
    initClock();
    initNewsletter();
    initSearch();
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ---------- Chargement depuis Sanity (CMS) ---------- */
  const SANITY_QUERY = `{
    "settings": *[_type=="siteSettings"][0]{
      whatsappNumber, waMessage, productCta, contact, seo, headerCta, nav,
      trustBar, sections, finalCta, footer,
      hero{eyebrow, titleMain, titleItalic, sub, ctaPrimary, ctaSecondary, trustLine,
        "image": {"src": image.asset->url, "alt": image.alt}}
    },
    "products": *[_type=="product"]|order(order asc){
      name, desc, price, badge,
      "imgFront": imgFront.asset->url, "imgHover": imgHover.asset->url
    },
    "reviews": *[_type=="review"]|order(order asc){initials, name, city, model, stars, text},
    "faq": *[_type=="faqItem"]|order(order asc){question, answer}
  }`;

  /* Reprojette la réponse Sanity dans la forme attendue par applyContent() */
  function mapSanity(result) {
    const s = result.settings || {};
    return {
      whatsappNumber: s.whatsappNumber,
      waMessage: s.waMessage,
      productCta: s.productCta,
      contact: s.contact,
      seo: s.seo,
      headerCta: s.headerCta,
      nav: s.nav,
      trustBar: s.trustBar,
      sections: s.sections,
      hero: s.hero || {},
      products: result.products || [],
      reviews: result.reviews || [],
      faq: result.faq || [],
      finalCta: s.finalCta,
      footer: s.footer,
    };
  }

  /* ---------- Cache local (stale-while-revalidate) ----------
     Protège Sanity lors des pics de trafic publicitaire : un visiteur qui
     revient dans les 5 minutes n'ouvre AUCUNE connexion réseau. Au-delà,
     le contenu périmé s'affiche instantanément puis est rafraîchi en
     arrière-plan — jamais d'écran blanc, jamais d'attente. */
  const CACHE_KEY = "velira:content:v1";
  const CACHE_TTL = 5 * 60 * 1000;

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o || !o.t || !o.d) return null;
      return { data: o.d, fresh: Date.now() - o.t < CACHE_TTL };
    } catch { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: data })); }
    catch { /* quota plein ou navigation privée : sans conséquence */ }
  }

  async function fetchFromSanity() {
    const cfg = window.SANITY;
    if (!cfg || !cfg.projectId || cfg.projectId === "replaceme") return null;
    try {
      /* apicdn = point d'entrée CDN de Sanity : conçu pour le trafic public,
         résiste aux pics et n'est pas soumis aux quotas de l'API directe.
         Le cache est purgé à chaque Publish. */
      const url =
        `https://${cfg.projectId}.apicdn.sanity.io/v${cfg.apiVersion}` +
        `/data/query/${cfg.dataset}?query=${encodeURIComponent(SANITY_QUERY)}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);   /* jamais bloqué */
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) return null;
      const { result } = await r.json();
      if (!result || !result.settings) return null;
      const mapped = mapSanity(result);
      writeCache(mapped);
      return mapped;
    } catch {
      return null;
    }
  }

  /* ---------- Démarrage : Sanity d'abord, content.json en secours ---------- */
  /* Rendu défensif : un contenu partiel ou malformé ne doit jamais vider
     la page — le HTML statique reste alors affiché tel quel. */
  function render(data) {
    try {
      applyContent(data);
      injectProductSchema(data);
      return true;
    } catch {
      return false;
    }
  }

  /* Ré-attache les comportements aux noeuds recréés après un rafraîchissement */
  function rehydrate() {
    initWhatsAppLinks();
  }

  function finish() {
    document.documentElement.classList.remove("is-loading");
    /* Lien profond /#produit-<slug> : la grille étant rendue par JS, le
       défilement natif du navigateur a pu viser une ancre pas encore dans
       le DOM (produits au-delà des 4 statiques). On re-défile après rendu. */
    if (/^#produit-/.test(location.hash)) {
      const card = document.getElementById(location.hash.slice(1));
      if (card) {
        card.scrollIntoView({ block: "center" });
        card.classList.add("is-linked");
      }
    }
  }

  (async () => {
    /* CRITIQUE — les liens WhatsApp sont activés AVANT tout appel réseau.
       Sinon ils restent sur « #commander » pendant le chargement et un
       client qui tape « Commander » est renvoyé vers une ancre de la page. */
    initWhatsAppLinks();

    /* 1) Cache local présent → affichage immédiat, aucune attente réseau. */
    const cached = readCache();
    if (cached) {
      render(cached.data);
      initAll();
      finish();
      if (!cached.fresh) {
        /* Périmé : on rafraîchit en arrière-plan sans bloquer l'affichage. */
        fetchFromSanity().then((fresh) => {
          if (fresh && render(fresh)) rehydrate();
        });
      }
      return;
    }

    /* 2) Premier passage : Sanity, puis content.json en secours. Si les
          deux échouent, le HTML statique reste visible (jamais de page
          blanche) et les boutons de commande fonctionnent déjà. */
    let data = await fetchFromSanity();
    if (!data) {
      data = await fetch("content.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    }
    if (data) render(data);
    initAll();
    finish();
  })();

  /* Données structurées produits (SEO) générées depuis le contenu réel,
     pour que Google voie toujours les vrais noms et prix. */
  function injectProductSchema(c) {
    if (!Array.isArray(c.products) || !c.products.length) return;
    const origin = location.origin.startsWith("http") ? location.origin + "/" : "https://velirashops.store/";
    const schema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: c.products.map((p, i) => ({
        "@type": "Product",
        position: i + 1,
        name: "VELIRA " + p.name,
        description: p.desc,
        image: p.imgFront || undefined,
        brand: { "@id": origin + "#brand" },
        offers: {
          "@type": "Offer",
          price: String(p.price),
          priceCurrency: "MAD",
          availability: "https://schema.org/InStock",
        },
      })),
    };
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(schema);
    document.head.appendChild(s);
  }
})();
