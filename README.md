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

## Tes

```bash
npm test                 # unit (node:test) + PHP (env tests wp-env) + e2e (Playwright)
npm run lint:php && npm run lint:theme-json
npm run screens          # screenshot semua halaman → tests/output/screens/
npm run lighthouse       # performa mobile beranda & artikel (minimal 90)
```

Spec: `docs/superpowers/specs/2026-10-10-jatman-wp-theme-design.md`
