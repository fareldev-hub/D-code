# D-code

D-code adalah website sederhana untuk membantu pemula mengenal coding dan pengembangan web. Website ini memiliki halaman utama, halaman Learn berisi jalur belajar, serta bagian untuk mengenal komunitas ThePort dan Vyntera.

## Fitur

- Halaman utama dengan desain responsif.
- Dashboard informasi aplikasi di `/dashboard`, dengan tautan pencarian D-code di APKPure.
- Halaman Learn di `/learn`, berisi pengenalan HTML, CSS, JavaScript, PHP, Python, dan Java.
- Katalog proyek di `/templates` menyimpan URL repository GitHub di `public/projects.json`; metadata kartu dan detail repository dimuat langsung melalui GitHub API. Daftar proyek ditampilkan sebagai kartu dan dapat dicari berdasarkan nama, pembuat, deskripsi, atau bahasa.
- Halaman detail template menampilkan file repository dalam editor bergaya VS Code, merender file Markdown sebagai dokumen yang disanitasi, dan menampilkan preview dari URL proyek atau source HTML repository jika tersedia.
- Kebijakan privasi di `/privacy`.
- Informasi komunitas ThePort dan Vyntera beserta tautan GitHub.
- Tombol berbagi menggunakan Web Share API jika tersedia, dengan opsi menyalin tautan sebagai alternatif.
- Aset CSS dan JavaScript sisi klien disimpan di `private/` dan disajikan oleh rute aset khusus; navigasi langsung ke URL aset diarahkan ke halaman 404.

> Halaman Learn saat ini berisi pengenalan dan jalur belajar. Materi kursus interaktif belum tersedia.
> Aset di `private/` tetap dikirim ke browser agar halaman dapat berfungsi, jadi penempatan folder ini bukan mekanisme untuk merahasiakan kode.

## Teknologi

- HTML, CSS, dan JavaScript ES modules untuk antarmuka.
- Node.js dan Express 5 untuk menyajikan website.
- Font Awesome, SweetAlert2, Highlight.js, Marked, dan DOMPurify melalui CDN.

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

4. Buka [http://localhost:3000](http://localhost:3000). Dashboard aplikasi tersedia di [http://localhost:3000/dashboard](http://localhost:3000/dashboard), halaman Learn di [http://localhost:3000/learn](http://localhost:3000/learn), katalog template di [http://localhost:3000/templates](http://localhost:3000/templates), dan kebijakan privasi di [http://localhost:3000/privacy](http://localhost:3000/privacy).

Server menggunakan port `3000` secara default; atur environment variable `PORT` untuk menggunakan port lain.

## Struktur proyek

```text
.
|-- index.js              # Server Express dan rute halaman
|-- private/
|   |-- app.js            # JavaScript antarmuka
|   |-- templates.js      # Daftar katalog proyek
|   |-- template-detail.js # Daftar file, kode, dan pratinjau proyek
|   `-- css/              # Stylesheet website
`-- public/
    |-- index.html        # Halaman utama
    |-- dashboard.html   # Informasi aplikasi dan tautan APKPure
    |-- learn.html        # Halaman Learn
    |-- privacy.html      # Kebijakan privasi
    |-- templates.html    # Katalog proyek dan template
    |-- template-detail.html # Detail file dan pratinjau proyek
    |-- projects.json     # Daftar proyek repository
    |-- 404.html          # Halaman tidak ditemukan
    `-- brands/           # Logo komunitas
```

## Kontribusi

Kontribusi untuk perbaikan bug, aksesibilitas, desain responsif, dan penambahan materi belajar sangat terbuka.

1. Buat issue untuk melaporkan bug atau mendiskusikan perubahan besar sebelum mulai mengerjakannya.
2. Fork repositori, lalu buat branch dengan nama yang menggambarkan perubahan, misalnya `feat/materi-html` atau `fix/mobile-layout`.
3. Buat perubahan dengan cakupan yang jelas dan ikuti pola kode yang sudah ada.
4. Periksa halaman utama, `/dashboard`, `/learn`, dan `/privacy` di desktop serta perangkat seluler. Pastikan tautan dan tombol yang terdampak tetap berfungsi.
5. Kirim pull request yang menjelaskan perubahan dan cara pengujiannya.

Belum ada skrip pengujian otomatis yang didefinisikan di `package.json`; verifikasi perubahan antarmuka secara manual sebelum mengirim pull request.
