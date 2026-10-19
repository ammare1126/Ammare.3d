/* ===== TETAPAN: ubah di sini sahaja ===== */
const CONFIG = {
  whatsapp: "60178422719",
  orderApi: "",     // URL Cloudflare Worker (isi lepas siap setup Telegram)
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
    { label: "Keychain Nama", maxLen: 12 },
    { label: "Keychain No Plate", maxLen: 8 }
    // produk baru: salin satu baris di atas dan tukar label
  ],
  fonts: ["Lobster"],  // nama fon dalam keychain.scad (fail .ttf dalam folder wasm)
  gallery: []          // cth: ["k1.jpg", "k2.jpg"] (fail dalam folder gallery/)
};
/* ===== TAMAT TETAPAN ===== */

const $ = s => document.querySelector(s), RM = n => "RM" + n;
const hex = n => CONFIG.colours.find(c => c.name === n).hex;
let prod = CONFIG.products[0], sel = { base: "Hitam", text: "Putih" }, cart = [], ready = false;
let cur = null, pending = "";
const curKey = () => [$("#text").value.trim(), $("#font").value, $("#size").value].join("|");

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
    prod = p; $("#text").maxLength = p.maxLen;
    document.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", x === b));
  };
  $("#prod").appendChild(b);
});
$("#text").maxLength = prod.maxLen;
CONFIG.fonts.forEach(f => $("#font").add(new Option(f, f)));
$("#fontwrap").hidden = CONFIG.fonts.length < 2;
$("#size").oninput = () => $("#sizeout").textContent = $("#size").value;

/* warna (bulatan) - warna yang sama tak boleh dipilih */
function drawSw() {
  for (const k of ["base", "text"]) {
    const other = k === "base" ? "text" : "base", box = $("#sw-" + k);
    box.innerHTML = "";
    CONFIG.colours.forEach(c => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "sw"; b.style.background = c.hex; b.title = c.name;
      b.setAttribute("role", "radio"); b.setAttribute("aria-label", c.name);
      b.setAttribute("aria-checked", sel[k] === c.name);
      b.disabled = sel[other] === c.name;
      b.onclick = () => { sel[k] = c.name; drawSw(); paint(); };
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
  mt.position.z = CONFIG.baseThickness; g.add(mb, mt);
  const bx = new THREE.Box3().setFromObject(g), c = bx.getCenter(new THREE.Vector3()), z = bx.getSize(new THREE.Vector3());
  g.position.sub(c); S.add(g); grp = g;
  const d = Math.max(z.x / cam.aspect, z.y) * 1.9;
  cam.position.set(0, -d * 0.45, d); ctl.target.set(0, 0, 0); cam.lookAt(0, 0, 0);
}

/* worker OpenSCAD */
const W = new Worker("openscad-worker.js", { type: "module" }), st = $("#status"), br = $("#btn-render");
br.disabled = true;
W.onmessage = e => {
  const d = e.data;
  if (d.type === "READY") { ready = true; br.disabled = false; st.textContent = d.message; }
  else if (d.type === "STL_RESULT") {
    show(d.base, d.text); br.disabled = false; st.textContent = "✅ Siap. Seret untuk pusing.";
    R.render(S, cam); cur = { key: pending, base: d.base, text: d.text, png: cv.toDataURL("image/png") };
  } else if (d.status) { st.textContent = d.message; if (d.status === "error") br.disabled = !ready; }
};
W.onerror = () => { st.textContent = "❌ Worker gagal dimuat. Cuba Ctrl+F5."; };
br.onclick = () => {
  const t = $("#text").value.trim();
  if (!t) { st.textContent = "Taip nama dulu."; return; }
  br.disabled = true; pending = curKey();
  W.postMessage({ action: "render", params: { keychain_text: t, font_name: $("#font").value, text_size: +$("#size").value } });
};

/* troli */
const qty = () => cart.reduce((a, i) => a + i.q, 0),
  unit = () => qty() >= CONFIG.bulkQty ? CONFIG.priceBulk : CONFIG.price,
  total = () => qty() * unit(), dep = () => total() * CONFIG.depositPct / 100,
  hint = m => $("#hint").textContent = m;
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
  $("#btn-send").disabled = !cart.length;
}
$("#btn-add").onclick = () => {
  const t = $("#text").value.trim();
  if (!t) { hint("Taip nama / teks dulu."); return; }
  if (!cur || cur.key !== curKey()) { hint("Tekan 'Jana preview 3D' dulu untuk nama ini."); return; }
  if (cart.length >= 8) { hint("Maksimum 8 jenis keychain setiap order."); return; }
  cart.push({ p: prod.label, t, b: sel.base, x: sel.text, q: Math.max(1, +$("#qty").value || 1), f: $("#font").value, s: +$("#size").value, stl: cur });
  hint(""); drawCart();
};

/* hantar order ke Telegram (melalui Cloudflare Worker) */
async function submitOrder(name, area) {
  if (!CONFIG.orderApi) return "";
  const btn = $("#btn-send"); btn.disabled = true; hint("⏳ Menghantar order…");
  try {
    const fd = new FormData();
    fd.append("order", JSON.stringify({ name, area, total: total(), qty: qty(), items: cart.map(({ stl, ...i }) => i) }));
    for (const [k, i] of cart.entries()) {
      fd.append("base" + k, new Blob([i.stl.base]), `item${k + 1}-tapak.stl`);
      fd.append("text" + k, new Blob([i.stl.text]), `item${k + 1}-teks.stl`);
      fd.append("png" + k, await (await fetch(i.stl.png)).blob(), `item${k + 1}.png`);
    }
    const r = await fetch(CONFIG.orderApi, { method: "POST", body: fd });
    if (!r.ok) throw new Error(r.status);
    hint("✅ Order diterima."); return (await r.json()).id;
  } catch (e) { hint("Order tak sampai ke sistem. Teruskan di WhatsApp sahaja."); return ""; }
  finally { btn.disabled = !cart.length; }
}

/* WhatsApp */
const wa = text => open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`, "_blank");
$("#wa").href = `https://wa.me/${CONFIG.whatsapp}`;
$("#btn-send").onclick = async () => {
  const n = $("#cname").value.trim(), a = $("#carea").value.trim();
  if (!n || !a) { hint("Isi nama dan kawasan/hari COD dulu."); return; }
  const id = await submitOrder(n, a);
  wa("Salam, saya nak order" + (id ? ` (ID: ${id})` : "") + ":\n" +
    cart.map((i, k) => `${k + 1}. ${i.p} "${i.t}" | tapak ${i.b}, teks ${i.x} | fon ${i.f}, saiz ${i.s} | ×${i.q}`).join("\n") +
    `\n\nJumlah: ${RM(total())}` + (qty() >= CONFIG.bulkQty ? ` (deposit ${CONFIG.depositPct}%: ${RM(dep())})` : "") +
    `\nNama: ${n}\nCOD / pickup: ${a}`);
};
$("#cu-send").onclick = () => wa(`Salam, nak minta sebut harga custom:\nIdea: ${$("#cu-text").value}\nSaiz: ${$("#cu-size").value}\nKuantiti/bajet: ${$("#cu-qty").value}\n(Saya hantar gambar rujukan di sini.)`);

/* harga + galeri */
$("#prices").innerHTML = `<tr><th>Kuantiti</th><th>Harga seunit</th></tr><tr><td>1 – ${CONFIG.bulkQty - 1}</td><td>${RM(CONFIG.price)}</td></tr><tr><td>${CONFIG.bulkQty} ke atas</td><td>${RM(CONFIG.priceBulk)}</td></tr>`;
$("#dnote").textContent = `Order ${CONFIG.bulkQty} pcs ke atas dan order custom: deposit ${CONFIG.depositPct}%.`;
$("#grid").innerHTML = CONFIG.gallery.length ? "" : "<p class='mute'>Galeri akan datang.</p>";
CONFIG.gallery.forEach(f => { const i = new Image(); i.src = "gallery/" + f; i.alt = "Keychain siap"; i.loading = "lazy"; $("#grid").appendChild(i); });

drawSw(); paint(); drawCart(); resize();
