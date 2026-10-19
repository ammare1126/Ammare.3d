/*
  OpenSCAD WASM worker.
  Put the official openscad-wasm build files in /wasm:
    openscad.js, openscad.wasm
  Some builds also need openscad.data or font/library files; follow the build's README.
  This worker runs OpenSCAD away from the UI thread.
*/
self.onmessage = async (event) => {
  try {
    const data = event.data;
    self.postMessage({status:"loading", message:"Memuat enjin OpenSCAD…"});
    // The official openscad-wasm build exports an ES module factory.
    const { default: OpenSCAD } = await import("./openscad.js");
    const instance = await OpenSCAD({ noInitialRun: true, locateFile: (path) => new URL(path, self.location.href).href });
    self.postMessage({status:"rendering", message:"Menjana bahagian tapak dan teks…"});
    const source = await (await fetch("../scad/keychain.scad")).text();
    const safeText = String(data.text || "NAMA").replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/[\r\n]/g," ");
    const type = data.product === "plate" ? "plate" : "nama";
    const params = `label_text = "${safeText}"; keychain_type = "${type}";`;
    const results = [];
    for (const part of ["base","text"]) {
      // Replace the model's default parameter declarations, rather than adding
      // duplicate OpenSCAD assignments (OpenSCAD variable scoping can surprise beginners).
      let scad = source
        .replace(/^label_text\s*=.*;\s*$/m, `label_text = "${safeText}";`)
        .replace(/^keychain_type\s*=.*;\s*$/m, `keychain_type = "${type}";`)
        .replace(/^part\s*=.*;\s*$/m, `part = "${part}";`);
      instance.FS.writeFile(`/keychain-${part}.scad`, scad);
      const out = `/keychain-${part}.stl`;
      instance.callMain([`/keychain-${part}.scad`, "--enable=manifold", "-o", out]);
      const bytes = instance.FS.readFile(out);
      results.push({part, filename:`keychain-${part}.stl`, stl:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
    }
    for (const result of results) self.postMessage({stl:result.stl,part:result.part,filename:result.filename},[result.stl]);
    self.postMessage({ready:true});
  } catch (error) {
    self.postMessage({error: error && error.message ? error.message : String(error)});
  }
};