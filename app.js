import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ================= CONFIG (tukar ikut kehendak) ================= */
const WHATSAPP_NO = '60123456789'; // ganti nombor awak, format 60xxxxxxxxx
const PRODUCTS = [
    { name: 'Keychain Nama',     price: 8,  bulk: 6 },
    { name: 'Keychain No Plate', price: 10, bulk: 8 }
];
const COLORS = [
    { name: 'Hitam',  hex: '#111111' },
    { name: 'Putih',  hex: '#f5f5f5' },
    { name: 'Merah',  hex: '#e53935' },
    { name: 'Biru',   hex: '#1e88e5' },
    { name: 'Hijau',  hex: '#43a047' },
    { name: 'Kuning', hex: '#fdd835' },
    { name: 'Pink',   hex: '#ff1493' }
];
/* ================================================================ */

const $ = id => document.getElementById(id);
let cart = [];
let engineReady = false;

/* ---------- Tab ---------- */
function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}

/* ---------- Init borang ---------- */
function fillSelect(el, items, labelFn) {
    el.innerHTML = items.map(i => `<option value="${labelFn(i)}">${labelFn(i)}</option>`).join('');
}
fillSelect($('product-select'), PRODUCTS, p => p.name);
fillSelect($('base-color'), COLORS, c => c.name);
fillSelect($('text-color'), COLORS, c => c.name);
$('text-color').selectedIndex = 1; // default: tapak hitam, teks putih

$('price-box').innerHTML = PRODUCTS.map(p =>
    `<h3>${p.name}: RM ${p.price} / pcs</h3><p>Pukal (10+): RM ${p.bulk} / pcs</p>`
).join('');

function checkColors() {
    const same = $('base-color').value === $('text-color').value;
    $('color-warning').textContent = same ? '⚠️ Warna tapak & teks sama, teks tak akan nampak!' : '';
    return !same;
}

function getProduct() {
    return PRODUCTS.find(p => p.name === $('product-select').value);
}
function cleanText(t) {
    return t.replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, 8);
}

/* ---------- Worker & 3D ---------- */
   const worker = new Worker('openscad-worker.js', { type: 'module' });
const loadingEl = $('loading-state');
const renderBtn = $('render-btn');

worker.onmessage = e => {
    const d = e.data;
    if (d.status === 'rendering') {
        loadingEl.style.display = 'block';
        loadingEl.textContent = d.message;
        renderBtn.disabled = true;
    } else if (d.type === 'READY') {
        engineReady = true;
        loadingEl.textContent = d.message;
        renderBtn.disabled = false;
    } else if (d.type === 'STL_RESULT') {
        loadingEl.style.display = 'none';
        renderBtn.disabled = false;
        showSTL(d.data);
    } else if (d.status === 'error') {
        loadingEl.style.display = 'block';
        loadingEl.textContent = '❌ ' + d.message;
        renderBtn.disabled = !engineReady;
    }
};
worker.onerror = err => {
    loadingEl.textContent = '❌ Worker error: ' + (err.message || 'tak dapat load worker.js');
};

function render3D() {
    const text = cleanText($('order-text').value);
    if (!text) return alert('Taip nama / teks dulu!');
    worker.postMessage({ action: 'render', product: $('product-select').value, text });
}

let scene, camera, renderer, controls, mesh;
function initViewer() {
    const box = $('viewer');
    box.style.display = 'block';
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);
    camera = new THREE.PerspectiveCamera(45, box.clientWidth / box.clientHeight, 0.1, 2000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(box.clientWidth, box.clientHeight);
    box.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(1, 2, 3);
    scene.add(dir);
    controls = new OrbitControls(camera, renderer.domElement);
    (function loop() {
        requestAnimationFrame(loop);
        controls.update();
        renderer.render(scene, camera);
    })();
}

function showSTL(data) {
    if (!renderer) initViewer();
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    const geo = new STLLoader().parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    geo.center();
    geo.computeBoundingSphere();
    const base = COLORS.find(c => c.name === $('base-color').value);
    mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: base ? base.hex : 0xff1493 }));
    scene.add(mesh);
    const r = geo.boundingSphere.radius;
    camera.position.set(0, -r * 1.2, r * 2.2);
    controls.target.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
}

/* ---------- Troli ---------- */
function unitPrice(item) {
    const p = PRODUCTS.find(x => x.name === item.product);
    return item.qty >= 10 ? p.bulk : p.price;
}

function addToCart() {
    const text = cleanText($('order-text').value);
    const qty = parseInt($('order-qty').value, 10);
    if (!text) return alert('Taip nama / teks dulu!');
    if (!qty || qty < 1) return alert('Kuantiti tak sah.');
    if (!checkColors()) return alert('Tukar warna teks atau tapak dulu.');
    if (!$('cust-name').value.trim() || !$('cust-area').value.trim())
        return alert('Isi nama dan kawasan COD.');

    cart.push({
        product: $('product-select').value,
        text, qty,
        base: $('base-color').value,
        textColor: $('text-color').value
    });
    renderCart();
}

function removeItem(i) {
    cart.splice(i, 1);
    renderCart();
}

function renderCart() {
    let total = 0;
    $('cart-items').innerHTML = cart.map((it, i) => {
        const sub = unitPrice(it) * it.qty;
        total += sub;
        return `<li><span>${it.qty}x ${it.product} "${it.text}" (${it.base}/${it.textColor}) - RM ${sub}</span>
                <button onclick="removeItem(${i})">✕</button></li>`;
    }).join('');
    $('cart-total').textContent = total;
}

function openWA(msg) {
    window.open(`https://wa.me/${WHATSAPP_NO}?text=${encodeURIComponent(msg)}`, '_blank');
}

function sendToWhatsApp() {
    if (!cart.length) return alert('Troli kosong.');
    let msg = `Hai Ammare.3d! Saya nak order:\n\n`;
    let total = 0;
    cart.forEach((it, i) => {
        const sub = unitPrice(it) * it.qty;
        total += sub;
        msg += `${i + 1}. ${it.product}\n   Teks: ${it.text}\n   Tapak: ${it.base} | Teks: ${it.textColor}\n   Qty: ${it.qty} = RM ${sub}\n`;
    });
    msg += `\nTotal: RM ${total}\nNama: ${$('cust-name').value}\nKawasan COD: ${$('cust-area').value}`;
    if (cart.some(i => i.qty >= 10)) msg += `\n(Order 10+ , deposit 50%)`;
    openWA(msg);
}

function sendCustomToWhatsApp() {
    const idea = $('custom-idea').value.trim();
    if (!idea) return alert('Isi idea awak dulu.');
    openWA(`Hai Ammare.3d! Saya ada idea custom:\n${idea}\nBajet: ${$('custom-budget').value || '-'}`);
}

/* ---------- Expose untuk onclick (sebab type="module") ---------- */
Object.assign(window, {
    showTab, checkColors, render3D, addToCart, removeItem, sendToWhatsApp, sendCustomToWhatsApp
});
