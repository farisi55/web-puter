# Puter Studio

Puter Studio adalah aplikasi web sederhana berbahasa Indonesia untuk chat dengan AI, membuat gambar dan video, serta mengunggah file ke penyimpanan Puter.

## Fitur

- **Chat AI** dengan pilihan model yang dimuat dari Puter, jawaban streaming, prompt awal, dan riwayat percakapan selama halaman terbuka.
- **Generasi gambar** dari deskripsi teks dengan pilihan gaya Foto, Ilustrasi, atau 3D.
- **Generasi video** dari deskripsi teks menggunakan model video default Puter, Wan 2.7.
- **Unggah file** dokumen, gambar, dan video ke filesystem Puter.
- **Perpustakaan** dengan pratinjau dan tautan unduh untuk media yang tersedia.
- Tampilan responsif dengan tema terang atau gelap mengikuti pengaturan sistem.

## Menjalankan secara lokal

Pastikan Python tersedia, lalu jalankan server statis dari folder proyek:

```powershell
python -m http.server 8000
```

Buka [http://localhost:8000](http://localhost:8000) di browser.

> Sebaiknya jalankan melalui server lokal, bukan membuka `index.html` langsung. Aplikasi memuat Puter.js dari internet, jadi koneksi internet diperlukan.

## Menggunakan Puter

Aplikasi memuat Puter.js v2 dari `https://js.puter.com/v2/` dan menggunakan API berikut:

- Chat: `puter.ai.chat()`
- Daftar model chat: `puter.ai.listModels()`
- Gambar: `puter.ai.txt2img()`
- Video: `puter.ai.txt2vid()`
- Unggah file: `puter.fs.write()`

Permintaan AI dan penyimpanan memakai akun, izin, dan kuota Puter pengguna. Jika diminta, masuk atau berikan izin melalui alur autentikasi Puter.

## Berkas proyek

- `index.html` - struktur halaman dan navigasi.
- `style.css` - tampilan, tema, dan responsivitas.
- `script.js` - interaksi UI dan integrasi Puter.js.

File yang diunggah dan hasil generasi disimpan di Puter. Daftar perpustakaan dan riwayat chat saat ini disimpan sementara di memori halaman, sehingga tidak dipertahankan setelah halaman dimuat ulang.

## Dokumentasi

- [Dokumentasi Puter.js](https://docs.puter.com/)
- [Chat AI](https://docs.puter.com/AI/)
- [Generasi gambar](https://docs.puter.com/AI/txt2img/)
- [Generasi video](https://docs.puter.com/AI/txt2vid/)
