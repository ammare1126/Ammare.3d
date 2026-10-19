/*
  AMMARE.3D PARAMETRIC EXAMPLE
  Replace this example with your own .scad model after testing it.
  Parameters expected from the website:
    label_text, part ("base" or "text"), keychain_type, key_width, key_height
  IMPORTANT: WASM exports STL geometry, not colour. Export base and text separately.
*/
label_text = "AMMAR";
part = "base"; // "base", "text", or "all"
keychain_type = "nama"; // "nama" or "plate"
key_width = 48;
key_height = 18;
base_thickness = 3;
text_thickness = 1.2;
text_size = keychain_type == "plate" ? 5.5 : 8;
$fn = 48;

module base_shape() {
  difference() {
    hull() {
      translate([-key_width/2+5,0,0]) cylinder(h=base_thickness,r=5);
      translate([ key_width/2-5,0,0]) cylinder(h=base_thickness,r=5);
      translate([-key_width/2+5,key_height-10,0]) cylinder(h=base_thickness,r=5);
      translate([ key_width/2-5,key_height-10,0]) cylinder(h=base_thickness,r=5);
    }
    translate([key_width/2-5,key_height-5,-0.1]) cylinder(h=base_thickness+0.2,r=2.1);
  }
}
module raised_text() {
  translate([0,(key_height-10)/2,base_thickness])
    linear_extrude(height=text_thickness)
      text(label_text, size=text_size, halign="center", valign="center",
           font="Liberation Sans:style=Bold", spacing=1);
}
if (part == "base") base_shape();
else if (part == "text") raised_text();
else { base_shape(); raised_text(); }
