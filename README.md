# JATMAN Online — WordPress

Tema block `jatman` + mu-plugin `jatman-core` untuk JATMAN Online, dengan sample artikel asli dari jatman.or.id.

## Menjalankan lokal

Butuh Docker dan Node 24. Repo font [`uthman-taha`](../uthman-taha) harus ada di sebelah repo ini (hanya untuk `npm run brand:build`).

```bash
npm install
npm run env:start        # WordPress di http://localhost:8888 (admin / password)
npm run sample:fetch     # ambil 15 artikel asli → tools/sample/data/
npm run sample:import    # masukkan ke WordPress
```

`npm run sample:reset` mengosongkan lalu mengimpor ulang sample. `npm run env:stop` mematikan WordPress.

## Struktur

- `theme/jatman/`: tampilan (theme.json, template, block dinamis di `blocks/`, CSS di `assets/css/main.css`)
- `mu-plugins/jatman-core/`: aturan konten yang harus tetap ada walau tema diganti (kategori, URL lama, avatar penulis, Pilihan Redaksi)
- `tools/importer/`: importer sumber-agnostik (dipakai sample, nanti migrasi Varient)
- `tools/sample/`: scraper sample dari web lama
- `tools/brand/`: build logo SVG dan font
- `playground/`: demo WordPress Playground (blueprint, skrip setup, snapshot data sample)

## Demo online (WordPress Playground)

Link demo, tanpa server (WordPress berjalan di browser pengunjung, isi kembali seperti semula tiap dibuka):

https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/aqinfh/jatman-online/main/playground/blueprint.json

Blueprint mengambil tema, mu-plugin, dan importer dari branch `main`, jadi setiap push langsung terlihat di demo. Pengunjung otomatis login sebagai admin (toolbar disembunyikan di tampilan depan), jadi `/wp-admin/` bisa langsung dibuka. Form kontak tidak mengirim email di demo. Kalau sample di-fetch ulang, perbarui snapshotnya: salin `tools/sample/data/{posts.json,pages.json,media/}` ke `playground/sample-data/`.

## Tes

```bash
npm test                 # unit (node:test) + PHP (env tests wp-env) + e2e (Playwright)
npm run lint:php && npm run lint:theme-json
npm run screens          # screenshot semua halaman → tests/output/screens/
npm run lighthouse       # performa mobile beranda & artikel (minimal 90)
```

## Keamanan saat dipasang di hosting

Sudah ditangani di kode (`mu-plugins/jatman-core/hardening.php` dan lainnya): versi WordPress tidak diumumkan, XML-RPC mati, daftar user lewat REST hanya untuk yang login, file PHP tema tidak bisa dibuka langsung, username login penulis hasil impor bukan slug profilnya, Pilihan Redaksi hanya bisa diatur editor/admin, dan formulir kontak memakai nonce, honeypot, serta batas 1 pesan per menit per IP.

Yang harus diatur di server (di luar repo):

- `wp-config.php`: `WP_DEBUG` dan `WP_DEBUG_LOG` **mati** (di lokal hidup; di produksi `wp-content/debug.log` bisa dibaca siapa saja), `DISALLOW_FILE_EDIT` `true`, dan salt/key unik.
- Di balik Cloudflare/proxy: set `JATMAN_CLIENT_IP_HEADER` (mis. `'HTTP_CF_CONNECTING_IP'`). Jangan diset bila tidak ada proxy, karena header itu bisa dipalsukan pengunjung.
- SMTP aktif supaya formulir Kontak terkirim. Bila memakai cache halaman penuh, kecualikan `/kontak/` (nonce formulir kedaluwarsa ±12–24 jam).
- Akun admin: jangan pakai username `admin`, password kuat, dan aktifkan 2FA atau pembatas percobaan login.
- Hapus `readme.html` dan `license.txt` bawaan WordPress, serta jangan unggah `tools/`, `tests/`, `docs/`, atau `node_modules/` ke server: yang dipasang hanya `theme/jatman` dan `mu-plugins/`.

Spec: `docs/superpowers/specs/2026-10-10-jatman-wp-theme-design.md`
