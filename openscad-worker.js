// 1. Panggil 3D Engine (Import ES Module)
import OpenSCAD from 'https://cdn.jsdelivr.net/npm/openscad-wasm@0.0.4/openscad.js';

let instance = null;

// 2. Hidupkan enjin. Bila dah sedia, hantar mesej "READY" ke website
OpenSCAD().then(loadedInstance => {
    instance = loadedInstance;
    postMessage({ status: "done", type: "READY", message: "3D Engine Ready! ✅" });
});

// 3. Dengar arahan (Bila butang Generate Preview ditekan)
onmessage = function(e) {
    if (e.data.action === "render" && instance) {
        
        postMessage({ status: "rendering", message: "Tengah buat 3D... Sabar jap ⏳" });

        const scadCode = `
            text_string = "${e.data.text}";
            linear_extrude(2) text(text_string, size=10, halign="center");
        `;
        
        try {
            instance.FS.writeFile('/input.scad', scadCode);
            instance.callMain(['/input.scad', '-o', '/output.stl']);
            const stlData = instance.FS.readFile('/output.stl');
            postMessage({ status: "done", type: "STL_RESULT", data: stlData });
        } catch (error) {
            postMessage({ status: "error", message: "Gagal generate 3D." });
        }
    }
}
