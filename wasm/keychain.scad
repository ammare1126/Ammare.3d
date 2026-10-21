use <Lobster-Regular.ttf>;
use <Pacifico-Regular.ttf>;

// --- AMMARE.3D CUSTOM NAME KEYCHAIN V1 ---

/* [Pilihan Cetakan] */
// Pilih bahagian mana untuk dieksport
Pilihan_Cetak = "Semua"; // ["Semua": Preview Penuh, "Tapak Sahaja": Tapak Kosong, "Teks Sahaja": Teks Nama]

/* [Text] */
keychain_text = "Nama"; 
font_name = "Lobster"; // ["Lobster", "Pacifico", "DynaPuff"]
text_size = 15; 
letter_spacing = 1.0; 

/* [Keychain Size] */
base_thickness = 2.0; 
text_thickness = 1.4; 
border_size = 3.4; 

/* [Preview Colors] */
// Warna untuk tapak bawah
base_color = "#FFFFFF"; // ["#FFFFFF": "Putih", "#000000": "Hitam", "#FF0000": "Merah", "#90EE90": "Hijau Cair", "#800080": "Purple", "#0000FF": "Biru", "#FFFF00": "Kuning", "#FFA500": "Oren", "#FFC0CB": "Pink"]

// Warna untuk teks nama
text_color = "#FFC0CB"; // ["#FFFFFF": "Putih", "#000000": "Hitam", "#FF0000": "Merah", "#90EE90": "Hijau Cair", "#800080": "Purple", "#0000FF": "Biru", "#FFFF00": "Kuning", "#FFA500": "Oren", "#FFC0CB": "Pink"]

/* [Ring Hole] */
hole_size = 5.0; 
ring_wall = 3.0; 
ring_at_text_end = false; 
ring_distance = 1.2; 
ring_move_x = 7; 
ring_move_y = -2; 

/* [Hidden] */
$fn = 60; 

// --- PENGIRAAN KEDUDUKAN ---
ring_outer_d = hole_size + (ring_wall * 2);
base_x = ring_at_text_end ? (text_size * len(keychain_text) * 0.7) : -(border_size + ring_distance + (ring_outer_d / 2));
pos_x = base_x + ring_move_x;
pos_y = ring_move_y;

module bentuk_teks() {
    text(keychain_text, size=text_size, font=font_name, spacing=letter_spacing, valign="center", halign="left");
}

// --- BINAAN 3D ---
union() {
    
    // ==========================================
    // 1. LAPISAN TAPAK SAHAJA
    // ==========================================
    if (Pilihan_Cetak == "Semua" || Pilihan_Cetak == "Tapak Sahaja") {
        color(base_color)
        linear_extrude(height=base_thickness) {
            difference() {
                union() {
                    offset(r=-5) offset(r=5) offset(r=border_size) bentuk_teks();
                    translate([pos_x, pos_y, 0]) circle(d=ring_outer_d);
                    hull() {
                        translate([pos_x, pos_y, 0]) circle(d=ring_outer_d);
                        translate([ring_at_text_end ? pos_x - ring_distance : pos_x + ring_distance, pos_y, 0]) circle(d=ring_outer_d/2);
                    }
                }
                translate([pos_x, pos_y, 0]) circle(d=hole_size);
            }
        }
    }

    // ==========================================
    // 2. LAPISAN TEKS SAHAJA
    // ==========================================
    if (Pilihan_Cetak == "Semua" || Pilihan_Cetak == "Teks Sahaja") {
        
        // Jika pilih "Teks Sahaja", teks akan turun rapat ke lantai (Z=0) untuk dicetak asing
        z_pos = (Pilihan_Cetak == "Semua") ? base_thickness : 0;
        
        color(text_color)
        translate([0, 0, z_pos])
        linear_extrude(height=text_thickness) {
            bentuk_teks();
        }
    }
}
