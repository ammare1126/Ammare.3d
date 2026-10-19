// Worker for OpenSCAD
importScripts('https://cdn.jsdelivr.net/npm/openscad-wasm@0.2.1/dist/openscad-wasm.min.js');

let instance = null;

// Initialize the OpenSCAD instance
OpenSCAD().then(loadedInstance => {
    instance = loadedInstance;
    postMessage({ type: "READY" });
});

onmessage = function(e) {
    if (e.data.action === "render" && instance) {
        
        // This is where you pass your text variable into your SCAD code
        const scadCode = `
            text_string = "${e.data.text}";
            linear_extrude(2) text(text_string, size=10, halign="center");
        `;
        
        // Write the code to the virtual filesystem
        instance.FS.writeFile('/input.scad', scadCode);
        
        // Command line instruction to generate STL
        instance.callMain(['/input.scad', '-o', '/output.stl']);
        
        // Read the result
        const stlData = instance.FS.readFile('/output.stl');
        
        postMessage({ type: "STL_RESULT", data: stlData });
    }
}