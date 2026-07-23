export type Permission =
  | 'dashboard.view'
  | 'guru.view' | 'guru.create' | 'guru.update' | 'guru.delete' | 'guru.print'
  | 'kelas.view' | 'kelas.create' | 'kelas.update' | 'kelas.delete' | 'kelas.print'
  | 'siswa.view' | 'siswa.create' | 'siswa.update' | 'siswa.delete' | 'siswa.print'
  | 'mapel.view' | 'mapel.create' | 'mapel.update' | 'mapel.delete' | 'mapel.print'
  | 'jadwal.view' | 'jadwal.create' | 'jadwal.update' | 'jadwal.delete' | 'jadwal.print'
  | 'materi.view' | 'materi.create' | 'materi.update' | 'materi.delete' | 'materi.print'
  | 'absensi.view' | 'absensi.input' | 'absensi.edit' | 'absensi.print'
  | 'jurnal.view' | 'jurnal.create' | 'jurnal.update' | 'jurnal.print'
  | 'nilai.view' | 'nilai.input' | 'nilai.edit' | 'nilai.print'
  | 'rekap.view' | 'rekap.print'
  | 'laporan.view' | 'laporan.export' | 'laporan.print'
  | 'setting.view' | 'setting.update' | 'setting.print';

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  description: string;
}

export interface UserRole {
  userId: string;
  roleId: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  nip?: string;
  roleId: string;
  avatar?: string;
  status: 'active' | 'inactive';
}

export interface Guru {
  id: string;
  nip: string;
  nama: string;
  email: string;
  hp: string;
  mapelUtama: string;
  foto?: string;
  status: 'active' | 'inactive';
  roleId: string;
}

export interface Kelas {
  id: string;
  nama: string;
  tingkat: 'X' | 'XI' | 'XII';
  jurusan: string;
  waliKelasId: string; // references Guru.id
  tahunAjaran: string;
}

export interface Siswa {
  id: string;
  nis: string;
  nisn: string;
  nama: string;
  jk: 'L' | 'P';
  tempatLahir: string;
  tanggalLahir: string;
  alamat: string;
  orangTua: string;
  hpOrangTua: string;
  kelasId: string; // references Kelas.id
  status: 'active' | 'mutated' | 'graduated';
  foto?: string;
}

export interface MataPelajaran {
  id: string;
  kode: string;
  nama: string;
  guruId: string; // references Guru.id
  kkm: number;
}

export interface Jadwal {
  id: string;
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  jamMulai: string; // e.g. "07:30"
  jamSelesai: string; // e.g. "09:00"
  mapelId: string; // references MataPelajaran.id
  kelasId: string; // references Kelas.id
  ruangan: string;
}

export type AbsensiStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpha' | 'Terlambat';

export interface Absensi {
  id: string;
  kelasId: string;
  jadwalId: string;
  tanggal: string; // YYYY-MM-DD
  dicatatOleh: string; // references Guru.id
}

export interface AbsensiDetail {
  id: string;
  absensiId: string;
  siswaId: string;
  status: AbsensiStatus;
  keterangan?: string;
}

export interface Materi {
  id: string;
  judul: string;
  deskripsi?: string;
  fileType: 'PDF' | 'DOCX' | 'PPTX' | 'Image' | 'Video';
  fileName: string;
  fileSize: string;
  fileUrl: string; // simulated
  kelasId: string;
  mapelId: string;
  semester: 1 | 2;
  bab: string;
  diunggahOleh: string; // references Guru.id
  tanggalUnggah: string;
}

export interface Jurnal {
  id: string;
  tanggal: string; // YYYY-MM-DD
  hari: string;
  jam: string; // e.g., "07:30 - 09:00"
  mapelId: string;
  kelasId: string;
  materi: string;
  tujuanPembelajaran: string;
  kehadiranRingkasan: string; // e.g., "Hadir: 28, Sakit: 1, Izin: 1, Alpha: 0"
  kendala?: string;
  catatan?: string;
  diisiOleh: string; // Guru.id
}

export type JenisNilai = 'Tugas' | 'Ulangan Harian' | 'PTS' | 'PAS' | 'Praktik' | 'Sikap';

export interface Nilai {
  id: string;
  siswaId: string;
  mapelId: string;
  jenis: JenisNilai;
  topik: string; // e.g., "Bab 1 Aljabar"
  skor: number; // 0 - 100
  tanggalInput: string;
  diinputOleh: string; // Guru.id
}

export interface PengaturanSekolah {
  namaSekolah: string;
  npsn: string;
  nss?: string;
  alamat: string;
  desaKelurahan?: string;
  kecamatan?: string;
  kabupatenKota?: string;
  provinsi?: string;
  kodePos?: string;
  telepon: string;
  email: string;
  website: string;
  logo: string;
  headerSurat?: string;
  footerSurat?: string;
  mottoSekolah?: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  aktivitas: string;
  detail: string;
  timestamp: string;
}
