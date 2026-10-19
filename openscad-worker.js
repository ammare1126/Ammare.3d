// openscad-worker.js  (letak di ROOT repo, sebelah app.js)
// Dimuat oleh app.js sebagai module worker.
// NOTA: guna dynamic import() (bukan `import ... from`) supaya kalau fail
// openscad.js bermasalah, error sebenar boleh ditangkap dan dipaparkan.

const FONTS = ['Lobster-Regular.ttf', 'Pacifico-Regular.ttf']; // dicari dalam folder wasm/
const SCAD_URL = './wasm/keychain.scad';

let inst = null;
let scadSource = '';

// Path relatif kepada fail worker ini (selamat untuk GitHub Pages)
const url = p => new URL(p, import.meta.url);

async function fetchOk(path) {
    const r = await fetch(url(path));
    if (!r.ok) throw new Error(`${path} gagal dimuat (HTTP ${r.status})`);
    return r;
}

async function init() {
    try {
        postMessage({ status: 'rendering', message: '⏳ Loading engine 3D...' });

        let mod;
        try {
            mod = await import('./wasm/openscad.js');
        } catch (err) {
            throw new Error('import wasm/openscad.js gagal: ' + (err && err.message ? err.message : err) +
                ' | cek fail wujud di: ' + url('./wasm/openscad.js').href);
        }
        const OpenSCAD = mod.default || mod.OpenSCAD;
        if (typeof OpenSCAD !== 'function') {
            throw new Error('openscad.js tiada export yang sesuai. Export dijumpai: ' +
                (Object.keys(mod).join(', ') || '(tiada)'));
        }

        inst = await OpenSCAD({
            noInitialRun: true,
            print: m => console.log('[openscad]', m),
            printErr: m => console.warn('[openscad]', m)
        });

        // 1) Baca keychain.scad
        scadSource = await (await fetchOk(SCAD_URL)).text();

        // 2) Daftar fon ke sistem fail maya. Fon yang tiada dalam repo diabaikan.
        const available = new Set();
        for (const f of FONTS) {
            try {
                const buf = new Uint8Array(await (await fetchOk('./wasm/' + f)).arrayBuffer());
                inst.FS.writeFile('/' + f, buf);
                available.add(f);
            } catch (err) {
                console.warn('[worker] fon tiada, dilangkau:', f);
            }
        }

        // 3) Buang baris `use <fon.ttf>;` untuk fon yang tiada (cth Pacifico)
        scadSource = scadSource.replace(
            /^\s*use\s*<([^>]+\.ttf)>\s*;?\s*$/gim,
            (line, f) => (available.has(f) ? line : `// fon tiada: ${f}`)
        );

        postMessage({ type: 'READY', message: '✅ Engine siap. Tekan Generate Preview.' });
    } catch (err) {
        console.error('[worker] init gagal:', err);
        postMessage({ status: 'error', message: 'Engine gagal load: ' + (err && err.message ? err.message : err) });
    }
}

onmessage = e => {
    const { action, text } = e.data || {};
    if (action !== 'render') return;
    if (!inst) {
        postMessage({ status: 'error', message: 'Engine belum siap.' });
        return;
    }

    postMessage({ status: 'rendering', message: '⏳ Rendering model...' });

    try {
        try { inst.FS.unlink('/out.stl'); } catch (_) {}
        inst.FS.writeFile('/input.scad', scadSource);

        try {
            inst.callMain([
                '/input.scad',
                '--enable=manifold',
                '-o', '/out.stl',
                '-D', `keychain_text="${text}"`
            ]);
        } catch (err) {
            // Emscripten kadang throw bila program tamat; semak sama ada STL wujud
            console.warn('[worker] callMain:', err);
        }

        const out = inst.FS.readFile('/out.stl');
        postMessage({ type: 'STL_RESULT', data: out }, [out.buffer]);
    } catch (err) {
        console.error('[worker] render gagal:', err);
        postMessage({ status: 'error', message: 'Render gagal: ' + (err && err.message ? err.message : err) });
    }
};

init();
