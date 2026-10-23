// openscad-worker.js  (letak di ROOT repo, sebelah app.js)
// Dimuat oleh app.js sebagai module worker.
// Setiap bahagian (tapak / teks) dirender dengan instance OpenSCAD BARU,
// sebab callMain tak boleh dipanggil dua kali pada instance yang sama.

const FONTS = ['Lobster-Regular.ttf', 'Pacifico-Regular.ttf', 'CharlesWright-Bold.otf']; // dicari dalam folder wasm/
const scadCache = {};   // nama fail .scad -> kod (dimuat bila perlu)

let mod = null;
let fontBufs = {};        // nama fail -> Uint8Array
let warm = null;          // instance pertama, disediakan masa init
let logLines = [];

const url = p => new URL(p, import.meta.url);
const msgOf = err => (err && err.message ? err.message : String(err));

async function fetchOk(path) {
    const r = await fetch(url(path));
    if (!r.ok) throw new Error(`${path} gagal dimuat (HTTP ${r.status})`);
    return r;
}

async function freshInstance() {
    const w = await mod.createOpenSCAD({
        noInitialRun: true,
        print: m => { logLines.push(String(m)); console.log('[openscad]', m); },
        printErr: m => { logLines.push(String(m)); console.warn('[openscad]', m); }
    });
    const i = w.getInstance();
    try { i.FS.mkdir('/fonts'); } catch (_) {}
    try {
        i.FS.writeFile('/fonts/fonts.conf',
            '<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n' +
            '<fontconfig>\n  <dir>/fonts</dir>\n  <cachedir>/tmp/fonts-cache</cachedir>\n</fontconfig>\n');
    } catch (_) {}
    for (const [f, buf] of Object.entries(fontBufs)) {
        i.FS.writeFile('/fonts/' + f, buf);   // untuk fontconfig
        i.FS.writeFile('/' + f, buf);         // untuk `use <fon.ttf>`
    }
    return i;
}

async function prepScad(name) {
    let src = await (await fetchOk('./wasm/' + name)).text();
    // buang `use <fon>` untuk fon yang tiada, kemudian daftar semua fon yang ada
    src = src.replace(/^\s*use\s*<([^>]+\.(?:ttf|otf))>\s*;?\s*$/gim, (line, f) => (fontBufs[f] ? line : `// fon tiada: ${f}`));
    return Object.keys(fontBufs).map(f => `use <${f}>;\n`).join('') + src;
}

async function init() {
    try {
        postMessage({ status: 'rendering', message: '⏳ Loading engine 3D...' });
        try {
            mod = await import('./wasm/openscad.js');
        } catch (err) {
            throw new Error('import wasm/openscad.js gagal: ' + msgOf(err));
        }
        if (typeof mod.createOpenSCAD !== 'function') {
            throw new Error('openscad.js tiada createOpenSCAD. Export: ' + Object.keys(mod).join(', '));
        }

        for (const f of FONTS) {
            try {
                fontBufs[f] = new Uint8Array(await (await fetchOk('./wasm/' + f)).arrayBuffer());
            } catch (_) {
                console.warn('[worker] fon tiada, dilangkau:', f);
            }
        }
        scadCache['keychain.scad'] = await prepScad('keychain.scad');

        warm = await freshInstance();   // pastikan enjin betul-betul boleh start
        postMessage({ type: 'READY', message: '✅ Engine siap. Tekan Generate Preview.' });
    } catch (err) {
        console.error('[worker] init gagal:', err);
        postMessage({ status: 'error', message: 'Engine gagal load: ' + msgOf(err) });
    }
}

async function renderPart(part, params, scad) {
    const inst = warm || await freshInstance();
    warm = null;
    logLines = [];
    inst.FS.writeFile('/input.scad', scadCache[scad] ||= await prepScad(scad));
    const args = ['/input.scad', '-o', '/out.stl', '-D', `Pilihan_Cetak="${part}"`, '-D', '$fn=24'];
    for (const [k, v] of Object.entries(params)) {
        const val = typeof v === 'number' || typeof v === 'boolean' ? v : '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
        args.push('-D', `${k}=${val}`);
    }
    try { inst.callMain(args); } catch (err) { console.warn('[worker] callMain:', err); }
    try {
        return inst.FS.readFile('/out.stl');
    } catch (_) {
        throw new Error('STL tak terhasil (' + part + '): ' + (logLines.slice(-6).join(' | ') || 'tiada mesej'));
    }
}

onmessage = async e => {
    const { action, params, scad } = e.data || {};
    if (action !== 'render') return;
    if (!mod) { postMessage({ status: 'error', message: 'Engine belum siap.' }); return; }
    postMessage({ status: 'rendering', message: '⏳ Rendering model...' });
    try {
        const base = await renderPart('Tapak Sahaja', params || {}, scad || 'keychain.scad');
        const text = await renderPart('Teks Sahaja', params || {}, scad || 'keychain.scad');
        postMessage({ type: 'STL_RESULT', base, text }, [base.buffer, text.buffer]);
    } catch (err) {
        console.error('[worker] render gagal:', err);
        postMessage({ status: 'error', message: 'Render gagal: ' + msgOf(err) });
    }
};

init();
