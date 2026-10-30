/* ===== TETAPAN: ubah di sini sahaja ===== */
const CONFIG = {
  whatsapp: "60178422719",
  orderApi: "https://ammare-order.ammarahimi02.workers.dev",     // URL Cloudflare Worker (isi lepas siap setup Telegram)
  price: 5,            // harga seunit (RM)
  priceBulk: 4,        // harga bulk (RM) - perlu disahkan
  bulkQty: 10,         // jumlah minimum untuk harga bulk (dan deposit)
  depositPct: 50,      // peratus deposit
  baseThickness: 2.0,  // sama dengan base_thickness dalam keychain.scad
  colours: [
    { name: "Putih", hex: "#ffffff" }, { name: "Hitam", hex: "#1a1a1a" },
    { name: "Merah", hex: "#e53935" }, { name: "Jingga", hex: "#fb8c00" },
    { name: "Biru", hex: "#1e88e5" }, { name: "Kuning", hex: "#fdd835" },
    { name: "Purple", hex: "#8e24aa" }, { name: "Pink", hex: "#f48fb1" },
    { name: "Biru pekat", hex: "#0d2b6b" }, { name: "Hijau", hex: "#43a047" }
  ],
  products: [
    { label: "Keychain Nama", type: "nama", scad: "keychain.scad", maxLen: 12, fonts: ["Lobster"],
      params: [
    { key: "letter_spacing", label: "Jarak huruf", min: 0.8, max: 1.5, step: 0.05, value: 1.0 },
    { key: "border_size", label: "Lebar bucu tapak (mm)", min: 2, max: 6, step: 0.2, value: 3.4 },
    { key: "base_thickness", label: "Tebal tapak (mm)", min: 1.2, max: 4, step: 0.2, value: 2.0 },
    { key: "text_thickness", label: "Tebal teks (mm)", min: 0.8, max: 3, step: 0.2, value: 1.4 },
    { key: "hole_size", label: "Saiz lubang ring (mm)", min: 3, max: 8, step: 0.5, value: 5 },
    { key: "ring_move_x", label: "Jarak ring ke teks (mm)", min: 3, max: 14, step: 0.5, value: 7 },
    { key: "ring_move_y", label: "Naik/turun ring (mm)", min: -8, max: 8, step: 0.5, value: -2 }
      ] },
    { label: "Keychain No Plate", type: "plate", scad: "NO PLATE.scad", fonts: ["CharlesWright-Bold"],
      colours: ["Hitam", "Putih"],   // warna dibenarkan (kalau tiada baris ini = semua warna)
      params: [
      { key: "Saiz_Teks", label: "Saiz huruf 2 baris", min: 4, max: 12, step: 0.5, value: 9 },
      { key: "Saiz_Teks_1_Baris", label: "Saiz huruf 1 baris", min: 3, max: 10, step: 0.5, value: 7.5 },
      { key: "Jarak_Baris", label: "Jarak antara baris (mm)", min: 6, max: 14, step: 0.5, value: 11 },
      { key: "Jarak_Huruf", label: "Jarak huruf", min: 0.8, max: 1.5, step: 0.05, value: 1.0 },
      { key: "Lebar_Plat_2_Baris", label: "Lebar plat 2 baris (mm)", min: 35, max: 60, step: 1, value: 45 },
      { key: "Tinggi_Plat_2_Baris", label: "Tinggi plat 2 baris (mm)", min: 20, max: 35, step: 1, value: 29 },
      { key: "Lebar_Plat_1_Baris", label: "Lebar plat 1 baris (mm)", min: 45, max: 70, step: 1, value: 55 },
      { key: "Tinggi_Plat_1_Baris", label: "Tinggi plat 1 baris (mm)", min: 12, max: 25, step: 1, value: 17 },
      { key: "Tebal_Tapak", label: "Tebal tapak (mm)", min: 1.2, max: 4, step: 0.2, value: 2.4 },
      { key: "Tebal_Teks", label: "Tebal teks (mm)", min: 0.8, max: 3, step: 0.2, value: 1.4 },
      ] }
    // produk baru: salin satu blok produk di atas (fail .scad letak dalam folder wasm)
  ],
  gallery: []          // cth: ["k1.jpg", "k2.jpg"] (fail dalam folder gallery/)
};
/* ===== TAMAT TETAPAN ===== */

const $ = s => document.querySelector(s), RM = n => "RM" + n;
const hex = n => CONFIG.colours.find(c => c.name === n).hex;
let prod = CONFIG.products[0], sel = { base: "Hitam", text: "Putih" }, cart = [], ready = false;
let cur = null, pending = "";
const P = {};
const curKey = () => prod.label + JSON.stringify(spec().params);
const DUA = d => !["Design E", "Design F"].includes(d);
// Tetapan lubang (mm), asing untuk 2 baris dan 1 baris. Nama mesti sama dengan dalam NO PLATE.scad
const LUBANG = {
  Saiz_Lubang_2_Baris: 3, Anjakan_Lubang_X_2_Baris: 0, Anjakan_Lubang_Y_2_Baris: 0,    // Design A - D
  Saiz_Lubang_1_Baris: 3, Anjakan_Lubang_X_1_Baris: -1, Anjakan_Lubang_Y_1_Baris: 1    // Design E, F
};
// Teks 1 baris (Design E, F): kalau terlalu panjang, huruf dikecilkan automatik supaya tak kena lubang / tepi plat.
const LEBAR_HURUF = 0.66;   // anggaran: lebar 1 huruf = 0.66 x saiz huruf. Kalau masih sempit, naikkan sedikit (cth 0.7)
function saiz1(teks) {
  const sz = P.Saiz_Teks_1_Baris ?? 7.5, wmax = (P.Lebar_Plat_1_Baris ?? 55) - 11, n = teks.length || 1;
  return n * LEBAR_HURUF * sz <= wmax ? sz : Math.max(4, Math.floor((wmax / (n * LEBAR_HURUF)) * 2) / 2);
}
function spec() {
  if (prod.type !== "plate") {
    const t = $("#text").value.trim();
    return { scad: prod.scad, t, ok: !!t, dz: P.base_thickness ?? CONFIG.baseThickness,
      params: { keychain_text: t, font_name: $("#font").value, text_size: +$("#size").value, ...P } };
  }
  const d = $("#pl-design").value, top = $("#pl-top").value.trim(), bot = $("#pl-bottom").value.trim(), one = $("#pl-one").value.trim();
  return { scad: prod.scad, t: DUA(d) ? [top, bot].filter(Boolean).join(" / ") : one, ok: DUA(d) ? !!(top || bot) : !!one,
    dz: P.Tebal_Tapak ?? 2.4,
    params: { Bentuk_Plat: d, Teks_Atas: top, Teks_Bawah: bot, Teks_Satu_Baris: one, Nama_Fon: $("#font").value, Gaya_Teks: "Timbul", ...LUBANG, ...P, ...(DUA(d) ? {} : { Saiz_Teks_1_Baris: saiz1(one) }) } };
}
function syncLines() { const two = DUA($("#pl-design").value); $("#pl-two").hidden = !two; $("#pl-single").hidden = two; }
function setProduct() {
  const pl = prod.type === "plate";
  $("#f-nama").hidden = pl; $("#f-plate").hidden = !pl;
  if (prod.maxLen) $("#text").maxLength = prod.maxLen;
  $("#font").innerHTML = ""; prod.fonts.forEach(f => $("#font").add(new Option(f, f)));
  $("#fontwrap").hidden = prod.fonts.length < 2;
  Object.keys(P).forEach(k => delete P[k]); drawAdv(true);
  const ok = colourList().map(c => c.name);                       // pastikan warna dipilih dibenarkan untuk produk ini
  if (!ok.includes(sel.base)) sel.base = ok.includes("Hitam") ? "Hitam" : ok[0];
  if (!ok.includes(sel.text) || sel.text === sel.base) sel.text = ok.find(n => n !== sel.base) || ok[0];
  drawSw(); paint();
  cur = null; syncLines();
  if (ready) { demoFill(); autoRender(); }
}
$("#pl-design").onchange = syncLines;

/* tab */
const tabs = document.querySelectorAll("#tabs button");
tabs.forEach(b => b.onclick = () => {
  tabs.forEach(x => x.setAttribute("aria-selected", x === b));
  document.querySelectorAll(".tab").forEach(s => s.classList.toggle("active", s.id === b.dataset.tab));
  if (b.dataset.tab === "tempah") resize();
});

/* produk, fon, saiz */
CONFIG.products.forEach((p, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "chip"; b.textContent = p.label;
  b.setAttribute("aria-pressed", i === 0);
  b.onclick = () => {
    prod = p; setProduct();
    document.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", x === b));
  };
  $("#prod").appendChild(b);
});
$("#text").maxLength = prod.maxLen;
const fill = r => r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min)) * 100 + "%");
$("#size").oninput = () => { $("#sizeout").textContent = $("#size").value; fill($("#size")); };
fill($("#size"));

/* warna (bulatan) - warna yang sama tak boleh dipilih */
const colourList = () => prod.colours ? CONFIG.colours.filter(c => prod.colours.includes(c.name)) : CONFIG.colours;
function drawSw() {
  for (const k of ["base", "text"]) {
    const other = k === "base" ? "text" : "base", box = $("#sw-" + k);
    box.innerHTML = "";
    colourList().forEach(c => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "sw"; b.style.background = c.hex; b.title = c.name;
      b.setAttribute("role", "radio"); b.setAttribute("aria-label", c.name);
      b.setAttribute("aria-checked", sel[k] === c.name);
      b.disabled = colourList().length > 2 && sel[other] === c.name;      // 2 warna sahaja: klik = tukar ganti
      b.onclick = () => { if (sel[other] === c.name) sel[other] = sel[k]; sel[k] = c.name; drawSw(); paint(); };
      box.appendChild(b);
    });
    $("#nm-" + k).textContent = sel[k];
  }
}

/* preview 3D (Three.js) */
const cv = $("#c"), R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }),
  S = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 1 / 0.62, 0.1, 1000);
cam.up.set(0, 0, 1);
const ctl = new THREE.OrbitControls(cam, cv);
S.add(new THREE.HemisphereLight(0xffffff, 0x777777, 1.1));
const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(40, -60, 100); S.add(dl);
const M = { base: new THREE.MeshStandardMaterial({ roughness: 0.55 }), text: new THREE.MeshStandardMaterial({ roughness: 0.55 }) };
function paint() { M.base.color.set(hex(sel.base)); M.text.color.set(hex(sel.text)); }
function resize() {
  const w = cv.parentElement.clientWidth; if (!w) return;
  R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.setSize(w, w * 0.62, false);
  cv.style.height = w * 0.62 + "px";
}
addEventListener("resize", resize);
(function loop() { requestAnimationFrame(loop); ctl.update(); R.render(S, cam); })();
let grp;
function show(b, t) {
  if (grp) S.remove(grp);
  const L = new THREE.STLLoader(), g = new THREE.Group(),
    mb = new THREE.Mesh(L.parse(b.buffer), M.base), mt = new THREE.Mesh(L.parse(t.buffer), M.text);
  mt.position.z = spec().dz; g.add(mb, mt);
  const bx = new THREE.Box3().setFromObject(g), c = bx.getCenter(new THREE.Vector3()), z = bx.getSize(new THREE.Vector3());
  g.position.sub(c); S.add(g); grp = g;
  const d = Math.max(z.x / cam.aspect, z.y) * 1.9;
  cam.position.set(0, -d * 0.45, d); ctl.target.set(0, 0, 0); cam.lookAt(0, 0, 0);
}

/* tetapan lanjutan (slider dijana daripada CONFIG.params) */
function drawAdv(reset) {
  const box = $("#advbox"); box.innerHTML = "";
  prod.params.forEach(p => {
    if (reset || P[p.key] === undefined) P[p.key] = p.value;
    const l = document.createElement("label"), i = document.createElement("input"), o = document.createElement("output");
    i.type = "range"; i.id = "p-" + p.key; l.htmlFor = i.id; l.append(p.label + ": ", o);
    Object.assign(i, { min: p.min, max: p.max, step: p.step, value: P[p.key] }); o.textContent = P[p.key];
    i.oninput = () => { P[p.key] = +i.value; o.textContent = i.value; fill(i); }; fill(i);
    box.append(l, i);
  });
}
$("#adv-reset").onclick = () => drawAdv(true);

/* gambar preview (latar putih) dan satu fail STL gabungan untuk Telegram */
// Salin kanvas WebGL ke kanvas 2D SEGERA (sebelum buffer dikosongkan), kemudian toBlob (async)
function snap() {
  const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height;
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(cv, 0, 0);
  return new Promise(res => c.toBlob(res, "image/jpeg", 0.92));   // Promise<Blob>
}
function mergeSTL(b, t, dz) {
  const L = new THREE.STLLoader(), gs = [L.parse(b.buffer), L.parse(t.buffer)];
  gs[1].translate(0, 0, dz);
  const n = gs.reduce((a, g) => a + g.attributes.position.count / 3, 0), out = new DataView(new ArrayBuffer(84 + n * 50));
  out.setUint32(80, n, true);
  let o = 84;
  for (const g of gs) {
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 9) {
      const ax = p[i + 3] - p[i], ay = p[i + 4] - p[i + 1], az = p[i + 5] - p[i + 2],
        bx = p[i + 6] - p[i], by = p[i + 7] - p[i + 1], bz = p[i + 8] - p[i + 2];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, l = Math.hypot(nx, ny, nz) || 1;
      [nx / l, ny / l, nz / l, ...p.slice(i, i + 9)].forEach(v => { out.setFloat32(o, v, true); o += 4; });
      o += 2;
    }
  }
  return new Uint8Array(out.buffer);
}

/* worker OpenSCAD */
const W = new Worker("openscad-worker.js", { type: "module" }), st = $("#status"), br = $("#btn-render");
br.disabled = true;
W.onmessage = e => {
  const d = e.data;
  if (d.type === "READY") { ready = true; st.textContent = d.message; demoFill(); render3D(); }
  else if (d.type === "STL_RESULT") {
    show(d.base, d.text); R.render(S, cam);
    const shot = snap(), model = mergeSTL(d.base, d.text, spec().dz), key = pending;
    st.textContent = "⏳ Menyediakan gambar…";
    shot.then(png => {
      br.disabled = false;
      if (!png) st.textContent = "❌ Gambar gagal ditangkap. Ubah sikit input untuk cuba lagi.";
      else { cur = { key, base: d.base, text: d.text, png, model }; st.textContent = "✅ Siap. Seret untuk pusing."; }
      renderDone();
    });
  } else if (d.status) { st.textContent = d.message; if (d.status === "error") { br.disabled = !ready; renderDone(); } }
};
W.onerror = () => { st.textContent = "❌ Worker gagal dimuat. Cuba Ctrl+F5."; };
/* ===== AUTO LIVE PREVIEW ===== */
let busy = false, dirty = false, timer = null;

function demoFill() {      // kotak kosong -> isi contoh supaya preview pertama tak kosong
  const set = (id, v) => { if (!$(id).value.trim()) $(id).value = v; };
  if (prod.type === "plate") { set("#pl-top", "JND"); set("#pl-bottom", "7454"); set("#pl-one", "SD 4723 Y"); }
  else set("#text", "AMMARE");
}
function render3D() {      // hantar ke worker (satu render pada satu masa)
  if (!ready) return;
  if (busy) { dirty = true; return; }                  // sedang render -> ulang selepas siap
  const s = spec();
  if (!s.ok) { st.textContent = "Taip nama / teks dulu."; return; }
  if (cur && cur.key === curKey()) return;             // tiada perubahan -> tak perlu render
  busy = true; dirty = false; pending = curKey();
  W.postMessage({ action: "render", scad: s.scad, params: s.params });
}
function autoRender() {    // debounce 1 saat selepas input berhenti
  clearTimeout(timer);
  if (ready) st.textContent = "✍️ Preview dikemas kini sekejap lagi…";
  timer = setTimeout(render3D, 1000);
}
function renderDone() { busy = false; if (dirty) render3D(); }
$("#tempah").addEventListener("input", e => { if (e.target.id !== "qty") autoRender(); });

/* troli */
const qty = () => cart.reduce((a, i) => a + i.q, 0),
  unit = () => qty() >= CONFIG.bulkQty ? CONFIG.priceBulk : CONFIG.price,
  total = () => qty() * unit(), dep = () => total() * CONFIG.depositPct / 100,
  hint = m => { ($("#cart-modal").open ? $("#hint") : $("#add-hint")).textContent = m; };
function drawCart() {
  const ul = $("#cart"); ul.innerHTML = "";
  cart.forEach((i, n) => {
    const li = document.createElement("li"), r = document.createElement("button");
    li.textContent = `${i.p}: "${i.t}" · ${i.b} / ${i.x} · ×${i.q}`;
    r.type = "button"; r.textContent = "Buang"; r.setAttribute("aria-label", "Buang item " + (n + 1));
    r.onclick = () => { cart.splice(n, 1); drawCart(); };
    li.appendChild(r); ul.appendChild(li);
  });
  $("#total").textContent = cart.length
    ? `Jumlah: ${RM(total())} (${qty()} pcs × ${RM(unit())})` + (qty() >= CONFIG.bulkQty ? ` · Deposit ${CONFIG.depositPct}%: ${RM(dep())}` : "")
    : "Troli kosong.";
  $("#btn-confirm").disabled = !cart.length; updateBadge();
}
$("#btn-add").onclick = () => {
  const s = spec(), t = s.t;
  if (!s.ok) { hint("Taip nama / teks dulu."); return; }
  if (!cur || cur.key !== curKey()) { hint("Tunggu preview siap dulu (beberapa saat)."); return; }
  if (cart.length >= 8) { hint("Maksimum 8 jenis keychain setiap order."); return; }
  cart.push({ p: prod.label + (prod.type === "plate" ? " " + s.params.Bentuk_Plat : ""), t, b: sel.base, x: sel.text, q: Math.max(1, +$("#qty").value || 1), f: $("#font").value, s: s.params.text_size ?? (DUA(s.params.Bentuk_Plat) ? s.params.Saiz_Teks : s.params.Saiz_Teks_1_Baris), pr: { ...P }, stl: cur });
  hint(""); drawCart();
};

/* ===== HANTAR ORDER (Telegram + WhatsApp) ===== */
// 4 digit boleh berulang kalau order banyak. Untuk lebih unik guna: Math.floor(10000 + Math.random() * 90000)
const newOrderId = () => "KC-" + Math.floor(1000 + Math.random() * 9000);   // cth: KC-8472

async function sendToTelegram(order) {   // order = { id, name, phone, area }
  if (!CONFIG.orderApi) return { ok: false };
  try {
    const fd = new FormData();
    fd.append("order", JSON.stringify({ ...order, total: total(), qty: qty(), items: cart.map(({ stl, ...i }) => i) }));
    cart.forEach((i, k) => {
      fd.append("model" + k, new Blob([i.stl.model], { type: "model/stl" }), `item${k + 1}.stl`);
      fd.append("png" + k, i.stl.png, `item${k + 1}.jpg`);
    });
    const r = await fetch(CONFIG.orderApi, { method: "POST", body: fd });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    return { ok: true, failed: j.failed };
  } catch (e) { return { ok: false }; }
}

function buildMessage(o) {
  const items = cart.map((i, k) => `${k + 1}. ${i.p} "${i.t}"\n   Warna: tapak ${i.b}, teks ${i.x}\n   Kuantiti: ${i.q}`).join("\n");
  const bulk = qty() >= CONFIG.bulkQty;
  return `🆕 ORDER BARU\nOrder ID: ${o.id}\nNama: ${o.name}\nNo. Tel: ${o.phone}\nKawasan COD: ${o.area}\n\n${items}\n\nJumlah: ${RM(total())}` +
    (bulk ? `\nDeposit ${CONFIG.depositPct}% (dah dibayar): ${RM(dep())}` : "") +
    `\n\nSaya dah bayar via DuitNow/TNG. 📎 Resit pembayaran saya lampirkan di sini.`;
}

const wa = text => { location.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`; };
$("#wa").href = `https://wa.me/${CONFIG.whatsapp}`;

/* ===== TROLI MODAL (2 langkah: Troli -> Bayaran) ===== */
const modal = $("#cart-modal");

function updateBadge() {
  const n = qty(), b = $("#cart-badge");
  b.textContent = n > 99 ? "99+" : n; b.hidden = n === 0;
  $("#cart-fab").setAttribute("aria-label", `Buka troli, ${n} item`);
  b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
}
function showView(v) {
  $("#cm-v1").hidden = v !== 1; $("#cm-v2").hidden = v !== 2;
  $("#cm-title").textContent = v === 1 ? "Troli anda" : "Bayaran";
}
function openCart() { showView(1); hint(""); if (!modal.open) modal.showModal(); }
function closeCart() { if (modal.open) modal.close(); }

function confirmOrder() {                       // View 1 -> View 2
  const n = $("#cname").value.trim(), p = $("#cphone").value.trim(), a = $("#carea").value.trim();
  if (!cart.length) { hint("Troli kosong."); return; }
  if (!n || !p || !a) { hint("Isi nama, no. telefon dan kawasan COD dulu."); return; }
  if (!/^[0-9+\s-]{9,15}$/.test(p)) { hint("No. telefon tak sah (cth: 0123456789)."); return; }
  hint("");
  const bulk = qty() >= CONFIG.bulkQty;
  $("#pay-total").textContent = RM(bulk ? dep() : total());
  $("#pay-note").textContent = bulk
    ? `Deposit ${CONFIG.depositPct}% daripada jumlah ${RM(total())}. Baki dibayar masa COD.`
    : `Jumlah order: ${RM(total())}.`;
  showView(2);
}

async function sendOrder() {                    // butang akhir: Hantar Order & Resit
  const o = { id: newOrderId(), name: $("#cname").value.trim(), phone: $("#cphone").value.trim(), area: $("#carea").value.trim() };
  const btn = $("#btn-send"), label = btn.textContent;
  btn.disabled = true; btn.textContent = "⏳ Menghantar…";
  await sendToTelegram(o);                      // kalau gagal, tetap teruskan ke WhatsApp
  const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(buildMessage(o))}`;
  closeCart();
  if (!window.open(url, "_blank")) location.href = url;   // popup disekat -> buka di tab sama
  cart = []; drawCart();                        // kosongkan troli supaya tak jadi order berganda
  btn.disabled = false; btn.textContent = label;
}

$("#cart-fab").onclick = openCart;
$("#cm-close").onclick = closeCart;
$("#btn-back").onclick = () => showView(1);
$("#btn-confirm").onclick = confirmOrder;
$("#btn-send").onclick = sendOrder;
modal.addEventListener("click", e => { if (e.target === modal) closeCart(); });  // klik di luar kotak
modal.addEventListener("close", () => showView(1));

$("#cu-send").onclick = () => wa(`Salam, nak minta sebut harga custom:\nIdea: ${$("#cu-text").value}\nSaiz: ${$("#cu-size").value}\nKuantiti/bajet: ${$("#cu-qty").value}\n(Saya hantar gambar rujukan di sini.)`);

/* harga + galeri */
$("#prices").innerHTML = `<tr><th>Kuantiti</th><th>Harga seunit</th></tr><tr><td>1 – ${CONFIG.bulkQty - 1}</td><td>${RM(CONFIG.price)}</td></tr><tr><td>${CONFIG.bulkQty} ke atas</td><td>${RM(CONFIG.priceBulk)}</td></tr>`;
$("#dnote").textContent = `Order ${CONFIG.bulkQty} pcs ke atas dan order custom: deposit ${CONFIG.depositPct}%.`;

drawSw(); paint(); drawCart(); setProduct(); resize();
