// ==========================================
// ⚙️ SETTINGS SECTION (Easy for beginners to edit)
// ==========================================
const CONFIG = {
    phone: "60178422719",
    priceNormal: 5,
    priceBulk: 4,
    bulkThreshold: 10,
    products: [
        { id: "kc_nama", name: "Keychain Nama" },
        { id: "kc_plate", name: "Keychain No Plate" }
    ],
    colors: [
        "Putih", "Hitam", "Merah", "Jingga", "Biru", 
        "Kuning", "Purple", "Pink", "Biru pekat", "Hijau"
    ]
};

let cart = [];

// Initialize Page
window.onload = () => {
    // Populate products
    const prodSelect = document.getElementById("product-select");
    CONFIG.products.forEach(p => {
        prodSelect.innerHTML += `<option value="${p.name}">${p.name}</option>`;
    });

    // Populate colors
    const baseSelect = document.getElementById("base-color");
    const textSelect = document.getElementById("text-color");
    CONFIG.colors.forEach(c => {
        baseSelect.innerHTML += `<option value="${c}">${c}</option>`;
        textSelect.innerHTML += `<option value="${c}">${c}</option>`;
    });

    // Set prices in text
    document.getElementById("display-price").innerText = CONFIG.priceNormal;
    document.getElementById("display-bulk").innerText = CONFIG.priceBulk;
};

// Tab Switching
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// Block same colors
function checkColors() {
    const base = document.getElementById("base-color").value;
    const text = document.getElementById("text-color").value;
    const warning = document.getElementById("color-warning");
    
    if (base === text) {
        warning.innerText = "Amaran: Warna Tapak dan Teks sama. Teks takkan nampak timbul!";
        warning.style.display = "block";
    } else {
        warning.style.display = "none";
    }
}

// Add to Cart
function addToCart() {
    const prod = document.getElementById("product-select").value;
    const text = document.getElementById("order-text").value || "Kosong";
    const base = document.getElementById("base-color").value;
    const textColor = document.getElementById("text-color").value;
    const qty = parseInt(document.getElementById("order-qty").value);

    if (base === textColor) {
        alert("Sila tukar warna, tapak dan teks tak boleh sama!");
        return;
    }

    cart.push({ prod, text, base, textColor, qty });
    updateCartUI();
}

function updateCartUI() {
    const list = document.getElementById("cart-items");
    list.innerHTML = "";
    let totalQty = 0;
    
    cart.forEach(item => totalQty += item.qty);
    
    let pricePerItem = totalQty >= CONFIG.bulkThreshold ? CONFIG.bulkBulk : CONFIG.priceNormal;
    let totalPrice = 0;

    cart.forEach((item, index) => {
        let itemTotal = item.qty * pricePerItem;
        totalPrice += itemTotal;
        list.innerHTML += `<li>${item.qty}x ${item.prod} (${item.text}) - Base: ${item.base}, Text: ${item.textColor}</li>`;
    });

    document.getElementById("cart-total").innerText = totalPrice;
}

// Send to WhatsApp
function sendToWhatsApp() {
    if (cart.length === 0) { alert("Troli kosong!"); return; }
    
    const custName = document.getElementById("cust-name").value || "Pelanggan";
    const custArea = document.getElementById("cust-area").value || "Tak Nyatakan";
    
    let msg = `Hai Ammare.3d! Saya ${custName} dari kawasan ${custArea} nak order:\n\n`;
    
    cart.forEach((item, i) => {
        msg += `${i+1}. ${item.qty}x ${item.prod}\n   Teks: ${item.text}\n   Base: ${item.base} | Teks: ${item.textColor}\n\n`;
    });
    
    msg += `Total Bayaran: RM${document.getElementById("cart-total").innerText}\n`;
    msg += `Method: COD/Meetup\nTerima kasih! 🚀`;

    const url = `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
}

function sendGeneralWhatsApp() {
    window.open(`https://wa.me/${CONFIG.phone}?text=Hai Ammare.3d, saya nak tanya sikit.`, "_blank");
}

function sendCustomToWhatsApp() {
    const idea = document.getElementById("custom-idea").value;
    const budget = document.getElementById("custom-budget").value;
    const msg = `Hai! Saya ada idea custom:\nIdea: ${idea}\nBajet: ${budget}\n\nSaya akan send gambar rujukan kejap lagi!`;
    window.open(`https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(msg)}`, "_blank");
}

// ==========================================
// 🛠️ OPENSCAD WEB WORKER LOGIC
// ==========================================
let worker;
function initWorker() {
    if (window.Worker) {
        worker = new Worker('openscad-worker.js');
        worker.onmessage = function(e) {
            if (e.data.type === "READY") {
                document.getElementById("loading-state").innerText = "3D Engine Ready! ✅";
            } else if (e.data.type === "STL_RESULT") {
                document.getElementById("loading-state").innerText = "Preview generated! (In development)";
                // Here we would parse STL data to Three.js canvas. 
                // Since this requires a massive 3D library (Three.js), 
                // for Phase 1 we return a success status to show it worked.
            }
        };
    }
}
initWorker();

function render3D() {
    document.getElementById("loading-state").innerText = "Tengah generate 3D... Jangan tutup screen.";
    const text = document.getElementById("order-text").value || "AMMARE";
    
    // Send variables to the worker
    worker.postMessage({
        action: "render",
        text: text
    });
}