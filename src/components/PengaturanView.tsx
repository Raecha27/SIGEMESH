import React, { useState } from 'react';
import {
  Building,
  Save,
  Trash2,
  Activity,
  ShieldAlert,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  MapPin,
  PhoneCall,
  UserCheck
} from 'lucide-react';
import { z } from 'zod';
import { db } from '../utils/storage';
import { showDirectToast } from '../utils/exportUtils';
import { PengaturanSekolah, ActivityLog } from '../types';

// Zod validation schema for PengaturanSekolah
const schoolSettingsSchema = z.object({
  namaSekolah: z.string().trim().min(1, 'Nama Sekolah wajib diisi'),
  npsn: z.string().trim().min(1, 'NPSN wajib diisi'),
  nss: z.string().trim().optional(),
  alamat: z.string().trim().min(1, 'Alamat Lengkap wajib diisi'),
  desaKelurahan: z.string().trim().optional(),
  kecamatan: z.string().trim().optional(),
  kabupatenKota: z.string().trim().optional(),
  provinsi: z.string().trim().optional(),
  kodePos: z.string().trim().optional(),
  telepon: z.string().trim().min(1, 'Nomor Telepon wajib diisi'),
  email: z.string().trim().email('Format email instansi tidak valid'),
  website: z.string().trim().min(1, 'Website resmi wajib diisi'),
  logo: z.string().trim().min(1, 'Logo sekolah/URL logo wajib diisi'),
  headerSurat: z.string().trim().optional(),
  footerSurat: z.string().trim().optional(),
  mottoSekolah: z.string().trim().optional(),
  kepalaSekolah: z.string().trim().min(1, 'Nama Kepala Sekolah wajib diisi'),
  nipKepalaSekolah: z.string().trim().min(1, 'NIP Kepala Sekolah wajib diisi')
});

export default function PengaturanView() {
  const [settings, setSettings] = useState<PengaturanSekolah>(() => db.getSettings());
  const [auditLogs, setAuditLogs] = useState<ActivityLog[]>(() => db.getLogs());

  // Permissions check
  const canUpdate = db.hasPermission('setting.update');

  // Form Fields State
  const [namaSekolah, setNamaSekolah] = useState<string>(settings.namaSekolah || '');
  const [npsn, setNpsn] = useState<string>(settings.npsn || '');
  const [nss, setNss] = useState<string>(settings.nss || '');
  const [alamat, setAlamat] = useState<string>(settings.alamat || '');
  const [desaKelurahan, setDesaKelurahan] = useState<string>(settings.desaKelurahan || '');
  const [kecamatan, setKecamatan] = useState<string>(settings.kecamatan || '');
  const [kabupatenKota, setKabupatenKota] = useState<string>(settings.kabupatenKota || '');
  const [provinsi, setProvinsi] = useState<string>(settings.provinsi || '');
  const [kodePos, setKodePos] = useState<string>(settings.kodePos || '');
  const [telepon, setTelepon] = useState<string>(settings.telepon || '');
  const [email, setEmail] = useState<string>(settings.email || '');
  const [website, setWebsite] = useState<string>(settings.website || '');
  const [logo, setLogo] = useState<string>(settings.logo || '');
  const [headerSurat, setHeaderSurat] = useState<string>(settings.headerSurat || '');
  const [footerSurat, setFooterSurat] = useState<string>(settings.footerSurat || '');
  const [mottoSekolah, setMottoSekolah] = useState<string>(settings.mottoSekolah || '');
  const [kepalaSekolah, setKepalaSekolah] = useState<string>(settings.kepalaSekolah || '');
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState<string>(settings.nipKepalaSekolah || '');

  // UI States
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showClearLogsModal, setShowClearLogsModal] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Handle Logo Upload File Conversion
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showDirectToast('Berkas harus berupa gambar (PNG, JPG, WEBP, SVG)!', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showDirectToast('Ukuran berkas logo maksimal 5 MB!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogo(result);
      showDirectToast('Logo sekolah berhasil diunggah! Klik "Simpan Perubahan Profil" untuk menyimpan.', 'success');
    };
    reader.onerror = () => {
      showDirectToast('Gagal membaca berkas gambar logo.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!canUpdate) {
      showDirectToast('Anda tidak memiliki hak akses untuk mengubah Pengaturan Sekolah! (setting.update)', 'error');
      return;
    }

    const formData: PengaturanSekolah = {
      namaSekolah,
      npsn,
      nss,
      alamat,
      desaKelurahan,
      kecamatan,
      kabupatenKota,
      provinsi,
      kodePos,
      telepon,
      email,
      website,
      logo,
      headerSurat,
      footerSurat,
      mottoSekolah,
      kepalaSekolah,
      nipKepalaSekolah
    };

    // Zod Validation
    const validation = schoolSettingsSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach(issue => {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      });
      setFormErrors(errors);
      showDirectToast(validation.error.issues[0]?.message || 'Gagal menyimpan. Harap periksa input form!', 'error');
      return;
    }

    setIsSaving(true);

    try {
      // Upsert save settings
      db.setSettings(formData);
      setSettings(formData);

      // Log activity and update local audit state
      db.logActivity('Simpan Pengaturan', 'Memperbarui profil identitas sekolah utama');
      setAuditLogs(db.getLogs());

      showDirectToast('Identitas profil sekolah berhasil diperbarui dan tersimpan ke database!', 'success');
    } catch (err) {
      console.error('Save settings error:', err);
      showDirectToast('Terjadi kesalahan saat menyimpan pengaturan sekolah ke database.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearLogsConfirm = async () => {
    if (!canUpdate) {
      showDirectToast('Anda tidak memiliki hak akses untuk mengosongkan log aktivitas! (setting.update)', 'error');
      setShowClearLogsModal(false);
      return;
    }

    setIsClearing(true);
    try {
      // Clear logs permanently
      db.clearLogs();
      setAuditLogs([]);

      setShowClearLogsModal(false);
      showDirectToast('Seluruh histori log aktivitas keamanan berhasil dikosongkan. Jumlah log: 0', 'success');
    } catch (err) {
      console.error('Clear logs error:', err);
      showDirectToast('Gagal mengosongkan log aktivitas.', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Read-only warning if user lacks update permission */}
      {!canUpdate && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Mode Lihat Saja:</strong> Anda tidak memiliki izin <code>setting.update</code>. Pengaturan identitas sekolah dan pengosongan log hanya dapat diubah oleh administrator.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Settings Column */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Building className="h-4.5 w-4.5 text-emerald-500" />
              Identitas Profil Sekolah
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-semibold">
              Sistem Informasi Sekolah
            </span>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6 text-xs font-semibold text-slate-600">
            {/* Section 1: Logo Preview & Upload */}
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-emerald-600" />
                Logo Sekolah
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
                  {logo ? (
                    <img src={logo} alt="Logo Sekolah" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon className="h-8 w-8 mx-auto" />
                      <span className="text-[9px]">Tanpa Logo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center gap-2">
                    <label className={`flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm ${!canUpdate ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload className="h-3.5 w-3.5" />
                      Unggah Logo Baru
                      <input
                        type="file"
                        accept="image/*"
                        disabled={!canUpdate}
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Format gambar: PNG, JPG, WEBP, atau SVG. Maksimal 5MB. Gambar akan otomatis dikonversi dan disimpan.
                  </p>
                  <div>
                    <input
                      type="text"
                      disabled={!canUpdate}
                      value={logo}
                      onChange={(e) => setLogo(e.target.value)}
                      placeholder="Atau masukkan Link URL Logo Sekolah..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-slate-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Informasi Utama & Legalitas */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-500" /> Informasi Utama & Legalitas
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nama Sekolah */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-500">Nama Sekolah Utama <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={!canUpdate}
                    value={namaSekolah}
                    onChange={(e) => setNamaSekolah(e.target.value)}
                    className={`w-full px-3 py-2 text-sm bg-slate-50 border ${formErrors.namaSekolah ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-bold`}
                  />
                  {formErrors.namaSekolah && <p className="text-[10px] text-rose-500">{formErrors.namaSekolah}</p>}
                </div>

                {/* NPSN */}
                <div className="space-y-1">
                  <label className="text-slate-500">NPSN (Nomor Pokok Sekolah Nasional) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={!canUpdate}
                    value={npsn}
                    onChange={(e) => setNpsn(e.target.value)}
                    className={`w-full px-3 py-2 text-sm bg-slate-50 border ${formErrors.npsn ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono`}
                  />
                  {formErrors.npsn && <p className="text-[10px] text-rose-500">{formErrors.npsn}</p>}
                </div>

                {/* NSS */}
                <div className="space-y-1">
                  <label className="text-slate-500">NSS (Nomor Statistik Sekolah)</label>
                  <input
                    type="text"
                    disabled={!canUpdate}
                    value={nss}
                    onChange={(e) => setNss(e.target.value)}
                    placeholder="Contoh: 101016001001"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Alamat & Wilayah */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-amber-500" /> Alamat & Wilayah
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Alamat Lengkap */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-500">Alamat Jalan / Gedung <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={!canUpdate}
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    className={`w-full px-3 py-2 text-sm bg-slate-50 border ${formErrors.alamat ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800`}
                  />
                  {formErrors.alamat && <p className="text-[10px] text-rose-500">{formErrors.alamat}</p>}
                </div>

                {/* Desa / Kelurahan */}
                <div className="space-y-1">
                  <label className="text-slate-500">Desa / Kelurahan</label>
                  <input
                    type="text"
                    disabled={!canUpdate}
                    value={desaKelurahan}
                    onChange={(e) => setDesaKelurahan(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                  />
                </div>

                {/* Kecamatan */}
                <div className="space-y-1">
                  <label className="text-slate-500">Kecamatan</label>
                  <input
                    type="text"
                    disabled={!canUpdate}
                    value={kecamatan}
                    onChange={(e) => setKecamatan(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                  />
                </div>

                {/* Kabupaten / Kota */}
                <div className="space-y-1">
                  <label className="text-slate-500">Kabupaten / Kota</label>
                  <input
                    type="text"
                    disabled={!canUpdate}
                    value={kabupatenKota}
                    onChange={(e) => setKabupatenKota(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                  />
                </div>

                {/* Provinsi */}
                <div className="space-y-1">
                  <label className="text-slate-500">Provinsi</label>
                  <input
                    type="text"
                    disabled={!canUpdate}
                    value={provinsi}
                    onChange={(e) => setProvinsi(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                  />
                </div>

                {/* Kode Pos */}
                <div className="space-y-1">
                  <label className="text-slate-500">Kode Pos</label>
                  <input
                    type="text"
                    disabled={!canUpdate}
                    value={kodePos}
                    onChange={(e) => setKodePos(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Kontak & Media Komunikasi */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <PhoneCall className="h-3.5 w-3.5 text-emerald-500" /> Kontak & Media Komunikasi
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Telepon */}
                <div className="space-y-1">
                  <label className="text-slate-500">No Telepon / Fax <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={!canUpdate}
                    value={telepon}
                    onChange={(e) => setTelepon(e.target.value)}
                    className={`w-full px-3 py-2 text-sm bg-slate-50 border ${formErrors.telepon ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono`}
                  />
                  {formErrors.telepon && <p className="text-[10px] text-rose-500">{formErrors.telepon}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-slate-500">Email Instansi <span className="text-rose-500">*</span></label>
                  <input
                    type="email"
                    required
                    disabled={!canUpdate}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-3 py-2 text-sm bg-slate-50 border ${formErrors.email ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono`}
                  />
                  {formErrors.email && <p className="text-[10px] text-rose-500">{formErrors.email}</p>}
                </div>

                {/* Website */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-500">Website Resmi <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={!canUpdate}
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className={`w-full px-3 py-2 text-sm bg-slate-50 border ${formErrors.website ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono`}
                  />
                  {formErrors.website && <p className="text-[10px] text-rose-500">{formErrors.website}</p>}
                </div>
              </div>
            </div>

            {/* Section 5: Pejabat & Legalitas Tanda Tangan */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-indigo-500" /> Kepala Sekolah & Pengesahan
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Kepala Sekolah */}
                <div className="space-y-1">
                  <label className="text-slate-500">Nama Kepala Sekolah (Untuk TTD Lap.) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={!canUpdate}
                    value={kepalaSekolah}
                    onChange={(e) => setKepalaSekolah(e.target.value)}
                    className={`w-full px-3 py-2 text-sm bg-slate-50 border ${formErrors.kepalaSekolah ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-bold`}
                  />
                  {formErrors.kepalaSekolah && <p className="text-[10px] text-rose-500">{formErrors.kepalaSekolah}</p>}
                </div>

                {/* NIP Kepala Sekolah */}
                <div className="space-y-1">
                  <label className="text-slate-500">NIP Kepala Sekolah <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={!canUpdate}
                    value={nipKepalaSekolah}
                    onChange={(e) => setNipKepalaSekolah(e.target.value)}
                    className={`w-full px-3 py-2 text-sm bg-slate-50 border ${formErrors.nipKepalaSekolah ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono`}
                  />
                  {formErrors.nipKepalaSekolah && <p className="text-[10px] text-rose-500">{formErrors.nipKepalaSekolah}</p>}
                </div>
              </div>
            </div>

            {/* Section 6: Format Kertas / Header & Footer Laporan Surat */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-purple-500" /> Header Surat, Footer & Motto Sekolah
              </h4>
              <div className="space-y-3">
                {/* Motto Sekolah */}
                <div className="space-y-1">
                  <label className="text-slate-500">Motto / Visi Singkat Sekolah</label>
                  <input
                    type="text"
                    disabled={!canUpdate}
                    value={mottoSekolah}
                    onChange={(e) => setMottoSekolah(e.target.value)}
                    placeholder="Contoh: Cerdas, Berkarakter, dan Berdaya Saing Global"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 italic"
                  />
                </div>

                {/* Header Surat */}
                <div className="space-y-1">
                  <label className="text-slate-500">Kop / Header Surat Resmi (Tampil pada Hasil Cetak Laporan)</label>
                  <textarea
                    rows={3}
                    disabled={!canUpdate}
                    value={headerSurat}
                    onChange={(e) => setHeaderSurat(e.target.value)}
                    placeholder="Contoh: PEMERINTAH PROVINSI DKI JAKARTA &#10;DINAS PENDIDIKAN &#10;SMA NEGERI 1 JAKARTA"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono leading-relaxed"
                  />
                </div>

                {/* Footer Surat */}
                <div className="space-y-1">
                  <label className="text-slate-500">Footer / Catatan Bawah Surat</label>
                  <input
                    type="text"
                    disabled={!canUpdate}
                    value={footerSurat}
                    onChange={(e) => setFooterSurat(e.target.value)}
                    placeholder="Contoh: Jalan Budi Utomo No.7 Jakarta Pusat Telp. 021-3849123"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Save Action Button */}
            {canUpdate && (
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/10 cursor-pointer transition-all active:scale-[0.98]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan Perubahan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Simpan Perubahan Profil
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Audit Trails / Security Logs Column */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-rose-500" />
                Audit Logs Keamanan
              </h3>
              <span className="text-[10px] font-mono bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                {auditLogs.length} Entri
              </span>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                Melacak mutasi data, login, input nilai, presensi, dan aktivitas sistem.
              </p>
              {canUpdate && auditLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearLogsModal(true)}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Trash2 className="h-3 w-3" /> Kosongkan Logs
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => {
                  const isDelete = log.aktivitas.toLowerCase().includes('hapus') || log.aktivitas.toLowerCase().includes('clear');

                  return (
                    <div
                      key={log.id}
                      className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl text-[11px] space-y-1.5 leading-relaxed hover:border-slate-300 transition-colors"
                    >
                      <div className="flex justify-between items-center text-[9.5px] font-mono">
                        <span className="text-slate-400">{new Date(log.timestamp).toLocaleString('id-ID')}</span>
                        <span className={`px-1.5 py-0.5 rounded uppercase font-black text-[8.5px] ${
                          isDelete ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {log.aktivitas}
                        </span>
                      </div>
                      <p className="text-slate-800 font-medium">{log.detail}</p>
                      <div className="text-[9.5px] text-slate-400 font-mono">
                        User: <span className="text-slate-700 font-bold">{log.userName}</span> ({log.userRole})
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl space-y-2">
                  <Activity className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">
                    Belum ada histori log aktivitas.
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Histori log aktivitas keamanan saat ini berjumlah 0.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Dialog for Kosongkan Logs */}
      {showClearLogsModal && (
        <div className="fixed inset-0 z-[999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl flex-shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Kosongkan Seluruh Logs?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin menghapus seluruh log aktivitas keamanan sistem?
                </p>
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 mt-2 text-[11px] text-rose-800 font-medium">
                  Tindakan ini tidak dapat dibatalkan. Jumlah log akan langsung direset menjadi 0.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setShowClearLogsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleClearLogsConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-900/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Ya, Hapus Seluruh Logs
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
