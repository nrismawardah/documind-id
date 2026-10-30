import Link from "next/link";

export const metadata = {
  title: "Syarat dan Ketentuan | DocuMind ID",
  description: "Syarat dan ketentuan penggunaan aplikasi DocuMind ID.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#09090f] px-5 py-12 text-gray-200 sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          ← Kembali ke DocuMind ID
        </Link>

        <header className="mb-12 mt-10">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-purple-400">
            Legal · DocuMind ID
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Syarat dan Ketentuan
          </h1>
          <p className="mt-4 text-sm text-gray-400">
            Tanggal Berlaku: 31 Oktober 2026
          </p>
          <p className="mt-6 leading-7 text-gray-300">
            Selamat datang di DocuMind ID. Dengan mengakses atau menggunakan
            aplikasi ini, Anda dianggap telah membaca, memahami, dan menyetujui
            Syarat dan Ketentuan berikut. Jika tidak menyetujuinya, mohon untuk
            tidak menggunakan layanan DocuMind ID.
          </p>
        </header>

        <div className="space-y-10 leading-7 text-gray-300">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              1. Tentang DocuMind ID
            </h2>
            <p>
              DocuMind ID merupakan aplikasi berbasis web yang memungkinkan
              pengguna mengunggah dokumen PDF, mengajukan pertanyaan, dan
              memperoleh jawaban berdasarkan isi dokumen dengan bantuan
              teknologi kecerdasan buatan (AI).
            </p>
            <p className="mt-3">
              Aplikasi menggunakan pendekatan Retrieval-Augmented Generation
              (RAG) untuk membantu menemukan informasi yang relevan serta
              menampilkan referensi dokumen dan nomor halaman sebagai sumber
              jawaban.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              2. Akun dan Registrasi Pengguna
            </h2>
            <p>
              Untuk menggunakan fitur tertentu, pengguna perlu membuat akun atau
              masuk melalui metode autentikasi yang tersedia.
            </p>
            <p className="mt-3">Pengguna bertanggung jawab untuk:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Memberikan informasi akun yang benar dan akurat.</li>
              <li>Menjaga kerahasiaan informasi autentikasi akun.</li>
              <li>Menggunakan akun secara bertanggung jawab.</li>
              <li>
                Memberitahukan kepada pengelola apabila mengetahui adanya
                penggunaan akun tanpa izin.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              3. Penggunaan dan Pengunggahan Dokumen
            </h2>
            <p>
              Pengguna dapat mengunggah dokumen PDF untuk diproses oleh sistem
              DocuMind ID.
            </p>
            <p className="mt-3">
              Pengguna menyatakan bahwa mereka memiliki hak atau izin yang
              diperlukan untuk mengunggah dan memproses dokumen tersebut.
            </p>
            <p className="mt-3">Pengguna dilarang mengunggah dokumen yang:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                Melanggar hak cipta atau hak kekayaan intelektual pihak lain.
              </li>
              <li>Mengandung materi ilegal atau melanggar hukum.</li>
              <li>
                Digunakan untuk mengancam, merugikan, atau melanggar hak pihak
                lain.
              </li>
              <li>
                Tidak memiliki hak atau kewenangan untuk dibagikan atau
                diproses.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              4. Penggunaan Teknologi AI
            </h2>
            <p>
              DocuMind ID menggunakan teknologi AI untuk membantu menganalisis
              isi dokumen dan menghasilkan jawaban berdasarkan informasi yang
              tersedia.
            </p>
            <p className="mt-3">Pengguna memahami bahwa:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                Jawaban AI dapat mengandung kesalahan, ketidakakuratan, atau
                informasi yang tidak lengkap.
              </li>
              <li>
                Referensi halaman digunakan untuk membantu pengguna memeriksa
                sumber informasi, tetapi tidak menjamin seluruh jawaban selalu
                benar.
              </li>
              <li>
                Hasil AI tidak menggantikan penilaian, verifikasi, atau
                keputusan profesional pengguna.
              </li>
              <li>
                Pengguna bertanggung jawab untuk memeriksa informasi penting
                sebelum menggunakannya.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              5. Penggunaan yang Dilarang
            </h2>
            <p>Dalam menggunakan DocuMind ID, pengguna dilarang:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                Menggunakan aplikasi untuk aktivitas yang melanggar hukum.
              </li>
              <li>
                Mencoba mengakses akun, dokumen, atau data pengguna lain tanpa
                izin.
              </li>
              <li>
                Mengganggu, merusak, atau mencoba mengeksploitasi sistem
                aplikasi.
              </li>
              <li>
                Menggunakan aplikasi untuk menyebarkan malware atau konten
                berbahaya.
              </li>
              <li>
                Melakukan tindakan yang dapat mengganggu ketersediaan atau
                keamanan layanan.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              6. Hak Kekayaan Intelektual
            </h2>
            <p>
              Nama, logo, desain antarmuka, dan komponen aplikasi DocuMind ID
              merupakan bagian dari identitas dan kekayaan intelektual
              pengelola, kecuali dinyatakan lain.
            </p>
            <p className="mt-3">
              Pengguna tetap bertanggung jawab atas hak kepemilikan dan izin
              penggunaan dokumen yang mereka unggah. Pengunggahan dokumen tidak
              otomatis memindahkan hak kepemilikan dokumen tersebut kepada
              DocuMind ID.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              7. Ketersediaan Layanan
            </h2>
            <p>
              Kami berupaya menjaga agar DocuMind ID dapat digunakan dengan
              baik. Namun, kami tidak menjamin layanan akan selalu tersedia
              tanpa gangguan.
            </p>
            <p className="mt-3">
              Layanan dapat mengalami pemeliharaan, pembaruan, gangguan teknis,
              atau perubahan fitur sewaktu-waktu.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              8. Pembatasan Tanggung Jawab
            </h2>
            <p>
              DocuMind ID disediakan sebagai alat bantu pencarian dan pemahaman
              informasi dari dokumen. Kami tidak menjamin bahwa seluruh hasil
              pemrosesan AI selalu akurat, lengkap, atau sesuai dengan kebutuhan
              khusus pengguna.
            </p>
            <p className="mt-3">
              Sepanjang diperbolehkan oleh hukum yang berlaku, pengelola tidak
              bertanggung jawab atas keputusan atau tindakan pengguna yang
              sepenuhnya didasarkan pada hasil AI tanpa melakukan pemeriksaan
              lebih lanjut.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              9. Penghentian Penggunaan
            </h2>
            <p>
              Pengelola dapat membatasi atau menghentikan akses pengguna apabila
              ditemukan pelanggaran terhadap Syarat dan Ketentuan ini atau
              terdapat tindakan yang mengancam keamanan dan operasional
              aplikasi.
            </p>
            <p className="mt-3">
              Pengguna juga dapat berhenti menggunakan layanan kapan saja.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              10. Perubahan Syarat dan Ketentuan
            </h2>
            <p>
              Kami dapat memperbarui Syarat dan Ketentuan ini dari waktu ke
              waktu. Perubahan akan dipublikasikan melalui halaman ini dengan
              tanggal berlaku terbaru.
            </p>
            <p className="mt-3">
              Dengan tetap menggunakan aplikasi setelah perubahan berlaku,
              pengguna dianggap telah memahami ketentuan yang diperbarui.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              11. Hukum yang Berlaku
            </h2>
            <p>
              Syarat dan Ketentuan ini ditafsirkan berdasarkan hukum yang
              berlaku di Republik Indonesia, sepanjang tidak bertentangan dengan
              ketentuan hukum yang bersifat wajib.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              12. Hubungi Kami
            </h2>
            <p>
              Apabila Anda memiliki pertanyaan mengenai Syarat dan Ketentuan
              ini, silakan hubungi:
            </p>
            <p className="mt-3">
              <strong className="text-white">DocuMind ID</strong>
              <br />
              Email:{" "}
              <a
                href="mailto:documind.id@gmail.com"
                className="text-purple-400 hover:underline"
              >
                documind.id@gmail.com
              </a>
            </p>
          </section>
        </div>

        <footer className="mt-16 border-t border-white/10 pt-6 text-sm text-gray-500">
          <p>© 2026 DocuMind ID. Hak cipta dilindungi.</p>
          <div className="mt-3 flex gap-5">
            <Link href="/privacy" className="hover:text-purple-400">
              Kebijakan Privasi
            </Link>
            <Link href="/terms" className="hover:text-purple-400">
              Syarat dan Ketentuan
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
