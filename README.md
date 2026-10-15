# D-code

D-code adalah website untuk membantu pemula mengenal coding dan pengembangan web melalui jalur belajar serta katalog proyek open-source dan template.

## Fitur

- Halaman utama dengan desain responsif.
- Dashboard informasi aplikasi di `/dashboard`, dengan tautan pencarian D-code di APKPure.
- Halaman Learn di `/learn`, berisi pengenalan HTML, CSS, JavaScript, PHP, Python, dan Java.
- Katalog proyek di `/templates` menyimpan URL repository GitHub di `public/projects.json`; metadata kartu dan detail repository dimuat langsung melalui GitHub API. Daftar proyek ditampilkan sebagai kartu dan dapat dicari berdasarkan nama, pembuat, deskripsi, atau bahasa.
- Halaman detail `/templates/:owner/:repository` menampilkan file repository dalam editor bergaya VS Code, dengan line number dan ruang gulir setelah baris terakhir. File Markdown dirender sebagai dokumen yang disanitasi.
- Preview detail menggunakan URL homepage repository jika tersedia. Jika tidak, halaman HTML di repository digunakan untuk membuat preview; repository tanpa HTML ditampilkan dalam mode editor saja.
- Kebijakan privasi di `/privacy`.
- Informasi komunitas ThePort dan Vyntera beserta tautan GitHub di halaman utama.
- Tombol berbagi menggunakan Web Share API jika tersedia, dengan opsi menyalin tautan sebagai alternatif.
- Aset CSS dan JavaScript antarmuka disimpan di `private/` dan disajikan melalui rute aset khusus. Akses folder `/private` maupun navigasi dokumen langsung ke file `.css` atau `.js` diarahkan ke halaman 404.

> Halaman Learn saat ini berisi pengenalan dan jalur belajar. Materi kursus interaktif belum tersedia.
> CSS dan JavaScript di `private/` tetap dikirim ke browser agar halaman berfungsi. Rute 404 mencegah navigasi dokumen langsung, tetapi tidak dapat merahasiakan kode yang digunakan browser.

## Teknologi

- HTML, CSS, dan JavaScript ES modules untuk antarmuka.
- Node.js dan Express 5 untuk menyajikan website.
- Font Awesome, SweetAlert2, Highlight.js, Marked, dan DOMPurify melalui CDN.
- GitHub REST API dan `raw.githubusercontent.com` untuk metadata dan file proyek.

## Persyaratan

- Node.js dan npm terpasang.
- Koneksi internet diperlukan untuk memuat metadata GitHub, file repository, dan pustaka antarmuka dari CDN.

## Menjalankan secara lokal

1. Clone repositori dan masuk ke folder proyek:

   ```bash
   git clone https://github.com/fareldev-hub/d-code
   cd D-code
   ```

2. Pasang dependensi:

   ```bash
   npm install
   ```

3. Jalankan server:

   ```bash
   npm start
   ```

4. Buka [http://localhost:3000](http://localhost:3000). Halaman yang tersedia: dashboard di [http://localhost:3000/dashboard](http://localhost:3000/dashboard), Learn di [http://localhost:3000/learn](http://localhost:3000/learn), katalog template di [http://localhost:3000/templates](http://localhost:3000/templates), dan kebijakan privasi di [http://localhost:3000/privacy](http://localhost:3000/privacy).

Server menggunakan port `3000` secara default; atur environment variable `PORT` untuk menggunakan port lain.

## Menambahkan proyek ke katalog

Tambahkan URL repository GitHub publik ke array `projects` dalam `public/projects.json`:

```json
{
  "projects": [
    "https://github.com/pemilik/nama-repository"
  ]
}
```

Nama repository, pembuat, deskripsi, bahasa, cabang utama, dan homepage diambil saat katalog/detail dibuka. Metadata dan file sumber memerlukan koneksi ke GitHub API; repository yang tidak memiliki homepage hanya dapat menampilkan preview source jika berisi file HTML.

## Struktur proyek

```text
.
|-- index.js               # Server Express, rute halaman, dan penyajian aset
|-- private/
|   |-- app.js              # JavaScript antarmuka bersama
|   |-- templates.js        # Katalog dan pencarian proyek
|   |-- template-detail.js  # Explorer, editor, Markdown, dan preview proyek
|   `-- css/                # Stylesheet website
`-- public/
    |-- index.html           # Halaman utama
    |-- dashboard.html       # Informasi aplikasi dan tautan APKPure
    |-- learn.html           # Halaman Learn
    |-- privacy.html         # Halaman kebijakan privasi
    |-- templates.html       # Katalog proyek dan template
    |-- template-detail.html # Detail file dan pratinjau proyek
    |-- projects.json        # URL repository proyek katalog
    |-- 404.html             # Halaman tidak ditemukan
    `-- brands/              # Logo komunitas
```

## Kontribusi

Kontribusi untuk perbaikan bug, aksesibilitas, desain responsif, dan penambahan materi belajar sangat terbuka.

1. Buat issue untuk melaporkan bug atau mendiskusikan perubahan besar sebelum mulai mengerjakannya.
2. Fork repositori, lalu buat branch dengan nama yang menggambarkan perubahan, misalnya `feat/materi-html` atau `fix/mobile-layout`.
3. Buat perubahan dengan cakupan yang jelas dan ikuti pola kode yang sudah ada.
4. Periksa halaman utama, `/dashboard`, `/learn`, `/templates`, detail proyek, dan `/privacy` di desktop serta perangkat seluler. Pastikan navigasi, pencarian, editor, preview, dan tombol yang terdampak tetap berfungsi.
5. Kirim pull request yang menjelaskan perubahan dan cara pengujiannya.

Belum ada skrip pengujian otomatis yang didefinisikan di `package.json`; verifikasi perubahan antarmuka secara manual sebelum mengirim pull request.
