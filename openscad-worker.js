import OpenSCAD from 'https://cdn.jsdelivr.net/npm/openscad-wasm@0.0.4/openscad.js';

// Warm-up: load engine sekali supaya tahu bila ready
OpenSCAD({ noInitialRun: true }).then(() => {
    postMessage({ status: "done", type: "READY", message: "3D Engine Ready! ✅" });
}).catch(err => {
    postMessage({ status: "error", message: "Gagal load 3D engine: " + err.message });
});

onmessage = async function (e) {
    if (e.data.action !== "render") return;

    postMessage({ status: "rendering", message: "Menjana rekaan " + e.data.product + "... Sabar jap ⏳" });

    try {
        // Bersihkan teks (elak " rosakkan kod SCAD)
        const teks = String(e.data.text).replace(/[^A-Za-z0-9 ]/g, '').slice(0, 8);

        let failScad = 'scad/keychain v1.scad';
        let kodTambahan = `
            teks_tempahan = "${teks}";
            keychain_text = "${teks}";
        `;

        if (e.data.product === "Keychain No Plate") {
            failScad = 'scad/new! TEMPLATE NO PLATE.scad';
            kodTambahan = `
                Mod_Baris = "1 Baris";
                Teks_Satu_Baris = "${teks}";
            `;
        }

        const response = await fetch(encodeURI(failScad));
        if (!response.ok) throw new Error("Fail " + failScad + " tak jumpa (" + response.status + ")");
        const originalScad = await response.text();

        const finalScadCode = `
            ${originalScad}

            // --- AUTO INJECT DARI BORANG WEBSITE ---
            $fn = 15;
            ${kodTambahan}
        `;

        // Instance baru setiap render (callMain tak boleh dipanggil berulang kali)
        const instance = await OpenSCAD({ noInitialRun: true });
        instance.FS.writeFile('/input.scad', finalScadCode);
        instance.callMain(['/input.scad', '-o', '/output.stl']);

        const stlData = instance.FS.readFile('/output.stl');
        postMessage({ status: "done", type: "STL_RESULT", data: stlData });
    } catch (error) {
        postMessage({ status: "error", message: "Gagal render " + e.data.product + ": " + error.message });
    }
};
