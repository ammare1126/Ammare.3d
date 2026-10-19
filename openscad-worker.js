import OpenSCAD from 'https://cdn.jsdelivr.net/npm/openscad-wasm@0.0.4/openscad.js';

let instance = null;

OpenSCAD().then(loadedInstance => {
    instance = loadedInstance;
    postMessage({ status: "done", type: "READY", message: "3D Engine Ready! ✅" });
});

onmessage = async function(e) {
    if (e.data.action === "render" && instance) {
        postMessage({ status: "rendering", message: "Menjana rekaan " + e.data.product + "... Sabar jap ⏳" });

        try {
            // 1. Tetapkan laluan fail SCAD secara lalai (Default: Keychain Nama)
            let failScad = 'scad/keychain v1.scad'; 
            let kodTambahan = `
                teks_tempahan = "${e.data.text}";
                keychain_text = "${e.data.text}";
            `;

            // 2. Jika pelanggan pilih No Plate, tukar fail dan pembolehubahnya
            if (e.data.product === "Keychain No Plate") {
                failScad = 'scad/new! TEMPLATE NO PLATE.scad';
                kodTambahan = `
                    Mod_Baris = "1 Baris";
                    Teks_Satu_Baris = "${e.data.text}";
                `;
            }

            // 3. Download fail SCAD yang betul dari folder GitHub awak
            const response = await fetch(failScad); 
            let originalScad = await response.text();

            // 4. Suntik nama dari borang ke dalam skrip
            const finalScadCode = `
                ${originalScad}
                
                // --- AUTO INJECT DARI BORANG WEBSITE ---
                $fn = 15; // Kekalkan kelajuan preview di telefon
                ${kodTambahan}
            `;
            
            // 5. Hantar ke Enjin
            instance.FS.writeFile('/input.scad', finalScadCode);
            instance.callMain(['/input.scad', '-o', '/output.stl']);
            
            const stlData = instance.FS.readFile('/output.stl');
            postMessage({ status: "done", type: "STL_RESULT", data: stlData });
            
        } catch (error) {
            postMessage({ status: "error", message: "Gagal membaca fail rekaan untuk " + e.data.product });
        }
    }
}
