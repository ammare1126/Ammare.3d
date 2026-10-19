// openscad-worker.js  (letak di ROOT repo, sebelah app.js)
// Dimuat oleh app.js sebagai module worker.
// Enjin: wasm/openscad.js (eksport: createOpenSCAD). Wasm sudah tertanam dalam fail tu.

const FONTS = ['Lobster-Regular.ttf', 'Pacifico-Regular.ttf']; // dicari dalam folder wasm/
const SCAD_URL = './wasm/keychain.scad';

let inst = null;          // instance OpenSCAD (ada FS dan callMain)
let scadSource = '';
let logLines = [];        // simpan mesej OpenSCAD untuk papar kalau ada error

// Path relatif kepada fail worker ini (selamat untuk GitHub Pages)
const url = p => new URL(p, import.meta.url);

async function fetchOk(path) {
    const r = await fetch(url(path));
    if (!r.ok) throw new Error(`${path} gagal dimuat (HTTP ${r.status})`);
    return r;
}

function msgOf(err) {
    return err && err.message ? err.message : String(err);
}

async function init() {
    try {
        postMessage({ status: 'rendering', message: '⏳ Loading engine 3D...' });

        let mod;
        try {
            mod = await import('./wasm/openscad.js');
        } catch (err) {
            throw new Error('import wasm/openscad.js gagal: ' + msgOf(err) +
                ' | cek fail wujud di: ' + url('./wasm/openscad.js').href);
        }
        if (typeof mod.createOpenSCAD !== 'function') {
            throw new Error('openscad.js tiada createOpenSCAD. Export dijumpai: ' +
                (Object.keys(mod).join(', ') || '(tiada)'));
        }

        // createOpenSCAD() memulangkan pembalut; getInstance() beri FS + callMain
        const wrapper = await mod.createOpenSCAD({
            noInitialRun: true,
            print: m => { logLines.push(String(m)); console.log('[openscad]', m); },
            printErr: m => { logLines.push(String(m)); console.warn('[openscad]', m); }
        });
        inst = wrapper.getInstance();

        // 1) Baca keychain.scad
        scadSource = await (await fetchOk(SCAD_URL)).text();

        // 2) Sediakan folder /fonts + fonts.conf supaya OpenSCAD jumpa fon
        try { inst.FS.mkdir('/fonts'); } catch (_) {}
        try {
            inst.FS.writeFile('/fonts/fonts.conf',
                '<?xml version="1.0"?>\n' +
                '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n' +
                '<fontconfig>\n' +
                '  <dir>/fonts</dir>\n' +
                '  <cachedir>/tmp/fonts-cache</cachedir>\n' +
                '</fontconfig>\n');
        } catch (_) {}

        // 3) Muat fon. Tulis di dua tempat: /fonts (fontconfig) dan / (untuk `use <fon.ttf>`)
        const available = new Set();
        for (const f of FONTS) {
            try {
                const buf = new Uint8Array(await (await fetchOk('./wasm/' + f)).arrayBuffer());
                inst.FS.writeFile('/fonts/' + f, buf);
                inst.FS.writeFile('/' + f, buf);
                available.add(f);
            } catch (err) {
                console.warn('[worker] fon tiada, dilangkau:', f);
            }
        }

        // 4) Buang baris `use <fon.ttf>;` untuk fon yang tiada (cth Pacifico)
        scadSource = scadSource.replace(
            /^\s*use\s*<([^>]+\.ttf)>\s*;?\s*$/gim,
            (line, f) => (available.has(f) ? line : `// fon tiada: ${f}`)
        );

        postMessage({ type: 'READY', message: '✅ Engine siap. Tekan Generate Preview.' });
    } catch (err) {
        console.error('[worker] init gagal:', err);
        postMessage({ status: 'error', message: 'Engine gagal load: ' + msgOf(err) });
    }
}

function renderPart(part, params) {
    try { inst.FS.unlink('/out.stl'); } catch (_) {}
    inst.FS.writeFile('/input.scad', scadSource);
    logLines = [];
    const args = ['/input.scad', '-o', '/out.stl', '-D', `Pilihan_Cetak="${part}"`, '-D', '$fn=24'];
    for (const [k, v] of Object.entries(params)) {
        const val = typeof v === 'number' ? v : '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
        args.push('-D', `${k}=${val}`);
    }
    try { inst.callMain(args); } catch (err) { console.warn('[worker] callMain:', err); }
    try { return inst.FS.readFile('/out.stl'); }
    catch (_) { throw new Error('STL tak terhasil (' + part + '): ' + (logLines.slice(-6).join(' | ') || 'tiada mesej')); }
}

onmessage = e => {
    const { action, params } = e.data || {};
    if (action !== 'render') return;
    if (!inst) { postMessage({ status: 'error', message: 'Engine belum siap.' }); return; }
    postMessage({ status: 'rendering', message: '⏳ Rendering model...' });
    try {
        const base = renderPart('Tapak Sahaja', params || {});
        const text = renderPart('Teks Sahaja', params || {});
        postMessage({ type: 'STL_RESULT', base, text }, [base.buffer, text.buffer]);
    } catch (err) {
        console.error('[worker] render gagal:', err);
        postMessage({ status: 'error', message: 'Render gagal: ' + msgOf(err) });
    }
};

init();
