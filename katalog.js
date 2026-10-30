/* ===== SENARAI KATALOG: tambah produk baru di sini =====
   match = label produk SAMA PERSIS dengan dalam CONFIG.products (app.js)
   img   = gambar kad. Kalau fail tiada, kad tunjuk placeholder.
   Nota: ruang dalam nama fail ditulis %20 */
const CATALOG = [
  { match: "Keychain Nama",     img: "gallery/Colorful%203D-Printed%20Name%20Keychains.png",    desc: "Nama anda dalam 3D. Pilih warna dan saiz." },
  { match: "Keychain No Plate", img: "gallery/3D%20Printed%20Keychain%20Tags%20Workspace.png", desc: "Plat nombor mini. 6 design, 1 atau 2 baris." }
];
/* ===== TAMAT ===== */

(function () {
  const q = s => document.querySelector(s), RM = n => "RM" + n;
  const grid = q("#cat-grid"), cat = q("#katalog"), ord = q("#order-view");

  function pick(name) {
    const chip = [...document.querySelectorAll("#prod .chip")].find(b => b.textContent === name);
    if (chip && chip.getAttribute("aria-pressed") !== "true") chip.click();   // guna logik produk sedia ada
    q("#order-title").textContent = name;
    cat.hidden = true; ord.hidden = false;
    scrollTo(0, 0); dispatchEvent(new Event("resize"));                        // betulkan saiz kanvas 3D
  }
  function toCatalog() { ord.hidden = true; cat.hidden = false; scrollTo(0, 0); }

  CATALOG.filter(i => CONFIG.products.some(p => p.label === i.match)).forEach(it => {
    const c = document.createElement("article");
    c.className = "pcard";
    c.innerHTML = `<div class="pimg" data-n="${it.match}"><img src="${it.img}" alt="${it.match}" loading="lazy"></div>
      <h3>${it.match}</h3><p class="pdesc">${it.desc}</p>
      <p class="pprice">${RM(CONFIG.price)} / unit · ${RM(CONFIG.priceBulk)} untuk ${CONFIG.bulkQty}+</p>
      <button type="button" class="btn">Pilih produk</button>`;
    c.querySelector("img").onerror = e => e.target.remove();
    c.querySelector("button").onclick = () => pick(it.match);
    grid.appendChild(c);
  });

  q("#btn-catalog").onclick = toCatalog;
  q("#btn-more").onclick = () => {                 // dari troli: kembali ke katalog
    q("#cart-modal").close();
    q('#tabs [data-tab="tempah"]').click(); toCatalog();
  };
})();
