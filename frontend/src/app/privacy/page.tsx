import Link from "next/link";

export const metadata = {
  title: "Kebijakan Privasi | DocuMind ID",
  description:
    "Kebijakan privasi DocuMind ID mengenai pengumpulan, penggunaan, penyimpanan, dan perlindungan data pengguna.",
};

export default function PrivacyPolicyPage() {
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
            Kebijakan Privasi
          </h1>
          <p className="mt-4 text-sm text-gray-400">
            Tanggal Berlaku: 31 Oktober 2026
          </p>
          <p className="mt-6 leading-7 text-gray-300">
            DocuMind ID menghargai privasi setiap pengguna. Kebijakan Privasi
            ini menjelaskan bagaimana kami mengumpulkan, menggunakan, memproses,
            menyimpan, dan melindungi informasi ketika Anda menggunakan aplikasi
            DocuMind ID.
          </p>
        </header>

        <div className="space-y-10 leading-7 text-gray-300">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              1. Informasi yang Kami Kumpulkan
            </h2>
            <p>
              Untuk menyediakan layanan, DocuMind ID dapat mengumpulkan beberapa
              jenis informasi berikut:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                Informasi akun, seperti nama, alamat email, dan informasi
                autentikasi.
              </li>
              <li>
                Dokumen PDF yang secara sukarela Anda unggah ke dalam aplikasi.
              </li>
              <li>
                Pertanyaan, prompt, dan riwayat interaksi yang Anda kirimkan
                melalui fitur percakapan AI.
              </li>
              <li>
                Informasi teknis yang diperlukan untuk menjalankan, memelihara,
                dan mengamankan aplikasi.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              2. Penggunaan Informasi
            </h2>
            <p>Informasi yang dikumpulkan digunakan untuk:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Membuat dan mengelola akun pengguna.</li>
              <li>Melakukan autentikasi dan mengelola sesi pengguna.</li>
              <li>Memproses dokumen PDF yang diunggah.</li>
              <li>
                Menghasilkan jawaban berdasarkan isi dokumen menggunakan
                kecerdasan buatan (AI) dan pendekatan Retrieval-Augmented
                Generation (RAG).
              </li>
              <li>
                Menampilkan referensi dokumen dan nomor halaman yang relevan
                dalam jawaban AI.
              </li>
              <li>Menjaga dan meningkatkan fungsionalitas aplikasi.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              3. Pemrosesan AI dan Layanan Pihak Ketiga
            </h2>
            <p>
              DocuMind ID menggunakan layanan pihak ketiga untuk mendukung
              operasional aplikasi, termasuk:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-white">Supabase:</strong> layanan
                autentikasi, basis data, dan penyimpanan dokumen.
              </li>
              <li>
                <strong className="text-white">Google Gemini:</strong>{" "}
                pemrosesan AI dan pembuatan jawaban berdasarkan konten dokumen.
              </li>
              <li>
                <strong className="text-white">Vercel:</strong> layanan hosting
                aplikasi frontend.
              </li>
              <li>
                <strong className="text-white">DockHosting:</strong> layanan
                hosting aplikasi backend.
              </li>
            </ul>
            <p className="mt-3">
              Sebagian konten dokumen dan teks yang relevan dapat diproses oleh
              layanan AI untuk menghasilkan jawaban atas pertanyaan Anda.
              Pemrosesan oleh layanan pihak ketiga juga tunduk pada kebijakan
              privasi dan ketentuan masing-masing penyedia layanan.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              4. Penyimpanan dan Keamanan Data
            </h2>
            <p>
              Informasi akun, catatan dokumen, dan data terkait aplikasi
              disimpan dan diproses menggunakan infrastruktur yang dikonfigurasi
              untuk DocuMind ID.
            </p>
            <p className="mt-3">
              Kami menerapkan langkah-langkah teknis dan organisasional yang
              wajar untuk membantu melindungi informasi dari akses, penggunaan,
              pengungkapan, perubahan, atau penghapusan tanpa izin.
            </p>
            <p className="mt-3">
              Namun, tidak ada sistem penyimpanan maupun transmisi data melalui
              internet yang dapat menjamin keamanan secara mutlak.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              5. Penyimpanan dan Penghapusan Data
            </h2>
            <p>
              Informasi dapat disimpan selama diperlukan untuk menyediakan
              layanan, memenuhi kebutuhan operasional, dan menjalankan kewajiban
              yang berlaku.
            </p>
            <p className="mt-3">
              Pengguna dapat mengajukan permintaan bantuan terkait akses,
              perubahan, atau penghapusan informasi akun dan dokumen yang
              diunggah dengan menghubungi kami melalui alamat email yang
              tercantum di bawah.
            </p>
            <p className="mt-3">
              Permintaan penghapusan akan ditangani dengan mempertimbangkan
              kemampuan teknis sistem dan kewajiban hukum yang berlaku.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              6. Hak Pengguna
            </h2>
            <p>
              Sesuai dengan ketentuan peraturan perundang-undangan yang berlaku,
              pengguna dapat mengajukan permintaan untuk:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Memperoleh informasi mengenai data pribadi yang diproses.</li>
              <li>Memperbaiki atau memperbarui informasi yang tidak akurat.</li>
              <li>
                Meminta penghapusan data pribadi sesuai ketentuan yang berlaku.
              </li>
              <li>
                Menarik persetujuan pemrosesan data apabila relevan dan
                diperbolehkan.
              </li>
            </ul>
            <p className="mt-3">
              Untuk mengajukan permintaan tersebut, silakan hubungi kami melalui
              email kontak.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              7. Privasi Anak
            </h2>
            <p>
              DocuMind ID tidak secara khusus dirancang untuk anak-anak. Kami
              tidak bermaksud mengumpulkan informasi pribadi anak tanpa
              persetujuan atau kewenangan yang sesuai berdasarkan ketentuan yang
              berlaku.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              8. Perubahan Kebijakan Privasi
            </h2>
            <p>
              Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu.
              Perubahan akan ditampilkan pada halaman ini disertai tanggal
              berlaku yang telah diperbarui.
            </p>
            <p className="mt-3">
              Pengguna disarankan untuk meninjau halaman ini secara berkala.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">
              9. Hubungi Kami
            </h2>
            <p>
              Apabila Anda memiliki pertanyaan, keluhan, atau permintaan terkait
              Kebijakan Privasi ini, silakan hubungi:
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
