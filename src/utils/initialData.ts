import {
  Role,
  Profile,
  Guru,
  Kelas,
  Siswa,
  MataPelajaran,
  Jadwal,
  Absensi,
  AbsensiDetail,
  Materi,
  Jurnal,
  Nilai,
  PengaturanSekolah,
  ActivityLog
} from '../types';

export const initialSchoolSettings: PengaturanSekolah = {
  namaSekolah: "SMA Negeri 1 Jakarta",
  npsn: "20100123",
  nss: "101016001001",
  alamat: "Jl. Budi Utomo No.7",
  desaKelurahan: "Pasar Baru",
  kecamatan: "Sawah Besar",
  kabupatenKota: "Kota Jakarta Pusat",
  provinsi: "DKI Jakarta",
  kodePos: "10710",
  telepon: "021-3849123",
  email: "info@sman1jakarta.sch.id",
  website: "www.sman1jakarta.sch.id",
  logo: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=128&h=128&fit=crop&q=80",
  headerSurat: "PEMERINTAH PROVINSI DKI JAKARTA\nDINAS PENDIDIKAN\nSMA NEGERI 1 JAKARTA",
  footerSurat: "Jalan Budi Utomo No.7 Jakarta Pusat Telp. 021-3849123 Fax. 021-3849124",
  mottoSekolah: "Cerdas, Berkarakter, Unggul, dan Berdaya Saing Global",
  kepalaSekolah: "Dr. H. Hermawan, M.Pd.",
  nipKepalaSekolah: "197208151998031002"
};

export const initialRoles: Role[] = [
  {
    id: "role-admin",
    name: "Admin Sekolah",
    description: "Memiliki akses penuh untuk mengelola guru, kelas, siswa, jadwal pelajaran, dan konfigurasi sistem.",
    permissions: [
      "dashboard.view",
      "guru.view", "guru.create", "guru.update", "guru.delete", "guru.print",
      "kelas.view", "kelas.create", "kelas.update", "kelas.delete", "kelas.print",
      "siswa.view", "siswa.create", "siswa.update", "siswa.delete", "siswa.print",
      "mapel.view", "mapel.create", "mapel.update", "mapel.delete", "mapel.print",
      "jadwal.view", "jadwal.create", "jadwal.update", "jadwal.delete", "jadwal.print",
      "materi.view", "materi.create", "materi.update", "materi.delete", "materi.print",
      "absensi.view", "absensi.input", "absensi.edit", "absensi.print",
      "jurnal.view", "jurnal.create", "jurnal.update", "jurnal.print",
      "nilai.view", "nilai.input", "nilai.edit", "nilai.print",
      "rekap.view", "rekap.print",
      "laporan.view", "laporan.export", "laporan.print",
      "setting.view", "setting.update", "setting.print"
    ]
  },
  {
    id: "role-guru",
    name: "Guru Pengajar",
    description: "Mengelola materi, menginput absensi kelas yang diajar, mengisi jurnal mengajar, dan memasukkan nilai siswa.",
    permissions: [
      "dashboard.view",
      "kelas.view", "kelas.print",
      "siswa.view", "siswa.print",
      "mapel.view", "mapel.print",
      "jadwal.view", "jadwal.print",
      "materi.view", "materi.create", "materi.update", "materi.delete", "materi.print",
      "absensi.view", "absensi.input", "absensi.edit", "absensi.print",
      "jurnal.view", "jurnal.create", "jurnal.update", "jurnal.print",
      "nilai.view", "nilai.input", "nilai.edit", "nilai.print",
      "rekap.view", "rekap.print",
      "laporan.view", "laporan.export", "laporan.print"
    ]
  },
  {
    id: "role-walikelas",
    name: "Wali Kelas",
    description: "Memiliki akses khusus untuk memantau data, presensi, jadwal, dan nilai siswa pada kelas perwaliannya (Read Only).",
    permissions: [
      "dashboard.view",
      "guru.view", "guru.print",
      "kelas.view", "kelas.print",
      "siswa.view", "siswa.print",
      "mapel.view", "mapel.print",
      "jadwal.view", "jadwal.print",
      "materi.view", "materi.print",
      "absensi.view", "absensi.print",
      "nilai.view", "nilai.print",
      "rekap.view", "rekap.print",
      "laporan.view", "laporan.export", "laporan.print"
    ]
  }
];

export const initialProfiles: Profile[] = [
  {
    id: "u-admin",
    email: "admin@sman1jakarta.sch.id",
    name: "Budi Santoso, S.Kom.",
    roleId: "role-admin",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=budi",
    status: "active"
  },
  {
    id: "g-bambang",
    email: "bambang@sman1jakarta.sch.id",
    name: "Drs. Bambang Wijaya",
    nip: "196805121992031005",
    roleId: "role-walikelas",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=bambang",
    status: "active"
  },
  {
    id: "g-siti",
    email: "siti.aminah@sman1jakarta.sch.id",
    name: "Siti Aminah, S.Pd.",
    nip: "198311022009042008",
    roleId: "role-guru",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=siti",
    status: "active"
  }
];

export const initialGurus: Guru[] = [
  {
    id: "g-bambang",
    nip: "196805121992031005",
    nama: "Drs. Bambang Wijaya",
    email: "bambang@sman1jakarta.sch.id",
    hp: "081234567890",
    mapelUtama: "Matematika",
    foto: "https://api.dicebear.com/7.x/adventurer/svg?seed=bambang",
    status: "active",
    roleId: "role-walikelas"
  },
  {
    id: "g-siti",
    nip: "198311022009042008",
    nama: "Siti Aminah, S.Pd.",
    email: "siti.aminah@sman1jakarta.sch.id",
    hp: "081398765432",
    mapelUtama: "Fisika",
    foto: "https://api.dicebear.com/7.x/adventurer/svg?seed=siti",
    status: "active",
    roleId: "role-guru"
  },
  {
    id: "g-ahmad",
    nip: "197804152005011003",
    nama: "Ahmad Subarjo, M.Pd.",
    email: "ahmad.subarjo@sman1jakarta.sch.id",
    hp: "085612345678",
    mapelUtama: "Bahasa Inggris",
    foto: "https://api.dicebear.com/7.x/adventurer/svg?seed=ahmad",
    status: "active",
    roleId: "role-walikelas"
  },
  {
    id: "g-dewi",
    nip: "199012242018022004",
    nama: "Dewi Lestari, S.Si.",
    email: "dewi.lestari@sman1jakarta.sch.id",
    hp: "087822334455",
    mapelUtama: "Kimia",
    foto: "https://api.dicebear.com/7.x/adventurer/svg?seed=dewi",
    status: "active",
    roleId: "role-guru"
  },
  {
    id: "g-hendra",
    nip: "198509182010121001",
    nama: "Hendra Wijaya, S.Pd.",
    email: "hendra.wijaya@sman1jakarta.sch.id",
    hp: "089911223344",
    mapelUtama: "Sejarah",
    foto: "https://api.dicebear.com/7.x/adventurer/svg?seed=hendra",
    status: "active",
    roleId: "role-guru"
  }
];

export const initialKelas: Kelas[] = [
  {
    id: "k-x-ipa1",
    nama: "Kelas X IPA 1",
    tingkat: "X",
    jurusan: "MIPA",
    waliKelasId: "g-ahmad",
    tahunAjaran: "2025/2026"
  },
  {
    id: "k-xi-ipa1",
    nama: "Kelas XI IPA 1",
    tingkat: "XI",
    jurusan: "MIPA",
    waliKelasId: "g-siti",
    tahunAjaran: "2025/2026"
  },
  {
    id: "k-xii-ipa1",
    nama: "Kelas XII IPA 1",
    tingkat: "XII",
    jurusan: "MIPA",
    waliKelasId: "g-bambang",
    tahunAjaran: "2025/2026"
  },
  {
    id: "k-xi-ips1",
    nama: "Kelas XI IPS 1",
    tingkat: "XI",
    jurusan: "IPS",
    waliKelasId: "g-hendra",
    tahunAjaran: "2025/2026"
  }
];

export const initialMataPelajarans: MataPelajaran[] = [
  { id: "m-mat", kode: "MAPEL-MAT", nama: "Matematika", guruId: "g-bambang", kkm: 75 },
  { id: "m-fis", kode: "MAPEL-FIS", nama: "Fisika", guruId: "g-siti", kkm: 75 },
  { id: "m-kim", kode: "MAPEL-KIM", nama: "Kimia", guruId: "g-dewi", kkm: 75 },
  { id: "m-ing", kode: "MAPEL-ING", nama: "Bahasa Inggris", guruId: "g-ahmad", kkm: 78 },
  { id: "m-sej", kode: "MAPEL-SEJ", nama: "Sejarah", guruId: "g-hendra", kkm: 72 }
];

export const initialSiswas: Siswa[] = [
  // Kelas XII IPA 1 (Wali: Bambang)
  {
    id: "s-1",
    nis: "241001",
    nisn: "0081234501",
    nama: "Aditya Pratama",
    jk: "L",
    tempatLahir: "Jakarta",
    tanggalLahir: "2008-03-12",
    alamat: "Jl. Kemang Pratama No. 12, Mampang, Jakarta Selatan",
    orangTua: "Hendra Pratama",
    hpOrangTua: "08123456701",
    kelasId: "k-xii-ipa1",
    status: "active"
  },
  {
    id: "s-2",
    nis: "241002",
    nisn: "0081234502",
    nama: "Amalia Putri",
    jk: "P",
    tempatLahir: "Bandung",
    tanggalLahir: "2008-07-22",
    alamat: "Jl. Tebet Barat Dalam IV No. 5, Jakarta Selatan",
    orangTua: "Ahmad Syah",
    hpOrangTua: "08123456702",
    kelasId: "k-xii-ipa1",
    status: "active"
  },
  {
    id: "s-3",
    nis: "241003",
    nisn: "0081234503",
    nama: "Bagas Saputra",
    jk: "L",
    tempatLahir: "Bogor",
    tanggalLahir: "2008-01-05",
    alamat: "Sunter Agung No. 22, Tanjung Priok, Jakarta Utara",
    orangTua: "Supardi Saputra",
    hpOrangTua: "08123456703",
    kelasId: "k-xii-ipa1",
    status: "active"
  },
  {
    id: "s-4",
    nis: "241004",
    nisn: "0081234504",
    nama: "Citra Lestari",
    jk: "P",
    tempatLahir: "Surabaya",
    tanggalLahir: "2008-11-30",
    alamat: "Jl. Percetakan Negara No. 8, Cempaka Putih, Jakarta Pusat",
    orangTua: "Agus Lestari",
    hpOrangTua: "08123456704",
    kelasId: "k-xii-ipa1",
    status: "active"
  },
  {
    id: "s-5",
    nis: "241005",
    nisn: "0081234505",
    nama: "Dimas Anggara",
    jk: "L",
    tempatLahir: "Jakarta",
    tanggalLahir: "2008-05-18",
    alamat: "Jl. Kramat Raya No. 101, Senen, Jakarta Pusat",
    orangTua: "Anggara Kusuma",
    hpOrangTua: "08123456705",
    kelasId: "k-xii-ipa1",
    status: "active"
  },
  
  // Kelas XI IPA 1 (Wali: Siti)
  {
    id: "s-6",
    nis: "251001",
    nisn: "0092234501",
    nama: "Farhan Ramadhan",
    jk: "L",
    tempatLahir: "Depok",
    tanggalLahir: "2009-09-15",
    alamat: "Kavling Beji Timur Raya No. 4, Depok",
    orangTua: "Rahman Hakim",
    hpOrangTua: "08131234506",
    kelasId: "k-xi-ipa1",
    status: "active"
  },
  {
    id: "s-7",
    nis: "251002",
    nisn: "0092234502",
    nama: "Gita Syafira",
    jk: "P",
    tempatLahir: "Tangerang",
    tanggalLahir: "2009-04-10",
    alamat: "Gading Serpong Sektor 3 No. 12, Tangerang",
    orangTua: "Syafira Adi",
    hpOrangTua: "08131234507",
    kelasId: "k-xi-ipa1",
    status: "active"
  },
  {
    id: "s-8",
    nis: "251003",
    nisn: "0092234503",
    nama: "Haris Maulana",
    jk: "L",
    tempatLahir: "Bekasi",
    tanggalLahir: "2009-12-01",
    alamat: "Taman Galaxi Blok B3 No. 9, Bekasi Selatan",
    orangTua: "Maulana Syarif",
    hpOrangTua: "08131234508",
    kelasId: "k-xi-ipa1",
    status: "active"
  },
  {
    id: "s-9",
    nis: "251004",
    nisn: "0092234504",
    nama: "Indah Permata",
    jk: "P",
    tempatLahir: "Jakarta",
    tanggalLahir: "2009-02-28",
    alamat: "Rawamangun Muka Barat No. 15, Pulo Gadung, Jakarta Timur",
    orangTua: "Permata Setiawan",
    hpOrangTua: "08131234509",
    kelasId: "k-xi-ipa1",
    status: "active"
  },

  // Kelas XI IPS 1 (Wali: Hendra)
  {
    id: "s-10",
    nis: "252001",
    nisn: "0092234551",
    nama: "Kevin Sanjaya",
    jk: "L",
    tempatLahir: "Cirebon",
    tanggalLahir: "2009-05-02",
    alamat: "Jl. Duren Sawit Baru No. 40, Jakarta Timur",
    orangTua: "Sanjaya Mulya",
    hpOrangTua: "08151234510",
    kelasId: "k-xi-ips1",
    status: "active"
  },
  {
    id: "s-11",
    nis: "252002",
    nisn: "0092234552",
    nama: "Laras Lestari",
    jk: "P",
    tempatLahir: "Yogyakarta",
    tanggalLahir: "2009-10-14",
    alamat: "Jl. Kayu Putih Raya No. 7, Pulo Gadung, Jakarta Timur",
    orangTua: "Lestari Prabowo",
    hpOrangTua: "08151234511",
    kelasId: "k-xi-ips1",
    status: "active"
  }
];

export const initialJadwals: Jadwal[] = [
  // Senin
  { id: "j-1", hari: "Senin", jamMulai: "07:30", jamSelesai: "09:00", mapelId: "m-mat", kelasId: "k-xii-ipa1", ruangan: "R. XII-A" },
  { id: "j-2", hari: "Senin", jamMulai: "09:15", jamSelesai: "10:45", mapelId: "m-fis", kelasId: "k-xi-ipa1", ruangan: "R. XI-A" },
  { id: "j-3", hari: "Senin", jamMulai: "11:00", jamSelesai: "12:30", mapelId: "m-sej", kelasId: "k-xi-ips1", ruangan: "R. XI-B" },
  
  // Selasa
  { id: "j-4", hari: "Selasa", jamMulai: "07:30", jamSelesai: "09:00", mapelId: "m-fis", kelasId: "k-xii-ipa1", ruangan: "R. XII-A" },
  { id: "j-5", hari: "Selasa", jamMulai: "09:15", jamSelesai: "10:45", mapelId: "m-kim", kelasId: "k-xi-ipa1", ruangan: "R. XI-A" },
  { id: "j-6", hari: "Selasa", jamMulai: "11:00", jamSelesai: "12:30", mapelId: "m-ing", kelasId: "k-x-ipa1", ruangan: "R. X-A" },

  // Rabu
  { id: "j-7", hari: "Rabu", jamMulai: "07:30", jamSelesai: "09:00", mapelId: "m-ing", kelasId: "k-xii-ipa1", ruangan: "R. XII-A" },
  { id: "j-8", hari: "Rabu", jamMulai: "09:15", jamSelesai: "10:45", mapelId: "m-mat", kelasId: "k-xi-ipa1", ruangan: "R. XI-A" },
  
  // Kamis
  { id: "j-9", hari: "Kamis", jamMulai: "07:30", jamSelesai: "09:00", mapelId: "m-kim", kelasId: "k-xii-ipa1", ruangan: "R. XII-A" },
  { id: "j-10", hari: "Kamis", jamMulai: "11:00", jamSelesai: "12:30", mapelId: "m-sej", kelasId: "k-xii-ipa1", ruangan: "R. XII-A" }
];

export const initialAbsensis: Absensi[] = [
  {
    id: "abs-1",
    kelasId: "k-xii-ipa1",
    jadwalId: "j-1",
    tanggal: "2026-07-20",
    dicatatOleh: "g-bambang"
  }
];

export const initialAbsensiDetails: AbsensiDetail[] = [
  { id: "absd-1", absensiId: "abs-1", siswaId: "s-1", status: "Hadir" },
  { id: "absd-2", absensiId: "abs-1", siswaId: "s-2", status: "Hadir" },
  { id: "absd-3", absensiId: "abs-1", siswaId: "s-3", status: "Sakit", keterangan: "Demam tinggi" },
  { id: "absd-4", absensiId: "abs-1", siswaId: "s-4", status: "Hadir" },
  { id: "absd-5", absensiId: "abs-1", siswaId: "s-5", status: "Izin", keterangan: "Acara pernikahan keluarga" }
];

export const initialMateris: Materi[] = [
  {
    id: "mat-1",
    judul: "Turunan Fungsi Aljabar dan Penerapannya",
    deskripsi: "Materi Matematika Kelas XII Semester 1 mengenai dasar-dasar turunan kalkulus dan analisis grafik fungsi.",
    fileType: "PDF",
    fileName: "Kalkulus_Fungsi_Aljabar_XII.pdf",
    fileSize: "2.4 MB",
    fileUrl: "#",
    kelasId: "k-xii-ipa1",
    mapelId: "m-mat",
    semester: 1,
    bab: "Bab 1",
    diunggahOleh: "g-bambang",
    tanggalUnggah: "2026-07-15"
  },
  {
    id: "mat-2",
    judul: "Gelombang Elektromagnetik dan Spektrum",
    deskripsi: "Slide presentasi Fisika tentang spektrum gelombang elektromagnetik dan penerapannya dalam teknologi.",
    fileType: "PPTX",
    fileName: "Gelombang_Elektromagnetik_Slide.pptx",
    fileSize: "5.1 MB",
    fileUrl: "#",
    kelasId: "k-xi-ipa1",
    mapelId: "m-fis",
    semester: 1,
    bab: "Bab 2",
    diunggahOleh: "g-siti",
    tanggalUnggah: "2026-07-18"
  }
];

export const initialJurnals: Jurnal[] = [
  {
    id: "jur-1",
    tanggal: "2026-07-20",
    hari: "Senin",
    jam: "07:30 - 09:00",
    mapelId: "m-mat",
    kelasId: "k-xii-ipa1",
    materi: "Pengantar Kalkulus dan Limit Fungsi",
    tujuanPembelajaran: "Siswa mampu memahami konsep limit fungsi secara intuitif dan memecahkan limit aljabar sederhana.",
    kehadiranRingkasan: "Hadir: 3, Sakit: 1, Izin: 1, Alpha: 0",
    kendala: "Siswa memerlukan waktu lebih untuk memahami metode pemfaktoran pada fungsi kuadrat.",
    catatan: "Perlu latihan tambahan di pertemuan berikutnya.",
    diisiOleh: "g-bambang"
  }
];

export const initialNilais: Nilai[] = [
  // Farhan Ramadhan (s-6) - Fisika (g-siti)
  { id: "n-farhan-1", siswaId: "s-6", mapelId: "m-fis", jenis: "Tugas", topik: "Bab 1 Pendahuluan", skor: 85, tanggalInput: "2026-07-08", diinputOleh: "g-siti" },
  { id: "n-farhan-2", siswaId: "s-6", mapelId: "m-fis", jenis: "Tugas", topik: "Meluncur Roket", skor: 90, tanggalInput: "2026-07-12", diinputOleh: "g-siti" },
  { id: "n-farhan-3", siswaId: "s-6", mapelId: "m-fis", jenis: "Ulangan Harian", topik: "Semangat Belajar", skor: 80, tanggalInput: "2026-07-18", diinputOleh: "g-siti" },

  // Aditya Pratama (s-1) - Matematika (g-bambang)
  { id: "n-1", siswaId: "s-1", mapelId: "m-mat", jenis: "Tugas", topik: "Bab 1 Pendahuluan", skor: 85, tanggalInput: "2026-07-10", diinputOleh: "g-bambang" },
  { id: "n-2", siswaId: "s-1", mapelId: "m-mat", jenis: "Ulangan Harian", topik: "Limit Aljabar", skor: 90, tanggalInput: "2026-07-15", diinputOleh: "g-bambang" },
  // Amalia Putri (s-2) - Matematika (g-bambang)
  { id: "n-3", siswaId: "s-2", mapelId: "m-mat", jenis: "Tugas", topik: "Bab 1 Pendahuluan", skor: 95, tanggalInput: "2026-07-10", diinputOleh: "g-bambang" },
  { id: "n-4", siswaId: "s-2", mapelId: "m-mat", jenis: "Ulangan Harian", topik: "Limit Aljabar", skor: 80, tanggalInput: "2026-07-15", diinputOleh: "g-bambang" },
  // Bagas Saputra (s-3) - Matematika (g-bambang)
  { id: "n-5", siswaId: "s-3", mapelId: "m-mat", jenis: "Tugas", topik: "Bab 1 Pendahuluan", skor: 70, tanggalInput: "2026-07-10", diinputOleh: "g-bambang" },
  { id: "n-6", siswaId: "s-3", mapelId: "m-mat", jenis: "Ulangan Harian", topik: "Limit Aljabar", skor: 75, tanggalInput: "2026-07-15", diinputOleh: "g-bambang" },

  // Aditya Pratama (s-1) - Fisika (g-siti)
  { id: "n-7", siswaId: "s-1", mapelId: "m-fis", jenis: "Tugas", topik: "Vektor & Gaya", skor: 82, tanggalInput: "2026-07-12", diinputOleh: "g-siti" },
  { id: "n-8", siswaId: "s-1", mapelId: "m-fis", jenis: "Ulangan Harian", topik: "Gerak Melingkar", skor: 88, tanggalInput: "2026-07-16", diinputOleh: "g-siti" }
];

export const initialLogs: ActivityLog[] = [
  {
    id: "log-1",
    userId: "u-admin",
    userName: "Budi Santoso, S.Kom.",
    userRole: "Admin Sekolah",
    aktivitas: "Login",
    detail: "Melakukan masuk log ke dalam sistem dashboard",
    timestamp: "2026-07-21T07:15:00-07:00"
  },
  {
    id: "log-2",
    userId: "g-bambang",
    userName: "Drs. Bambang Wijaya",
    userRole: "Wali Kelas XII IPA 1",
    aktivitas: "Tambah Nilai",
    detail: "Menginput nilai tugas matematika materi Limit Fungsi",
    timestamp: "2026-07-21T07:22:30-07:00"
  }
];
