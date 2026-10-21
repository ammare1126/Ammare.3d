// =========================================================
// AMMARE.3D - KEYCHAIN NOMBOR PLAT MALAYSIA (SAIZ BESAR & IDEAL)
// =========================================================

/* [1. Pilihan Cetakan & Gaya] */
Pilihan_Cetak = "Semua"; // ["Semua": Preview Penuh, "Tapak Sahaja": Tapak Kosong, "Teks Sahaja": Teks & Border]
Gaya_Teks = "Timbul"; // ["Timbul", "Tenggelam"]
Tambah_Border = false; 


/* [2. Reka Bentuk & Saiz Tapak (Design A - F)] */
Bentuk_Plat = "Design C"; // ["Design A": "Design A (Perisai/Trapezoid)", "Design B": "Design B (Petak Bucu Bulat 2 Baris)", "Design C": "Design C (Potong 2 Bucu)", "Design D": "Design D (Potong 4 Bucu)", "Design E": "Design E (Memanjang Potong Bucu)", "Design F": "Design F (Memanjang Petak Penuh)"]

Mod_Baris = "Auto"; // ["Auto": "Ikut Design (A-D: 2 Baris, E-F: 1 Baris)", "1 Baris": "Paksa 1 Baris", "2 Baris": "Paksa 2 Baris"]

// Lebar & Tinggi untuk Plat 2 Baris (Design A - D) - Saiz baru lebih mantap!
Lebar_Plat_2_Baris = 50; // [35:1:80]
Tinggi_Plat_2_Baris = 32; // [20:1:50]

// Lebar & Tinggi untuk Plat 1 Baris (Design E & F) - Sebaya keychain "Darling"
Lebar_Plat_1_Baris = 65; // [45:1:90]
Tinggi_Plat_1_Baris = 20; // [12:1:35]


/* [3. Teks Nombor Plat] */
Teks_Atas = "NO";
Teks_Bawah = "1244";
Teks_Satu_Baris = "NO 1234";

Nama_Fon = "Arial Black:style=Regular"; // ["Arial Black:style=Regular", "Arial:style=Bold", "Impact:style=Regular", "Bebas Neue:style=Regular", "Archivo Black:style=Regular", "Agency FB:style=Bold","CharlesWright-Bold"]

// Saiz huruf untuk 2 Baris (Dibesarkan dari 7.5 ke 9.5)
Saiz_Teks = 9.5; // [4:0.5:18]

// Saiz huruf untuk 1 Baris (Dibesarkan dari 5.5 ke 7.5)
Saiz_Teks_1_Baris = 7.5; // [3:0.5:15]

// Jarak antara baris atas dan bawah (Dibesarkan dari 9.0 ke 11.5)
Jarak_Baris = 11.5; // [5:0.5:25]

Jarak_Huruf = 1.0; // [0.8:0.05:1.5]
Anjakan_Teks_X = 0.0; // [-15:0.5:15]
Anjakan_Teks_Y = 0.0; // [-15:0.5:15]


/* [4. Ketebalan & Ukuran (mm)] */
Tebal_Tapak = 2.4;  // Ditebalkan sedikit supaya lebih solid
Tebal_Teks = 1.4;
Tebal_Border = 1.5; 
Jejari_Bucu = 2.0;  


/* [5. Lubang Keychain (Bucu Kiri Atas)] */
Ada_Lubang = true;
Saiz_Lubang = 4.0; // [2:0.2:6]
Anjakan_Lubang_X = 0.0; // [-5:0.5:5]
Anjakan_Lubang_Y = 0.0; // [-5:0.5:5]


/* [6. Warna Preview] */
Warna_Tapak = "#111111"; // ["#111111": "Hitam", "#FFFFFF": "Putih", "#FF0000": "Merah", "#90EE90": "Hijau Cair", "#800080": "Purple", "#0000FF": "Biru", "#FFFF00": "Kuning", "#FFA500": "Oren", "#FFC0CB": "Pink"]
Warna_Teks = "#FFFFFF"; // ["#FFFFFF": "Putih", "#111111": "Hitam", "#FF0000": "Merah", "#90EE90": "Hijau Cair", "#800080": "Purple", "#0000FF": "Biru", "#FFFF00": "Kuning", "#FFA500": "Oren", "#FFC0CB": "Pink"]

/* [Hidden] */
$fn = 60;

// --- LOGIK PENENTUAN SAIZ & BARIS AUTOMATIK ---
adalah_plat_panjang = (Bentuk_Plat == "Design E" || Bentuk_Plat == "Design F");
adalah_1_baris = (Mod_Baris == "1 Baris") || (Mod_Baris == "Auto" && adalah_plat_panjang);

Lebar_Plat = adalah_plat_panjang ? Lebar_Plat_1_Baris : Lebar_Plat_2_Baris;
Tinggi_Plat = adalah_plat_panjang ? Tinggi_Plat_1_Baris : Tinggi_Plat_2_Baris;

// Kedudukan automatik lubang di Bucu Kiri Atas
offset_lubang_x = (Bentuk_Plat == "Design A") ? 6.5 : (adalah_plat_panjang ? 4.8 : 5.2);
offset_lubang_y = adalah_plat_panjang ? 4.8 : 5.2;

lubang_x = -Lebar_Plat/2 + offset_lubang_x + Anjakan_Lubang_X;
lubang_y = Tinggi_Plat/2 - offset_lubang_y + Anjakan_Lubang_Y;


// --- MODUL 2D: BENTUK TAPAK (DESIGN A - F) ---
module bentuk_tapak_2d() {
    w = Lebar_Plat / 2 - Jejari_Bucu;
    h = Tinggi_Plat / 2 - Jejari_Bucu;
    
    offset(r = Jejari_Bucu) {
        if (Bentuk_Plat == "Design A") {
            polygon(points=[
                [-w, h],
                [w, h],
                [w - 4.5, -h + 3.0],
                [0, -h],
                [-w + 4.5, -h + 3.0]
            ]);
        } 
        else if (Bentuk_Plat == "Design B") {
            square([w * 2, h * 2], center = true);
        } 
        else if (Bentuk_Plat == "Design C") {
            c = 7.0;
            polygon(points=[
                [-w, h],
                [w - c, h],
                [w, h - c],
                [w, -h],
                [-w + c, -h],
                [-w, -h + c]
            ]);
        } 
        else if (Bentuk_Plat == "Design D") {
            c = 5.5;
            polygon(points=[
                [-w + c, h],
                [w - c, h],
                [w, h - c],
                [w, -h + c],
                [w - c, -h],
                [-w + c, -h],
                [-w, -h + c],
                [-w, h - c]
            ]);
        } 
        else if (Bentuk_Plat == "Design E") {
            c = 4.5;
            polygon(points=[
                [-w, h],
                [w - c, h],
                [w, h - c],
                [w, -h],
                [-w + c, -h],
                [-w, -h + c]
            ]);
        }
        else if (Bentuk_Plat == "Design F") {
            square([w * 2, h * 2], center = true);
        }
    }
}

// --- MODUL 2D: SUSUNAN TEKS ---
module bentuk_teks_2d() {
    auto_anjak_x = (adalah_1_baris && Ada_Lubang) ? 1.5 : 0.0;
    
    translate([Anjakan_Teks_X + auto_anjak_x, Anjakan_Teks_Y, 0]) {
        if (adalah_1_baris) {
            text(Teks_Satu_Baris, size = Saiz_Teks_1_Baris, font = Nama_Fon, spacing = Jarak_Huruf, halign = "center", valign = "center");
        } else {
            translate([0, Jarak_Baris / 2, 0])
                text(Teks_Atas, size = Saiz_Teks, font = Nama_Fon, spacing = Jarak_Huruf, halign = "center", valign = "center");
            translate([0, -Jarak_Baris / 2, 0])
                text(Teks_Bawah, size = Saiz_Teks, font = Nama_Fon, spacing = Jarak_Huruf, halign = "center", valign = "center");
        }
    }
}

// --- MODUL 2D: BINGKAI (BORDER) ---
module bentuk_border_2d() {
    if (Tambah_Border) {
        difference() {
            bentuk_tapak_2d();
            offset(r = -Tebal_Border) bentuk_tapak_2d();
        }
    }
}

// --- MODUL 2D: GABUNGAN TIMBUL (TEKS + BORDER) ---
module elemen_timbul_2d() {
    difference() {
        union() {
            bentuk_teks_2d();
            bentuk_border_2d();
        }
        if (Ada_Lubang) {
            translate([lubang_x, lubang_y, 0])
                circle(d = Saiz_Lubang + 1.5);
        }
    }
}

// =========================================================
// BINAAN 3D UTAMA
// =========================================================
union() {
    if (Pilihan_Cetak == "Semua" || Pilihan_Cetak == "Tapak Sahaja") {
        color(Warna_Tapak)
        difference() {
            linear_extrude(height = Tebal_Tapak) {
                difference() {
                    bentuk_tapak_2d();
                    if (Ada_Lubang) {
                        translate([lubang_x, lubang_y, 0])
                            circle(d = Saiz_Lubang);
                    }
                }
            }
            if (Gaya_Teks == "Tenggelam") {
                translate([0, 0, Tebal_Tapak - Tebal_Teks])
                linear_extrude(height = Tebal_Teks + 0.1) {
                    elemen_timbul_2d();
                }
            }
        }
    }

    if (Gaya_Teks == "Timbul" && (Pilihan_Cetak == "Semua" || Pilihan_Cetak == "Teks Sahaja")) {
        z_pos = (Pilihan_Cetak == "Semua") ? Tebal_Tapak : 0;
        color(Warna_Teks)
        translate([0, 0, z_pos])
        linear_extrude(height = Tebal_Teks) {
            elemen_timbul_2d();
        }
    }
}
