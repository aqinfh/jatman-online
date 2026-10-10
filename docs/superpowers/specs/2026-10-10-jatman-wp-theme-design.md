# JATMAN Online — Tema WordPress Baru + Sample Konten

- **Tanggal:** 2026-10-10
- **Status:** Disetujui per bagian dalam brainstorming, menunggu review spec
- **Sub-proyek:** 1 dari 2. Sub-proyek 2 (migrasi penuh data Varient → WordPress) punya spec sendiri.

## 1. Tujuan

Mengganti jatman.or.id (saat ini **Varient v2.4.1**, script berita CodeIgniter 4, tema "magazine") dengan WordPress. Struktur data tetap sama, tampilan diganti total jadi modern. Sebelum migrasi penuh, redaksi menyetujui desain lewat **tema WordPress sungguhan** yang berjalan lokal dan berisi **artikel asli beserta penulis aslinya**.

**Kriteria sukses**
- Tema block custom `jatman` berjalan di `wp-env` (localhost:8888) dengan ~15 artikel asli dari berbagai rubrik.
- Semua template di §6 tampil benar di lebar 375/768/1280/1440, dalam mode terang dan gelap.
- Setiap slug artikel lama terbuka (HTTP 200) di localhost dengan path yang sama.
- axe-core: 0 pelanggaran serious/critical. Lighthouse mobile ≥ 90 untuk beranda dan artikel.
- Importer sample bisa dipakai ulang sebagai dasar importer migrasi (sumber data bisa diganti).

**Di luar cakupan:** migrasi semua data, peta redirect lengkap, halaman/arsip Download, hitungan views/Terpopuler, login/registrasi pembaca, newsletter, deploy ke hosting, link online untuk tim.

## 2. Keputusan yang sudah diambil

| Topik | Keputusan |
|---|---|
| Bentuk sample | Langsung tema WP, bukan prototype HTML |
| Tipe tema | Block theme custom (theme.json + Site Editor), tanpa page builder |
| Review | Lokal via `wp-env` (Docker sudah tersedia, Node 24) |
| Arah visual | Default terang, ada dark mode. Hero headline jelas (pola NU Online). Pita rubrik bergaya quran.nu.or.id |
| Logo | JATMAN Online = brand utama. Lambang JATMAN = penanda penerbit resmi (top bar, footer, halaman Tentang) |
| Tanggal Hijriah | **Tidak dipakai** |
| Terpopuler | Ditunda ke migrasi. Diganti **Pilihan Redaksi** (dipilih manual) |

## 3. Struktur repo

```
jatman-online/
├── package.json                 # devDep @wordpress/env + script npm
├── .wp-env.json                 # core WP terbaru, tema theme/jatman, mu-plugins/
├── theme/jatman/
│   ├── style.css  theme.json  functions.php
│   ├── templates/  parts/  patterns/
│   └── assets/ css/ js/ fonts/ img/
├── mu-plugins/jatman-core.php   # aturan konten (permalink, kategori, meta, avatar)
├── tools/sample/
│   ├── articles.txt             # daftar URL artikel sample
│   ├── fetch.mjs                # scrape → data/posts.json + data/media/
│   ├── import.php               # wp eval-file, idempotent
│   └── data/                    # di-gitignore
├── tests/                       # Playwright: screenshot, axe, cek URL
└── docs/superpowers/specs/
```

Pembagian tanggung jawab: **tema** hanya mengurus tampilan. **mu-plugin** mengurus aturan konten yang harus tetap berlaku kalau tema diganti. **tools/sample** mengurus data.

## 4. Model konten (dipetakan dari Varient)

- **Post** standar WP, tanpa custom post type.
- **Kategori** (slug sama dengan web lama):
  - `berita` › `nasional`, `daerah`, `internasional`
  - `tanya-jawab`, `pustaka-tasawuf`, `artikel`, `thariqah`, `dawuh`, `tokoh`, `hikmah`
  - *Catatan:* di web lama, menu "Pustaka Tasawuf" mengarah ke `/postingan` (daftar semua post), bukan kategori. Di sample, Pustaka Tasawuf dibuat sebagai kategori. Status sebenarnya dicek dari database Varient saat migrasi.
- **Rubrik teduh** = `dawuh`, `hikmah`, `pustaka-tasawuf`. Daftarnya disimpan di satu konstanta di mu-plugin dan dipakai untuk varian tampilan.
- **Penulis** = user WP. `user_nicename` = slug profil lama (`/profile/syahril-mubarok`), dengan display name dan bio. Foto disimpan di media lokal lewat user meta `jatman_avatar_id`, lalu dipakai filter `get_avatar_url` (tidak bergantung Gravatar).
- **Field post:** judul, isi (block), ringkasan → `post_excerpt`, gambar utama + caption, tanggal terbit asli, tag.
- **Pilihan Redaksi:** post meta `jatman_pilihan` (boolean, `show_in_rest`). Ada checkbox di sidebar editor (satu panel `PluginDocumentSettingPanel`). Bagian-bagian beranda dirender oleh block dinamis `jatman/post-list` (kategori ditentukan lewat slug, bukan ID, jadi tetap aman setelah migrasi). Pilihan Redaksi adalah atribut `pilihan: true` di block itu. Menu navigasi ditulis langsung di template part header, bukan dibuat oleh importer.
- **Hero:** post yang di-sticky. Kalau tidak ada, berita terbaru.
- **URL:**
  - Permalink `/%postname%/` → artikel tetap `jatman.or.id/<slug>`.
  - Kategori tanpa base: `/berita/nasional`, `/dawuh`. Diimplementasikan dengan rewrite rule di mu-plugin dari daftar kategori, dan di-flush saat kategori berubah. Tidak boleh bentrok dengan slug post. Kalau bentrok, post yang menang dan bentroknya dicatat.
  - Penulis: `/profile/<slug>` (author base diganti `profile`, sama seperti web lama).
  - Tag: `/tag/<slug>` (sama).

## 5. Sistem visual

### Warna (token di `theme.json`, dark mode lewat CSS custom properties)

| Token | Terang | Gelap | Pemakaian |
|---|---|---|---|
| `brand` (Hijau Thariqah) | `#00712D` | `#4FBF7F` | brand, link, tombol |
| `night` (Hijau malam) | `#063D27` | `#0A2A1C` | top bar, pita rubrik, footer |
| `gold` (Emas) | `#B8913A` | `#D9B65C` | aksen saja: kutipan Dawuh, garis halus, label rubrik teduh |
| `base` (Latar) | `#FFFFFF` | `#0E1512` | halaman |
| `cream` (Krem) | `#F7F3EA` | `#16201B` | latar rubrik teduh |
| `ink` (Teks) | `#15201A` | `#E6ECE8` | isi |
| `muted` | `#5B6B62` | `#9DB0A5` | meta, caption |
| `line` | `#E3E8E4` | `#24312A` | garis, border |

Emas tidak dipakai untuk teks isi. Setiap pasangan teks/latar harus lolos WCAG AA (≥ 4.5:1 untuk teks normal) di kedua mode. Nilai di atas boleh digeser sedikit kalau ada pasangan yang gagal.

### Tipografi (self-hosted `woff2` lewat `fontFace` di theme.json, lisensi OFL)
- **Heebo** (variable 100–900): judul, navigasi, UI. Dipilih pengguna (2026-10-10) menggantikan Plus Jakarta Sans karena lebih netral dan tahan zaman. Heebo tidak punya huruf transliterasi bertitik (ḥ ṣ ṭ ẓ ḍ ʿ ʾ), jadi huruf-huruf itu diisi **Source Sans 3** lewat face tambahan dengan `unicode-range` sempit (hanya diunduh kalau huruf itu muncul).
- Isi artikel juga **Heebo** (sans), atas permintaan pengguna (2026-10-10): pembaca web lama sudah terbiasa sans. Source Serif 4 tidak dipakai.
- **Uthman Taha (versi -ID)**: teks Arab. Sumbernya `UthmanTN1-ID Ver10.ttf` (400) dan `UthmanTN1B-ID Ver10.ttf` (700) dari repo lokal `../uthman-taha` (KFGQPC Uthman Taha Naskh yang sudah ditambal dengan tanda Quran), lalu dikonversi ke woff2. `unicode-range` dibatasi ke huruf Arab dan font ini diletakkan paling depan di setiap font stack, jadi huruf Arab di mana pun otomatis memakai Uthman Taha, sedangkan Latin jatuh ke font berikutnya. Paragraf yang sebagian besar berisi teks Arab diberi `lang="ar" dir="rtl"` dan ukuran ~1.4× teks sekitarnya, dengan line-height lega.
- Skala fluid (`clamp`). Lebar baris isi ±68ch. Font utama di-preload, `font-display: swap`.

### Dark mode
- Atribut `data-theme="light|dark"` pada `<html>`. Urutan prioritas: pilihan tersimpan di `localStorage`, lalu `prefers-color-scheme`, lalu default terang.
- Skrip inline kecil di `<head>` (lewat `wp_head` prioritas 0) memasang atribut sebelum halaman tampil, jadi tidak ada kedipan. Akses `localStorage` dibungkus `try/catch`.
- Tombol toggle (`aria-pressed`, label "Mode gelap") di header.
- Gambar tidak diubah. Logo knot punya varian terang. Lambang JATMAN diberi piringan krem di mode gelap.

### Logo
- **Knot JATMAN Online** divektorkan ulang dari `logo_64e92c5262e347-65260281.png` (1297×931) menjadi SVG: ikon knot + wordmark "JATMAN ONLINE" dalam lockup horizontal, plus varian ikon saja dan varian terang. Kalau hasil potrace kurang rapi, pakai PNG @2x sebagai fallback dan catat sebagai utang desain.
- **Lambang JATMAN**: `Logo_of_JATMAN.svg` (Wikimedia Commons), dioptimasi dengan SVGO.
- **Penempatan:**
  - Top bar: lambang 24px + "Media resmi Jam'iyyah Ahlith Thariqah al-Mu'tabarah an-Nahdliyyah" + tanggal Masehi.
  - Header: lockup knot.
  - Footer: lambang (kiri) + knot (kanan).
  - Halaman Tentang: lambang besar.
  - Favicon / site icon: knot.

## 6. Template

Semua dalam bentuk block template. Bagian yang berulang dijadikan pattern supaya redaksi bisa mengatur ulang lewat Site Editor.

**Parts:** `topbar`, `header` (sticky, mengecil saat scroll, laci menu layar penuh di HP, tombol cari, toggle tema), `footer` (dua identitas, menu Tentang/Redaksi/Kontak/Kirim Tulisan, media sosial: Facebook JATMAN.Online, Instagram jatman.online, TikTok @jatman.online, YouTube @jatmanonline, © JATMAN Online).

**Menu utama:** Berita ▾ (Semua, Nasional, Daerah, Internasional), Tanya Jawab, Pustaka Tasawuf, Artikel, Thariqah, Dawuh, Tokoh, Hikmah.

1. **`front-page`** (beranda), dari atas ke bawah:
   1. Hero: utama di tengah (gambar, label rubrik, judul besar, ringkasan, meta) dan dua kolom pendamping (masing-masing 2 post). Di HP: utama dulu, lalu daftar.
   2. Terbaru (8 post, thumbnail + judul + meta), dengan sidebar Pilihan Redaksi (5 post).
   3. Berita per wilayah: tiga kolom Nasional, Daerah, Internasional (masing-masing 1 besar + 3 judul).
   4. Pita Dawuh: post Dawuh terbaru tampil sebagai kutipan besar (ringkasan dalam serif, nama penulis/tokoh), di latar krem dengan ornamen emas.
   5. Hikmah & Pustaka Tasawuf: deretan kartu di pita `night` bermotif geometri SVG halus (opacity rendah).
   6. Tokoh: kartu foto (rasio 4:5).
   7. Tanya Jawab: 4 judul pertanyaan dengan label "Tanya".
   - Bagian yang kosong (rubriknya belum punya post) tidak dirender.
2. **`single`** (artikel): breadcrumb, label rubrik, judul, dek (ringkasan), byline (avatar, nama → profil, tanggal, waktu baca), gambar utama + caption, isi, tag, tombol bagikan (WhatsApp, Facebook, X, Telegram, salin link, tanpa script pihak ketiga), kotak penulis, 3 artikel terkait (kategori sama, kecuali dirinya).
   - **Varian teduh** (kategori di daftar rubrik teduh): latar krem, header di tengah, ornamen emas. Dipasang lewat filter `body_class` / block render, jadi template-nya tetap satu.
3. **`category`** / **`archive`**: pita header bergaya Quran NU (nama + deskripsi kategori, motif). Post pertama besar, lalu grid. Pagination bernomor. Kategori `berita` dan anak-anaknya menampilkan sub-tab Semua/Nasional/Daerah/Internasional.
4. **`author`**: foto, nama, bio, jumlah tulisan, lalu daftar tulisan dengan pagination.
5. **`tag`**, **`search`** (judul "N hasil untuk '…'", form cari), **`404`** (pesan ramah, form cari, 4 berita terbaru).
6. **`page`**: halaman statis. Sample mengisi **Tentang JATMAN**. Redaksi, Kontak, dan Kirim Tulisan dibuat sebagai halaman placeholder berjudul saja.
7. Waktu baca dihitung di PHP (jumlah kata / 200 wpm) dan disediakan sebagai block kecil di tema.

## 7. Sample data

**Artikel sample** (`tools/sample/articles.txt`):

| Rubrik | Slug | Penulis |
|---|---|---|
| Berita/Nasional | idarah-aliyyah-jatman-launching-logo-harlah-ke-69 | Syahril Mubarok |
| Berita/Nasional | mursyid-idrisiyyah-bahas-integrasi-tasawuf-dan-ketenangan-spiritual | Ibnu Al Jibal |
| Berita/Nasional | perkuat-jejaring-tarekat-global-chairman-inc-ali-masykur-musa-bahas-agenda-strategis-perdamaian-dunia | Syahril Mubarok |
| Berita/Daerah | idarah-aliyyah-jatman-lantik-idarah-wustha-provinsi-riau-masa-khidmat-2025-2030 | Syahril Mubarok |
| Berita/Daerah | disambut-idarah-wustha-jatman-kalsel-mursyid-idrisiyyah-gelar-majelis-talqin-dzikir-di-banjarmasin | Ibnu Al Jibal |
| Berita/Internasional | ali-masykur-musa-terpilih-aklamasi-memimpin-international-naqshabandi-council | Abdurrahman El-Syarif |
| Berita/Internasional | jatman-perkuat-jejaring-naqshabandiyah-dunia-melalui-tiga-mou-di-bukhara | Abdurrahman El-Syarif |
| Dawuh | pesan-kh-kafabihi-di-haul-kh-noer-iskandar-majelis-ilmu-sebagai-jalan-menuju-ampunan | Khumaedi NZ |
| Hikmah | cahaya-yang-bersembunyi-di-balik-ikhlas | Abdurrahman El-Syarif |
| Hikmah | rahasia-hidup-aman-dan-diridai-allah-menurut-kh-achmad-chalwani | Khoirul Anam |
| Tokoh | teladan-guru-sufi-dari-tambakberas-jombang | Syahril Mubarok |
| Artikel | mukasyafah-menuju-peradaban-fitrah | Irawan Santoso Shiddiq |
| Thariqah | thariqah-syadziliyyah-ajaran-hingga-perkembangannya | Jatman Online |
| Tanya Jawab | adakah-batasan-usia-untuk-berthariqah | Arip Suprasetio |
| Pustaka Tasawuf | kontroversi-tasawuf-ibnu-arabi-dan-pembelaannya | (diambil dari halaman) |

Format baris: `<slug-kategori-wp> <url>`. Kategori ditetapkan di file ini (bukan ditebak dari breadcrumb) supaya hasilnya pasti. Breadcrumb hanya dipakai untuk peringatan kalau tidak cocok.

**`fetch.mjs`** (Node 24, tanpa dependensi kecuali `cheerio`):
- Untuk setiap URL: ambil HTML dengan User-Agent yang jelas (`JATMAN-Online-sample-fetch`), berurutan dengan jeda 1 detik, dan cache HTML mentah di `data/raw/` (tidak diambil ulang kalau sudah ada).
- Parse: `og:title`, `og:description` (ringkasan), `og:image` (gambar utama, ukuran terbesar yang tersedia), `article:published_time`, `article:tag`, link `/profile/<slug>`, caption gambar, dan isi `.post-text`.
- Ambil halaman profil penulis sekali per penulis: nama, bio, URL foto.
- Bersihkan isi: buang wrapper/iklan/inline style/`<p>` kosong, ubah ke block markup (`core/paragraph`, `core/heading`, `core/image`, `core/quote`, `core/list`). Yang tidak dikenali masuk `core/html`. Teks Arab (deteksi rentang Unicode Arab) diberi `lang="ar" dir="rtl"`. Prefix dateline "Jakarta, JATMAN Online" dibiarkan apa adanya.
- Unduh gambar ke `data/media/`. Hasil akhir: `data/posts.json` (array post + map penulis).
- Gagal per artikel → dicatat, lalu lanjut. Ringkasan akhir: `N ok, M gagal` beserta alasannya.

**`import.php`** (`wp-env run cli wp eval-file`):
1. Pastikan permalink, base penulis, dan pohon kategori ada (buat kalau belum).
2. Upsert penulis berdasarkan `user_nicename` (role `author`, password acak), set bio, unggah foto → `jatman_avatar_id`.
3. Upsert post berdasarkan `post_name`: `post_date` asli, status `publish`, excerpt, isi, kategori, tag. Gambar utama diunggah sekali (dicocokkan lewat meta `jatman_source_url`).
4. Set `jatman_pilihan` pada 5 post, sticky pada 1 post (berita Nasional terbaru), buat halaman Tentang + placeholder.
5. Cetak ringkasan jumlah (dibuat / diperbarui / gagal).
- Idempotent: menjalankan dua kali tidak membuat duplikat, dan jumlahnya tetap sama.

**Script npm:** `env:start`, `env:stop`, `sample:fetch`, `sample:import`, `sample:reset` (hapus post/penulis/media sample, lalu impor ulang), `test`.

## 8. Pengujian dan verifikasi

1. **Importer:** setelah `sample:import`, jumlah post = jumlah baris `articles.txt` yang berhasil di-fetch, penulis dan kategori sesuai. Impor kedua → jumlah tidak berubah.
2. **URL:** setiap slug di `articles.txt` → `GET localhost:8888/<slug>/` = 200 dengan judul yang benar. `/berita/nasional`, `/dawuh`, `/profile/syahril-mubarok`, dan `/tag/jatman` = 200.
3. **Visual:** Playwright screenshot untuk beranda, artikel berita, artikel teduh (Dawuh), kategori Berita, kategori Hikmah, penulis, pencarian, 404, dan Tentang × lebar 375/768/1280/1440 × terang/gelap. Hasilnya di-review dengan skill impeccable (finish review) sebelum diserahkan ke pengguna.
4. **Aksesibilitas:** `@axe-core/playwright` di halaman yang sama, kedua mode: 0 pelanggaran serious/critical. Navigasi keyboard: skip link, fokus terlihat, laci menu bisa ditutup dengan Esc.
5. **Performa:** Lighthouse mobile untuk beranda dan artikel ≥ 90. Tidak ada request ke domain pihak ketiga saat halaman dimuat.
6. **Kode:** `php -l` untuk semua PHP. `theme.json` valid terhadap `https://schemas.wp.org/trunk/theme.json`. Tidak ada PHP notice/warning di `debug.log` saat semua halaman di atas dibuka (`WP_DEBUG` aktif di wp-env).

## 9. Risiko dan catatan

- **Markup Varient tidak konsisten** antar artikel lama → konversi ke block bisa meleset. Mitigasi: fallback `core/html` dan cek visual per artikel sample.
- **Rewrite kategori tanpa base** bisa bentrok dengan slug post/halaman. Mitigasi: post/halaman yang menang, bentrok dicatat, dan diuji di §8.2.
- **Status "Pustaka Tasawuf"** belum pasti kategori atau bukan (lihat §4). Diselesaikan di spec migrasi.
- **Lisensi font Arab:** KFGQPC Uthman Taha Naskh bukan OFL, dan versi -ID adalah turunan yang dimodifikasi. Izin untuk menyematkan versi modifikasi ini di web publik perlu dipastikan sebelum produksi. Untuk review lokal, aman.
- **Hak gambar:** gambar sample diambil dari jatman.or.id sendiri dan hanya untuk review lokal (`data/` di-gitignore).
