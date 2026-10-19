import OpenSCAD from 'https://cdn.jsdelivr.net/npm/openscad-wasm@0.0.4/openscad.js';

const SCAD_NAMA    = 'scad/keychain v1.scad';
const SCAD_NOPLATE = 'scad/new! TEMPLATE NO PLATE.scad';
const FONTS = ['CharlesWright-Bold.otf', 'Lobster-Regular.ttf']; // dalam folder scad/

// Warm-up: pastikan enjin boleh load
OpenSCAD({ noInitialRun: true }).then(() => {
    postMessage({ status: "done", type: "READY", message: "3D Engine Ready! ✅" });
}).catch(err => {
    postMessage({ status: "error", message: "Gagal load 3D engine: " + err.message });
});

onmessage = async function (e) {
    if (e.data.action !== "render") return;
    postMessage({ status: "rendering", message: "Menjana rekaan " + e.data.product + "... Sabar jap ⏳" });

    const logs = [];
    try {
        // Bersihkan teks supaya tak rosakkan kod SCAD
        const teks = String(e.data.text).replace(/[^A-Za-z0-9 ]/g, '').slice(0, 8);

        let failScad = SCAD_NAMA;
        let kodTambahan = `
            teks_tempahan = "${teks}";
            keychain_text = "${teks}";
        `;
        if (e.data.product === "Keychain No Plate") {
            failScad = SCAD_NOPLATE;
            kodTambahan = `
                Mod_Baris = "1 Baris";
                Teks_Satu_Baris = "${teks}";
            `;
        }

        const response = await fetch(encodeURI(failScad));
        if (!response.ok) throw new Error(`Fail "${failScad}" tak jumpa (${response.status})`);
        const originalScad = await response.text();

        const finalScadCode = `
            ${originalScad}

            // --- AUTO INJECT DARI BORANG WEBSITE ---
            $fn = 15;
            ${kodTambahan}
        `;

        // Instance baru setiap render (callMain tak boleh diulang)
        const instance = await OpenSCAD({
            noInitialRun: true,
            print: t => logs.push(t),
            printErr: t => logs.push(t)
        });

        // Muatkan font
        try { instance.FS.mkdir('/fonts'); } catch (_) {}
        for (const f of FONTS) {
            try {
                const r = await fetch(encodeURI('scad/' + f));
                if (r.ok) {
                    const buf = new Uint8Array(await r.arrayBuffer());
                    instance.FS.writeFile('/fonts/' + f, buf);
                    instance.FS.writeFile('/' + f, buf); // sebab SCAD guna: use <Lobster-Regular.ttf>
                }
            } catch (_) {}
        }

        instance.FS.writeFile('/input.scad', finalScadCode);
        const code = instance.callMain(['/input.scad', '-o', '/output.stl']);
        if (code) throw new Error("OpenSCAD exit code " + code);

        const stlData = instance.FS.readFile('/output.stl');
        postMessage({ status: "done", type: "STL_RESULT", data: stlData });
    } catch (error) {
        const detail = logs.filter(l => /error|warning/i.test(l)).slice(-3).join(' | ');
        postMessage({
            status: "error",
            message: "Gagal render " + e.data.product + ": " + error.message + (detail ? " [" + detail + "]" : "")
        });
    }
};
