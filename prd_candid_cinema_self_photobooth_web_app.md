# Product Requirements Document (PRD)

## Project: "CineSnap" — Gen-Z Interactive Self-Photobooth Web Platform

**Target Execution Engine:** Antigravity Pro (Full-Stack Autonomous Implementation)  
**Deployment Target:** Vercel (Next.js App Router + Serverless Email Bot API)  
**Design Theme:** Red Warm Cinema, Candid Vintage, Tactile Gen-Z Kiosk  
**Core Features:** WebRTC Live Booth, Frame Slider, Auto-Segmented Sticker Studio, High-Res `.PNG` Export & Automated Email Delivery Bot

---

## 1. Executive Summary & Product Vision

### 1.1 Product Vision
Membangun aplikasi web *Self-Photobooth* interaktif yang mereplikasi 100% pengalaman mesin photobooth fisik populer (seperti *Photomatics* / *Life4Cuts*) langsung di dalam browser smartphone maupun desktop. Mengusung tema **Red Warm Candid Cinema**, aplikasi ini menargetkan audiens **Gen Z** dengan antarmuka yang ekspresif, cepat, fleksibel, dan estetis.

### 1.2 End-to-End User Journey
1. **Booth Setup & Capture:** User memilih jumlah *cut* (misal: 3-Pose Strip seperti aset referensi *Hollywood*, atau 4-Pose Strip), memilih filter warna *candid*, lalu melakukan sesi foto dengan *countdown timer* otomatis (atau unggah foto dari galeri).
2. **Frame Carousel Selection:** Setelah foto selesai diambil, layar menampilkan *interactive slide carousel* berisi berbagai pilihan *frame* yang langsung membungkus foto user secara *real-time*.
3. **Freeform Sticker & Asset Studio:** User masuk ke tahap dekorasi untuk menempel, memperbesar/memperkecil, dan memutar stiker bertema sinema (tiket, *popcorn*, *clapperboard*, pita film, bintang, angka tahun) yang telah dipotong per item dan dihapus latar belakangnya secara otomatis.
4. **Instant Export & Email Bot Delivery:** User dapat mengunduh hasil akhir dalam format `.png` beresolusi tinggi atau memasukkan alamat email mereka agar **Bot Sistem** mengirimkan hasil cetakan foto langsung ke kotak masuk email mereka.

---

## 2. Automated Asset Processing Pipeline (Instruksi Khusus Antigravity Pro)

Bagian ini adalah instruksi wajib bagi **Antigravity Pro** untuk memproses 2 gambar aset referensi yang diberikan pengguna menjadi aset siap pakai di dalam `/public/assets/`:

### 2.1 Pipeline A: Pemulihan Transparansi Frame (`frame-hollywood-3cut.png`)
Aset referensi frame kedua memiliki latar belakang motif kotak-kotak (*baked-in black/grey checkerboard*) di bagian luar dan di dalam 3 lubang slot foto. Antigravity Pro wajib menjalankan skrip pra-pemrosesan gambar (menggunakan Python `OpenCV` + `rembg` / `NumPy` atau Node.js `sharp`):
1. **Outer Background Removal:** Hapus motif kotak-kotak di luar garis putih *die-cut* frame sehingga bagian luar frame menjadi transparan murni ($\alpha = 0$).
2. **Inner Slot Alpha Punch-Out:** Deteksi 3 area persegi panjang di bagian tengah bingkai pita film merah dan ubah piksel di dalam koordinat slot tersebut menjadi transparan penuh (`rgba(0, 0, 0, 0)`), sementara elemen dekoratif yang menjorok ke dalam slot (seperti bintang merah, bola disko, *clapperboard*, dan tiket *Admit One*) tetap dipertahankan di lapisan atas (*foreground mask*).
3. **Normalized Slot Coordinates:** Simpan koordinat rasio ternormalisasi $[x, y, w, h]$ dalam rentang $[0.0, 1.0]$ untuk ketiga slot foto agar *engine* kanvas tahu persis di mana foto user harus diletakkan di belakang frame.

### 2.2 Pipeline B: Auto-Slicer & Background Removal Lembaran Stiker (`sticker-sheet-cinema.jpg`)
Aset referensi pertama adalah *sticker sheet* gabungan berlatar putih yang memuat puluhan elemen (tiket *Cinema*, *Movie Night*, *Clapperboard*, ember *Popcorn*, TV *Netflix*, pita film panjang, bintang glitter, topeng teater, dan angka `2026`).
Antigravity Pro harus membuat dan mengeksekusi skrip **Automated Sticker Slicer (`scripts/extract-stickers.py` atau `scripts/extract-stickers.mjs`)** dengan algoritma berikut:
1. **Thresholding & Contour Detection:**
   * Konversi gambar lembaran stiker ke ruang warna *grayscale* dan terapkan *binary inverse threshold* atau *adaptive thresholding* untuk memisahkan objek stiker dari latar belakang putih (`#FFFFFF`).
   * Terapkan operasi morfologi *dilation* ringan (kernel $5 \times 5$) agar elemen-elemen dalam satu stiker yang sama menyatu sebagai satu *connected component*.
2. **Bounding Box Cropping:**
   * Ekstrak setiap kontur eksternal (`cv2.RETR_EXTERNAL`) yang memiliki luas area $A > 1500\text{ px}^2$ (untuk mengabaikan *noise* titik kecil).
   * Tambahkan *padding* sebesar $8\text{ px}$ di sekeliling kotak pembatas $[x_{\min}, y_{\min}, x_{\max}, y_{\max}]$ dan potong (*crop*) masing-masing objek menjadi gambar individual.
3. **AI Background Removal per Sticker:**
   * Jalankan `rembg` (model `u2net` atau `isnet-general-use`) pada setiap potongan stiker untuk menghapus latar belakang putih secara bersih sekaligus mempertahankan *white die-cut border* tipis jika ada.
   * Untuk penggunaan di sisi klien (jika user mengunggah stiker kustom sendiri di browser), integrasikan `@imgly/background-removal` berbasis WebAssembly.
4. **Auto-Manifest Generation:**
   * Simpan seluruh hasil potongan ke `/public/assets/stickers/cinema/sticker-[index].png` dan otomatis buat file `/src/data/stickers.json` berisi daftar ID, kategori, URL file, serta rasio dimensi masing-masing stiker.

---

## 3. Design System: "Red Warm Candid Cinema"

Desain dirancang untuk memikat **Gen Z**: perpaduan suasana lobi bioskop klasik, lampu neon hangat, tekstur analog *grainy*, dan tombol yang sangat ringkas namun *tactile* (enak disentuh di layar HP).

### 3.1 Color Palette Tokens (Tailwind CSS Configuration)

| Token Name | Hex Code | Peran Visual |
| :--- | :--- | :--- |
| `--bg-theater-dark` | `#160D0C` | Latar belakang utama ruang photobooth (Espresso Maroon gelap) |
| `--bg-velvet-surface` | `#241413` | Latar kontainer kontrol, *drawer* stiker, dan panel bawah |
| `--bg-popcorn-cream` | `#FCF5E8` | Warna aksen kartu terang, teks utama, dan latar tiket |
| `--accent-cinema-red` | `#C92A2A` | Tombol aksi utama (*Shutter*, *Next*, *Download*), sorotan aktif |
| `--accent-warm-ember` | `#E0533C` | Efek *hover*, gradasi hangat, *badge* hitung mundur |
| `--accent-marquee-gold`| `#E5B869` | Aksen bintang, border frame aktif, ikon VIP/etiket |
| `--text-cream-primary` | `#FAF0E4` | Teks utama yang kontras dan hangat di atas latar gelap |
| `--text-muted-warm` | `#A89088` | Teks sekunder, petunjuk langkah, dan metadata |

### 3.2 Typography & Visual Effects
* **Display / Heading Font:** *Syne*, *Fraunces*, atau *Bebas Neue* (memberikan kesan poster sinema / *marquee* yang berani).
* **UI & Controls Font:** *Plus Jakarta Sans* (modern, bersih, sangat akrab bagi Gen Z).
* **Timestamp / Ticket Font:** *JetBrains Mono* atau *VT323* (untuk cetakan tanggal ala kamera analog di sudut foto, misal: `'26 11 02`).
* **Tactile UI Elements:**
  * Tombol *pill* ringkas dengan *glassmorphism* hangat (`backdrop-blur-md bg-[#241413]/80 border border-[#E5B869]/20`).
  * Efek suara opsional (*Web Audio API*): suara bunyi *beep* saat *countdown*, suara *shutter* kamera analog + kilatan layar putih (*screen flash*) saat foto dijepret, dan animasi kertas foto keluar dari mesin cetak di tahap akhir.

---

## 4. Detailed Functional Specifications (5-Stage Kiosk State Machine)

Aplikasi berjalan sebagai *Single-Page Application (SPA)* tanpa *reload* halaman menggunakan *State Machine* yang dikelola melalui **Zustand** (`useBoothStore`).

### Stage 1: Layout & Mode Selection (`STEP_LAYOUT`)
* User memilih format *strip* photobooth:
  1. **3-Cut Vertical Cinema Strip** (Sesuai aset referensi *Hollywood*, rasio sekitar $1 : 2.6$).
  2. **4-Cut Classic Strip** (Standar photobooth vertikal $1 : 3$).
  3. **2x2 Candid Grid** (Format kartu pos / *story* ramah Instagram).

### Stage 2: Live Candid Camera Booth (`STEP_CAPTURE`)
* **WebRTC Video Stream:** Menggunakan `navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" } })`.
* **Compact Control Bar:**
  * **Mirror Toggle:** Membalik tampilan horizontal kamera ($\text{scaleX}(-1)$).
  * **Timer Selector:** Pilihan waktu hitung mundur per jepretan ($3\text{s}$, $5\text{s}$, $10\text{s}$) dan mode *Auto-Continuous* (otomatis menjepret pose ke-1 hingga ke-$N$ secara berurutan).
  * **Live Candid Filters (LUT / CSS Canvas Filter):**
    * *Warm Candid* (Default: sedkit *warmth*, *contrast* $+10\%$, *soft grain*).
    * *Cinema 90s* (Nada merah-kuning hangat dengan *vignette* halus).
    * *Disposable Flash* (Eksposur terang di tengah, kontras tinggi).
    * *Noir Classic* (Hitam putih dramatis ala film klasik).
* **Retake Individual Pose & Upload Fallback:**
  * Di samping kamera terdapat *mini-preview* slot $1, 2, 3$. Jika user kurang suka dengan foto ke-2, user cukup menekan slot ke-2 untuk mengulang foto tersebut saja tanpa mengulang semuanya.
  * Tersedia tombol ringkas **"Upload Photo"** bagi user yang ingin memasukkan foto yang sudah ada di HP mereka.

### Stage 3: Interactive Frame Carousel (`STEP_FRAME`)
* Begitu semua slot foto terisi, antarmuka bergeser mulus ke mode **Pemilihan Frame**.
* **Live Preview di Atas, Slider di Bawah:**
  * Di bagian tengah layar, foto-foto user langsung ditampilkan menyatu di balik frame yang sedang aktif.
  * Di bagian bawah terdapat **Horizontal Snap Carousel** (menggunakan `embla-carousel-react` atau `swiper`) yang menampilkan deretan *thumbnail* frame.
* **Koleksi Frame Default & Kustom:**
  1. **Hollywood Red Glitter (Aset Utama):** Menggunakan frame referensi *Hollywood* lengkap dengan dekorasi bintang, bola disko, *clapperboard*, dan tiket *Admit One*.
  2. **Cinema Film Strip Black:** Frame pita seluloid hitam klasik dengan lubang sproket di kanan-kiri.
  3. **Velvet Maroon Minimalist:** Frame polos warna merah marun hangat dengan tipografi emas tipis.
  4. **Popcorn Cream Scrapbook:** Frame warna krem hangat bergaya kertas tiket bioskop.
  5. **Custom Color Picker:** Opsi fleksibel bagi Gen Z untuk mengganti warna dasar frame dan menambahkan teks *footer* pendek (misal: *"Movie Night w/ Bestie"*).

### Stage 4: Sticker & Decoration Studio (`STEP_STICKER`)
* Setelah mengunci pilihan frame, user menekan tombol **"Lanjut Pilih Stiker"** untuk membuka kanvas interaktif (dibangun dengan **Konva.js / `react-konva`** atau **Fabric.js**).
* **Categorized Sticker Drawer (Dari Aset yang Telah Di-Slice & Di-Remove BG):**
  * **Tab 1: Tickets & Signs:** Tiket *Admit One* merah/kuning/hitam/pink, papan neon *CINEMA*, *Movie Night*.
  * **Tab 2: Movie Props:** *Clapperboard*, ember *Popcorn*, kacamata 3D, TV *Netflix*, gulungan pita film, topeng teater.
  * **Tab 3: Stars & Badges:** Bintang glitter emas, bintang merah, indikator baterai `1%`, blok angka `2`, `0`, `2`, `6`, stiker *The End Graduation*.
  * **Tab 4: Upload Custom Sticker (Auto Remove BG):** User bisa memilih gambar apa saja dari galeri mereka, dan sistem otomatis menghapus background-nya di browser menjadi stiker baru!
* **Manipulasi Fleksibel:**
  * Klik stiker di *drawer* untuk menambahkannya ke atas photostrip.
  * Dukung *multi-touch pinch-to-zoom* (di layar HP) dan *bounding-box handles* (di layar desktop) untuk menggeser posisi $(x, y)$, mengubah ukuran ($s$), memutar sudut ($\theta$), menduplikasi, mengubah urutan layer (*bring to front*), atau menghapus stiker.

### Stage 5: Printing Animation, `.PNG` Download & Email Bot (`STEP_EXPORT`)
* Saat user menekan **"Selesai & Cetak"**, tampilkan animasi mesin photobooth yang sedang mencetak lembaran foto dari atas ke bawah selama $1.5\text{ detik}$.
* **Pilihan Output:**
  1. **Download `.PNG` (Instan):** Mengunduh file `cinesnap-photobooth-[timestamp].png` beresolusi penuh langsung ke perangkat user.
  2. **Send via Email (Automated Bot):**
     * User mengetikkan alamat email mereka pada kolom input bergaya tiket bioskop, lalu menekan **"Kirim ke Email"**.
     * Tombol menampilkan status *loading* singkat (`"Mengirim via CineBot..."`), lalu muncul notifikasi sukses ketika email terkirim.

---

## 5. High-Resolution Canvas Compositing Math

Agar hasil unduhan `.png` dan lampiran email tetap tajam (tidak pecah mengikuti ukuran layar HP yang kecil), proses *rendering* akhir wajib menggunakan *Offscreen High-DPI Canvas* dengan lebar tetap $W_{\text{export}} = 1200\text{ px}$ dan tinggi proporsional $H_{\text{export}}$ (misal $3120\text{ px}$ untuk rasio $1 : 2.6$).

### 5.1 Urutan Layer Rendering (Z-Index Pipeline)
1. **Layer 0 (Base Fill):** Gambar warna latar belakang atau tekstur dasar pada $[0, 0, W_{\text{export}}, H_{\text{export}}]$.
2. **Layer 1 (User Photos with Object-Fit Cover):**
   Untuk setiap slot foto ke-$i$ dengan koordinat ternormalisasi $[x_i, y_i, w_i, h_i]$:
   $$X_i = x_i \cdot W_{\text{export}}, \quad Y_i = y_i \cdot H_{\text{export}}, \quad W_i = w_i \cdot W_{\text{export}}, \quad H_i = h_i \cdot H_{\text{export}}$$
   Hitung rasio aspek slot $R_{\text{slot}} = \frac{W_i}{H_i}$ dan rasio aspek gambar sumber kamera $R_{\text{src}} = \frac{W_{\text{src}}}{H_{\text{src}}}$. Lakukan *center-crop* agar foto tidak gepeng (*stretched*):
   * Jika $R_{\text{src}} > R_{\text{slot}}$, potong sisi kiri dan kanan sumber:
     $$w_{\text{crop}} = H_{\text{src}} \cdot R_{\text{slot}}, \quad h_{\text{crop}} = H_{\text{src}}, \quad x_{\text{crop}} = \frac{W_{\text{src}} - w_{\text{crop}}}{2}, \quad y_{\text{crop}} = 0$$
   * Jika $R_{\text{src}} \le R_{\text{slot}}$, potong sisi atas dan bawah sumber:
     $$w_{\text{crop}} = W_{\text{src}}, \quad h_{\text{crop}} = \frac{W_{\text{src}}}{R_{\text{slot}}}, \quad x_{\text{crop}} = 0, \quad y_{\text{crop}} = \frac{H_{\text{src}} - h_{\text{crop}}}{2}$$
3. **Layer 2 (Frame Overlay):** Gambar file `.png` frame transparan tepat menutupi $[0, 0, W_{\text{export}}, H_{\text{export}}]$ sehingga foto di Layer 1 terlihat mengintip dari balik jendela frame.
4. **Layer 3 (Interactive Stickers):**
   Untuk setiap stiker aktif dengan posisi kanvas pratinjau $(x_s, y_s)$, faktor skala $s$, dan rotasi $\theta$ (dalam radian), kalikan koordinat dengan rasio skala ekspor $K = \frac{W_{\text{export}}}{W_{\text{preview}}}$:
   $$\mathbf{T}_s = \begin{bmatrix} s \cos\theta & -s \sin\theta & K \cdot x_s \\ s \sin\theta & s \cos\theta & K \cdot y_s \\ 0 & 0 & 1 \end{bmatrix}$$
5. **Layer 4 (Timestamp & Export):** Ekspor kanvas menggunakan `canvas.toDataURL('image/png', 1.0)`.

---

## 6. Automated Email Bot Architecture (Vercel Serverless)

Sistem pengiriman email berjalan secara otomatis melalui **Next.js API Route (`/app/api/send-email/route.ts`)** yang di-deploy sebagai *Serverless Function* di Vercel. Mendukung dua metode pengiriman (Resend API atau Gmail SMTP via Nodemailer) agar fleksibel:

```
[ User Input Email ] ──(POST Base64 PNG + Email)──► [ Vercel Serverless: /api/send-email ]
                                                              │
                                           ┌──────────────────┴──────────────────┐
                                           ▼                                     ▼
                                [ Provider A: Resend API ]          [ Provider B: Gmail SMTP Bot ]
                                           │                                     │
                                           └──────────────────┬──────────────────┘
                                                              ▼
                                           [ User Inbox: HTML Ticket Email + PNG ]
```

### 6.1 Spesifikasi Endpoint `/api/send-email`
* **Method:** `POST`
* **Request Body Schema:**
  ```typescript
  interface SendEmailPayload {
    email: string;          // Alamat email tujuan user (divalidasi dengan Regex/Zod)
    imageBase64: string;    // Data URL "data:image/png;base64,iVBORw0KGgo..."
    frameName?: string;     // Nama frame yang dipilih (e.g., "Hollywood Red Glitter")
    takenAt?: string;       // Tanggal & waktu pengambilan foto
  }
  ```
* **Implementasi Bot (Dual-Driver: Nodemailer SMTP / Resend):**
  ```typescript
  // src/app/api/send-email/route.ts
  import { NextResponse } from 'next/server';
  import nodemailer from 'nodemailer';

  export async function POST(req: Request) {
    try {
      const { email, imageBase64, frameName = 'Cinema Edition' } = await req.json();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
      }

      if (!imageBase64 || !imageBase64.startsWith('data:image/png;base64,')) {
        return NextResponse.json({ error: 'Data gambar PNG tidak valid' }, { status: 400 });
      }

      // Konversi Base64 ke Buffer untuk lampiran file .png
      const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const fileName = `cinesnap-${Date.now()}.png`;

      // Konfigurasi Transporter Bot (Bisa menggunakan Gmail App Password atau SMTP lain)
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER, // Email bot pengirim
          pass: process.env.SMTP_PASS, // App Password
        },
      });

      await transporter.sendMail({
        from: `"CineSnap Photobooth Bot 🎬" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '🎟️ Cetakan Foto Kamu dari CineSnap Photobooth Sudah Siap!',
        html: `
          <div style="background-color:#160D0C; color:#FAF0E4; font-family:sans-serif; padding:32px; border-radius:16px; max-width:520px; margin:0 auto; border:2px solid #C92A2A;">
            <h1 style="color:#E5B869; margin-top:0; font-size:24px; text-transform:uppercase; letter-spacing:1px;">🎬 ADMIT ONE: CINESNAP MEMORIES</h1>
            <p style="color:#FAF0E4; line-height:1.6;">Hai! Terima kasih sudah seru-seruan di <strong>CineSnap Self-Photobooth</strong>.</p>
            <p style="color:#A89088; font-size:14px;">Frame Pilihan: <strong style="color:#E5B869;">${frameName}</strong></p>
            <div style="background:#241413; padding:16px; border-radius:12px; border:1px dashed #E5B869; margin:20px 0; text-align:center;">
              <p style="margin:0; font-size:14px; color:#FAF0E4;">File foto resolusi penuh (<strong>.PNG</strong>) telah kami lampirkan di bawah email ini. Siap di-post ke Story kamu!</p>
            </div>
            <p style="font-size:12px; color:#A89088; text-align:center; margin-top:24px;">Dikirim otomatis oleh CineSnap Bot • Keep it Candid ✨</p>
          </div>
        `,
        attachments: [
          {
            filename: fileName,
            content: imageBuffer,
            contentType: 'image/png',
          },
        ],
      });

      return NextResponse.json({ success: true, message: 'Foto berhasil dikirim ke email!' });
    } catch (error) {
      console.error('Email Bot Error:', error);
      return NextResponse.json({ error: 'Gagal mengirim email' }, { status: 500 });
    }
  }
  ```

---

## 7. Data Schemas & Project Directory Structure

### 7.1 Skema Konfigurasi Frame (`src/data/frames.json`)
```json
[
  {
    "id": "hollywood-red-3cut",
    "name": "Hollywood Star",
    "category": "Cinema",
    "cutCount": 3,
    "aspectRatio": 0.3846,
    "canvasWidth": 1200,
    "canvasHeight": 3120,
    "overlayUrl": "/assets/frames/hollywood-3cut-transparent.png",
    "thumbnailUrl": "/assets/frames/thumbs/hollywood-3cut.webp",
    "backgroundColor": "#160D0C",
    "slots": [
      { "id": 1, "x": 0.215, "y": 0.135, "w": 0.565, "h": 0.230 },
      { "id": 2, "x": 0.215, "y": 0.380, "w": 0.565, "h": 0.235 },
      { "id": 3, "x": 0.215, "y": 0.635, "w": 0.565, "h": 0.235 }
    ]
  }
]
```

### 7.2 Skema Konfigurasi Stiker (`src/data/stickers.json`)
```json
[
  {
    "id": "stk-ticket-admit-red",
    "name": "Red Admit One Ticket",
    "category": "tickets",
    "src": "/assets/stickers/cinema/ticket-admit-red.png",
    "defaultWidth": 220
  },
  {
    "id": "stk-clapperboard-prod",
    "name": "Director Clapperboard",
    "category": "props",
    "src": "/assets/stickers/cinema/clapperboard-prod.png",
    "defaultWidth": 240
  },
  {
    "id": "stk-popcorn-bucket",
    "name": "Retro Popcorn",
    "category": "props",
    "src": "/assets/stickers/cinema/popcorn-bucket.png",
    "defaultWidth": 200
  },
  {
    "id": "stk-netflix-tv",
    "name": "Vintage Netflix TV",
    "category": "props",
    "src": "/assets/stickers/cinema/netflix-tv.png",
    "defaultWidth": 230
  },
  {
    "id": "stk-year-2026",
    "name": "2026 Cinema Block",
    "category": "badges",
    "src": "/assets/stickers/cinema/year-2026.png",
    "defaultWidth": 160
  }
]
```

### 7.3 Struktur Folder Proyek (Next.js App Router)
```text
cinesnap-photobooth/
├── public/
│   ├── assets/
│   │   ├── raw/                        # Tempat menaruh 2 gambar referensi asli
│   │   ├── frames/                     # Frame .png yang sudah transparan
│   │   └── stickers/cinema/            # Hasil auto-slice & remove-bg per stiker (.png)
│   └── sounds/                         # Efek suara shutter.mp3, beep.mp3, print.mp3
├── scripts/
│   └── process-assets.py               # Skrip Antigravity Pro untuk slice & remove bg otomatis
├── src/
│   ├── app/
│   │   ├── api/send-email/route.ts     # Endpoint Serverless Email Bot
│   │   ├── layout.tsx                  # Font & Red Warm Theme Provider
│   │   └── page.tsx                    # Main Self-Photobooth Kiosk State Machine
│   ├── components/
│   │   ├── booth/
│   │   │   ├── CameraStage.tsx         # WebRTC Live View, Countdown, Candid Filters
│   │   │   ├── FrameCarouselStage.tsx  # Interactive Frame Slider dengan Live Preview
│   │   │   ├── StickerStudioStage.tsx  # Konva/Fabric Interactive Sticker Canvas + Auto-BG Remover
│   │   │   └── ExportStage.tsx         # Animasi Cetak, Download .PNG & Form Email Bot
│   │   └── ui/                         # Tombol ringkas bergaya Red Warm Cinema
│   ├── data/
│   │   ├── frames.json
│   │   └── stickers.json
│   ├── store/
│   │   └── useBoothStore.ts            # Zustand State Management (photos, selectedFrame, stickers)
│   └── utils/
│       ├── canvasRenderer.ts           # High-DPI Offscreen Canvas Compositor
│       └── clientBgRemover.ts          # Wrapper @imgly/background-removal untuk stiker kustom
├── .env.example
├── next.config.ts
└── package.json
```

---

## 8. Vercel Deployment & Environment Configuration

### 8.1 Konfigurasi Batas Payload di Vercel
Karena aplikasi mengirimkan gambar `.png` beresolusi tinggi (sekitar $1.5\text{ MB} - 3\text{ MB}$ dalam format Base64) ke endpoint `/api/send-email`, pastikan ukuran kanvas ekspor dijaga optimal ($1200\text{ px}$ lebar) agar tetap berada di bawah batas *body payload* Serverless Function Vercel ($4.5\text{ MB}$).

### 8.2 Environment Variables (`.env.local` & Dashboard Vercel)
Tambahkan variabel berikut pada pengaturan **Environment Variables** di Vercel:
```env
# Konfigurasi Bot Email (Menggunakan Gmail App Password atau layanan SMTP/Resend)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="your-bot-email@gmail.com"
SMTP_PASS="xxxx-xxxx-xxxx-xxxx" # 16-digit Google App Password

# Opsional jika menggunakan Resend API
RESEND_API_KEY="re_123456789"
```

---

## 9. Step-by-Step Execution Prompt untuk Antigravity Pro

Gunakan urutan eksekusi ini saat menjalankan **Antigravity Pro**:
1. **Tahap 1 (Asset Slicing & Transparency):** Jalankan skrip pemrosesan gambar pada kedua file referensi yang diunggah untuk menghasilkan `/public/assets/frames/hollywood-3cut-transparent.png` (dengan 3 slot tengah transparan) dan memotong seluruh objek pada lembaran stiker menjadi file `.png` individual tanpa background di `/public/assets/stickers/cinema/`.
2. **Tahap 2 (Core Booth & Camera):** Bangun aplikasi Next.js dengan tema warna *Red Warm Cinema*, implementasikan modul kamera WebRTC beserta *countdown timer*, *mirror toggle*, filter *candid*, dan fitur *retake* per slot.
3. **Tahap 3 (Frame Slider & Sticker Studio):** Hubungkan hasil foto dengan *Frame Carousel* dan kanvas interaktif *Sticker Studio* (drag, resize, rotate, delete, plus fitur hapus background otomatis untuk stiker tambahan).
4. **Tahap 4 (Export & Email Bot):** Implementasikan fungsi unduh `.png` resolusi tinggi dan API `/api/send-email` agar bot dapat langsung mengirimkan hasil foto ke email pengguna.