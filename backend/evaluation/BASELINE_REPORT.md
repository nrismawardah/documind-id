# DocuMind ID — Laporan Evaluasi Baseline

**Tahap:** 08 — Evaluasi Retrieval dan Bukti Teknis  
**Status:** Baseline retrieval terdokumentasi; evaluasi kualitas jawaban AI belum tercakup.  
**Tanggal laporan:** 23 Oktober 2026

## 1. Tujuan

Evaluasi ini dilakukan untuk mendokumentasikan performa awal retrieval DocuMind ID dalam menemukan potongan dokumen yang sesuai dengan kebutuhan pertanyaan. Evaluasi juga mencatat pengujian unit yang tersedia untuk mekanisme jawaban berbasis bukti dan abstention.

Evaluasi baseline ini tidak dimaksudkan untuk membuktikan akurasi jawaban AI secara keseluruhan.

## 2. Dataset dan konfigurasi

| Komponen                    | Nilai                                  |
| --------------------------- | -------------------------------------- |
| Jumlah pertanyaan           | 30                                     |
| Pertanyaan answerable       | 21                                     |
| Pertanyaan unanswerable     | 9                                      |
| Dokumen pengujian           | `documind_id_dokumen_uji_baseline.pdf` |
| Jumlah halaman dokumen      | 13                                     |
| `match_count`               | 20                                     |
| `match_threshold`           | 0.0                                    |
| Nilai Top-K yang dievaluasi | 1, 3, dan 5                            |

Dataset terdiri atas empat kategori:

| Kategori         | Jumlah pertanyaan |
| ---------------- | ----------------: |
| `direct_fact`    |                10 |
| `multi_fact`     |                 8 |
| `unanswerable`   |                 6 |
| `ambiguity_trap` |                 6 |
| **Total**        |            **30** |

Pengujian retrieval dijalankan menggunakan skrip `evaluate_retrieval.py`. Hasil disimpan dalam `retrieval_results.csv` dan `retrieval_summary.json`.

## 3. Hasil baseline retrieval

### 3.1 Hasil berdasarkan kelompok pertanyaan

| Metrik | Semua pertanyaan (30) | Answerable (21) | Unanswerable (9) |
| ------ | --------------------: | --------------: | ---------------: |
| Hit@1  |                83,33% |          90,48% |           66,67% |
| Hit@3  |                96,67% |         100,00% |           88,89% |
| Hit@5  |                96,67% |         100,00% |           88,89% |
| MRR    |                0,8944 |          0,9524 |           0,7593 |

**Interpretasi:**

- Pada seluruh 30 pertanyaan, Hit@5 mencapai 96,67%. Artinya, menurut label relevansi halaman pada dataset evaluasi, setidaknya satu halaman yang ditandai relevan ditemukan dalam lima hasil teratas pada 29 pertanyaan.
- Pada 21 pertanyaan answerable, Hit@5 mencapai 100%. Semua pertanyaan dalam kelompok ini memiliki kecocokan halaman relevan dalam lima hasil teratas berdasarkan label evaluasi.
- Pada sembilan pertanyaan unanswerable, Hit@5 mencapai 88,89%. Hasil ini tidak berarti sistem berhasil menjawab atau menolak pertanyaan dengan benar. Kecocokan halaman retrieval bukan bukti bahwa jawaban tersedia di dokumen.

### 3.2 Hasil berdasarkan kategori

| Kategori         | Jumlah |   Hit@1 |   Hit@3 |   Hit@5 |    MRR |
| ---------------- | -----: | ------: | ------: | ------: | -----: |
| `direct_fact`    |     10 |  80,00% | 100,00% | 100,00% | 0,9000 |
| `multi_fact`     |      8 | 100,00% | 100,00% | 100,00% | 1,0000 |
| `unanswerable`   |      6 |  66,67% |  83,33% |  83,33% | 0,7500 |
| `ambiguity_trap` |      6 |  83,33% | 100,00% | 100,00% | 0,8889 |

Metrik kategori mengukur kecocokan retrieval menurut label yang tersedia. Metrik tersebut tidak menilai kelengkapan jawaban, kemampuan menyelesaikan ambiguitas, atau kemampuan abstention.

## 4. Contoh kegagalan retrieval: U05

**Pertanyaan:** “Berapa hasil aktual keseluruhan program selama tahun 2025?”

| Atribut                               | Hasil          |
| ------------------------------------- | -------------- |
| ID                                    | `U05`          |
| Kategori                              | `unanswerable` |
| Status answerable pada dataset        | `False`        |
| Halaman acuan evaluasi (`gold_pages`) | 11, 13         |
| Jumlah hasil retrieval                | 17             |
| Peringkat relevansi pertama           | 6              |
| Hit@1                                 | 0              |
| Hit@3                                 | 0              |
| Hit@5                                 | 0              |
| Similarity tertinggi                  | Sekitar 0,8177 |

U05 merupakan satu-satunya pertanyaan yang tidak memiliki kecocokan halaman acuan dalam lima hasil teratas berdasarkan `retrieval_results.csv`.

Nilai similarity tertinggi sekitar 0,8177 tidak dengan sendirinya membuktikan bahwa hasil tersebut mengandung jawaban yang dibutuhkan.

**Batasan interpretasi:** U05 ditandai `unanswerable`, tetapi dataset juga mencantumkan halaman 11 dan 13 sebagai `gold_pages`. Laporan ini mempertahankan kedua nilai tersebut sebagaimana tercatat dan tidak menyimpulkan bahwa halaman tersebut benar-benar memuat jawaban. Definisi label dan isi halaman perlu diverifikasi sebelum menjadikan kasus ini sebagai bukti kualitas abstention.

## 5. Pengujian unit mekanisme jawaban berbasis bukti

Pemeriksaan terhadap `backend/tests/test_grounded_answer.py` dan `backend/tests/test_gemini_service.py` menunjukkan adanya pengujian untuk:

- Menerima indeks sumber yang valid.
- Menolak atau menyaring indeks sumber yang tidak valid, duplikat, dan bertipe tidak sesuai.
- Menghasilkan marker abstention ketika respons JSON tidak valid.
- Menghasilkan marker abstention ketika jawaban tidak memiliki sumber terpilih.
- Menangani respons Gemini kosong.
- Melakukan retry ketika terjadi error server sementara.
- Memasukkan riwayat percakapan ke prompt, dengan instruksi bahwa riwayat bukan sumber bukti.

Pengujian tersebut menggunakan respons tiruan (_mock_) pada bagian yang diuji. Hasilnya dapat mendukung verifikasi perilaku kode yang bersangkutan, tetapi tidak membuktikan kualitas jawaban yang dihasilkan model pada dokumen nyata.

Bagian ini mencatat keberadaan dan cakupan tes yang diperiksa, bukan menyatakan seluruh tes telah dijalankan ulang dalam penyusunan laporan ini.

## 6. Evaluasi yang belum tercakup

Aspek berikut belum memiliki hasil pengukuran langsung dalam baseline ini.

| Aspek                                             | Status                         | Kebutuhan evaluasi                                                             |
| ------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| Kebenaran jawaban AI                              | Belum diukur                   | Membandingkan jawaban aktual dengan jawaban acuan                              |
| Faithfulness terhadap dokumen                     | Belum diukur                   | Memeriksa apakah klaim jawaban didukung oleh isi dokumen                       |
| Ketepatan sitasi                                  | Belum diukur                   | Memeriksa apakah halaman dan kutipan mendukung klaim yang dirujuk              |
| Ketepatan abstention                              | Belum diukur secara end-to-end | Menguji apakah sistem menolak pertanyaan yang tidak dapat dijawab dari dokumen |
| Kualitas jawaban multi-fakta                      | Belum diukur                   | Memeriksa kelengkapan fakta yang diminta                                       |
| Ketahanan terhadap prompt injection dalam dokumen | Belum dievaluasi di tahap ini  | Memerlukan pengujian keamanan tersendiri                                       |

Mekanisme prompt dan validasi sumber yang sudah ada bukan pengganti pengukuran pada aspek-aspek tersebut.

## 7. Batasan dan ancaman validitas

1. Dataset hanya mencakup 30 pertanyaan dari satu dokumen pengujian.
2. Hasil retrieval bergantung pada definisi `gold_pages` dan label relevansi dalam dataset.
3. Hit@K mengukur keberadaan hasil yang cocok menurut label evaluasi, bukan akurasi jawaban AI.
4. MRR mengukur posisi hasil relevan pertama, bukan kebenaran atau kelengkapan jawaban.
5. Hasil ini tidak membuktikan performa yang sama pada dokumen, panjang dokumen, atau jenis pertanyaan lainnya.
6. Kecocokan halaman pada pertanyaan unanswerable tidak membuktikan bahwa sistem seharusnya dapat menjawab pertanyaan tersebut.
7. Tidak ada hasil evaluasi langsung terhadap seluruh jawaban AI dan sitasinya yang dilaporkan di sini.

## 8. Kesimpulan

Baseline menunjukkan bahwa retrieval menemukan halaman acuan dalam lima hasil teratas pada 29 dari 30 pertanyaan menurut label dataset. Pada kelompok answerable, hasil Hit@5 mencapai 100% untuk 21 pertanyaan.

Hasil ini merupakan bukti awal performa retrieval pada dataset dan dokumen pengujian yang digunakan. Hasil tersebut tidak dapat digeneralisasi menjadi klaim bahwa jawaban AI memiliki akurasi 100%, bahwa seluruh sitasi benar, atau bahwa sistem selalu melakukan abstention secara tepat.

Pengujian unit yang tersedia mencakup validasi indeks sumber, penanganan respons tidak valid, dan perilaku abstention pada kondisi tertentu. Namun, kualitas jawaban AI, faithfulness, ketepatan sitasi, dan abstention end-to-end belum diukur secara langsung.

**Kesimpulan status:** baseline retrieval telah terdokumentasi. Evaluasi kualitas jawaban AI dan sitasi tetap menjadi pekerjaan yang belum tercakup. Laporan ini tidak menyatakan aspek tersebut telah lulus evaluasi.

## 9. Artefak terkait

- `backend/evaluation/baseline_questions.json`
- `backend/evaluation/evaluate_retrieval.py`
- `backend/evaluation/retrieval_results.csv`
- `backend/evaluation/retrieval_summary.json`
- `backend/tests/test_grounded_answer.py`
- `backend/tests/test_gemini_service.py`
