// openscad-worker.js  (letak di ROOT repo, sebelah app.js)
// Dimuat oleh app.js sebagai module worker.
// Setiap bahagian (tapak / teks) dirender dengan instance OpenSCAD BARU,
// sebab callMain tak boleh dipanggil dua kali pada instance yang sama.

const FONTS = ['Lobster-Regular.ttf', 'Pacifico-Regular.ttf']; // dicari dalam folder wasm/
const SCAD_URL = './wasm/keychain.scad';

let mod = null;
let scadSource = '';
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

        scadSource = await (await fetchOk(SCAD_URL)).text();

        for (const f of FONTS) {
            try {
                fontBufs[f] = new Uint8Array(await (await fetchOk('./wasm/' + f)).arrayBuffer());
            } catch (_) {
                console.warn('[worker] fon tiada, dilangkau:', f);
            }
        }
        // Buang baris `use <fon.ttf>;` untuk fon yang tiada (cth Pacifico)
        scadSource = scadSource.replace(
            /^\s*use\s*<([^>]+\.ttf)>\s*;?\s*$/gim,
            (line, f) => (fontBufs[f] ? line : `// fon tiada: ${f}`)
        );

        warm = await freshInstance();   // pastikan enjin betul-betul boleh start
        postMessage({ type: 'READY', message: '✅ Engine siap. Tekan Generate Preview.' });
    } catch (err) {
        console.error('[worker] init gagal:', err);
        postMessage({ status: 'error', message: 'Engine gagal load: ' + msgOf(err) });
    }
}

async function renderPart(part, params) {
    const inst = warm || await freshInstance();
    warm = null;
    logLines = [];
    inst.FS.writeFile('/input.scad', scadSource);
    const args = ['/input.scad', '-o', '/out.stl', '-D', `Pilihan_Cetak="${part}"`, '-D', '$fn=24'];
    for (const [k, v] of Object.entries(params)) {
        const val = typeof v === 'number' ? v : '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
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
    const { action, params } = e.data || {};
    if (action !== 'render') return;
    if (!mod) { postMessage({ status: 'error', message: 'Engine belum siap.' }); return; }
    postMessage({ status: 'rendering', message: '⏳ Rendering model...' });
    try {
        const base = await renderPart('Tapak Sahaja', params || {});
        const text = await renderPart('Teks Sahaja', params || {});
        postMessage({ type: 'STL_RESULT', base, text }, [base.buffer, text.buffer]);
    } catch (err) {
        console.error('[worker] render gagal:', err);
        postMessage({ status: 'error', message: 'Render gagal: ' + msgOf(err) });
    }
};

init();
