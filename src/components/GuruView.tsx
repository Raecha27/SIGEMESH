import React, { useState } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle,
  XCircle,
  UserPlus,
  ShieldAlert,
  Save,
  X,
  Lock,
  Printer,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { db } from '../utils/storage';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { PrintHeader } from './print/PrintHeader';
import { PrintFooter } from './print/PrintFooter';
import { PrintButton } from './print/PrintButton';
import { Guru, Role } from '../types';

export default function GuruView() {
  const [search, setSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // DB state
  const [gurus, setGurus] = useState<Guru[]>(() => db.getGurus());
  const roles = db.getRoles();

  // Permission Gates
  const canCreate = db.hasPermission('guru.create');
  const canUpdate = db.hasPermission('guru.update');
  const canDelete = db.hasPermission('guru.delete');

  // Form Modals State
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [editingGuru, setEditingGuru] = useState<Guru | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<boolean>(false);
  const [resettingGuruId, setResettingGuruId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');

  // Delete confirm modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Form Fields
  const [nip, setNip] = useState<string>('');
  const [nama, setNama] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [hp, setHp] = useState<string>('');
  const [mapelUtama, setMapelUtama] = useState<string>('');
  const [roleId, setRoleId] = useState<string>('role-guru');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Search & Filter
  const filteredGurus = gurus.filter(guru => {
    const matchesSearch =
      guru.nama.toLowerCase().includes(search.toLowerCase()) ||
      guru.nip.includes(search) ||
      guru.email.toLowerCase().includes(search.toLowerCase()) ||
      guru.mapelUtama.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || guru.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openAddModal = () => {
    setEditingGuru(null);
    setNip('');
    setNama('');
    setEmail('');
    setHp('');
    setMapelUtama('');
    setRoleId('role-guru');
    setStatus('active');
    setShowAddEditModal(true);
  };

  const openEditModal = (guru: Guru) => {
    setEditingGuru(guru);
    setNip(guru.nip);
    setNama(guru.nama);
    setEmail(guru.email);
    setHp(guru.hp);
    setMapelUtama(guru.mapelUtama);
    setRoleId(guru.roleId);
    setStatus(guru.status);
    setShowAddEditModal(true);
  };

  const handleSaveGuru = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nip || !nama || !email || !hp) return;

    let updatedGurus: Guru[] = [];
    if (editingGuru) {
      // Edit
      updatedGurus = gurus.map(g =>
        g.id === editingGuru.id ? { ...g, nip, nama, email, hp, mapelUtama, roleId, status } : g
      );
      db.logActivity("Edit Guru", `Mengubah data guru ${nama} (NIP: ${nip})`);
    } else {
      // Add new
      const newGuru: Guru = {
        id: `g-${Date.now()}`,
        nip,
        nama,
        email,
        hp,
        mapelUtama,
        status,
        roleId,
        foto: `https://api.dicebear.com/7.x/adventurer/svg?seed=${nip}`
      };
      updatedGurus = [...gurus, newGuru];

      // Automatically create a simulated user profile for logins
      const currentProfiles = db.getProfiles();
      const newProfile = {
        id: newGuru.id,
        email: newGuru.email,
        name: newGuru.nama,
        nip: newGuru.nip,
        roleId: newGuru.roleId,
        avatar: newGuru.foto,
        status: newGuru.status
      };
      db.setProfiles([...currentProfiles, newProfile]);

      db.logActivity("Tambah Guru", `Menambahkan guru baru ${nama} (NIP: ${nip})`);
    }

    db.setGurus(updatedGurus);
    setGurus(updatedGurus);
    setShowAddEditModal(false);
  };

  const handleExportExcel = () => {
    const headers = ["NIP", "Nama Lengkap", "Email", "Nomor HP", "Mata Pelajaran Utama", "Hak Akses", "Status"];
    const keys = ["nip", "nama", "email", "hp", "mapelUtama", "roleName", "status"];
    
    const exportData = filteredGurus.map(g => {
      const rName = roles.find(r => r.id === g.roleId)?.name || 'Guru';
      return {
        ...g,
        roleName: rName,
        status: g.status === 'active' ? 'Aktif' : 'Nonaktif'
      };
    });

    exportToExcel(exportData, headers, keys, "Data_Guru");
    db.logActivity("Ekspor Guru Excel", "Melakukan ekspor data guru ke file Excel");
  };

  const handleExportPDF = () => {
    const headers = ["#", "NIP", "Nama Lengkap", "Email", "No. HP", "Mapel Utama", "Hak Akses", "Status"];
    const body = filteredGurus.map((g, idx) => {
      const rName = roles.find(r => r.id === g.roleId)?.name || 'Guru';
      return [
        idx + 1,
        g.nip,
        g.nama,
        g.email,
        g.hp,
        g.mapelUtama || '-',
        rName,
        g.status === 'active' ? 'Aktif' : 'Nonaktif'
      ];
    });

    const activeUser = db.getCurrentUser();
    exportToPDF("Daftar Tenaga Pendidik / Guru SMK Negeri 1 Jakarta", headers, body, "Data_Guru", {
      subtitle: `Tahun Ajaran: 2026/2027 | Semester: Ganjil`,
      guruNama: activeUser.name,
      guruNip: activeUser.nip || '........................'
    });
    db.logActivity("Ekspor Guru PDF", "Melakukan ekspor data guru ke file PDF");
  };


  const handleDeleteGuru = (id: string, namaGuru: string) => {
    setDeleteId(id);
    setDeleteName(namaGuru);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setIsDeleting(true);

    setTimeout(() => {
      // Check relations: Is this Guru a Wali Kelas?
      const kelasList = db.getKelas();
      const isWaliKelas = kelasList.some(k => k.waliKelasId === deleteId);

      // Is this Guru teaching any mapel?
      const mapelList = db.getMapels();
      const isTeaching = mapelList.some(m => m.guruId === deleteId);

      if (isWaliKelas || isTeaching) {
        showToast("Gagal menghapus: Guru ini masih aktif sebagai Wali Kelas atau Pengampu Mata Pelajaran!", "error");
        setIsDeleting(false);
        setDeleteId(null);
        setDeleteName('');
        return;
      }

      try {
        const updated = gurus.filter(g => g.id !== deleteId);
        db.setGurus(updated);
        setGurus(updated);

        // clean up profile too
        const currentProfiles = db.getProfiles();
        db.setProfiles(currentProfiles.filter(p => p.id !== deleteId));

        db.logActivity("Hapus Guru", `Menghapus data guru ${deleteName}`);
        showToast(`Berhasil menghapus guru ${deleteName}!`, "success");
      } catch (err) {
        showToast("Terjadi kesalahan saat menghapus data guru.", "error");
      } finally {
        setIsDeleting(false);
        setDeleteId(null);
        setDeleteName('');
      }
    }, 500); // 500ms simulated network delay
  };

  const handleToggleStatus = (guru: Guru) => {
    const newStatus = guru.status === 'active' ? 'inactive' : 'active';
    const updated = gurus.map(g => (g.id === guru.id ? { ...g, status: newStatus } : g));
    db.setGurus(updated);
    setGurus(updated);

    // sync profile status
    const currentProfiles = db.getProfiles();
    db.setProfiles(currentProfiles.map(p => (p.id === guru.id ? { ...p, status: newStatus } : p)));

    db.logActivity("Status Guru", `Mengubah status guru ${guru.nama} menjadi ${newStatus}`);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !resettingGuruId) return;

    // In storage simulation we don't have hashing, we log this as success
    const targetGuru = gurus.find(g => g.id === resettingGuruId);
    db.logActivity("Reset Password", `Mereset password akun guru ${targetGuru?.nama} (NIP: ${targetGuru?.nip})`);
    
    alert(`Sukses mereset kata sandi ${targetGuru?.nama}!`);
    setShowResetPasswordModal(false);
    setNewPassword('');
    setResettingGuruId(null);
  };

  return (
    <div className="space-y-6">
      {/* RBAC Warning banner if user is not Admin */}
      {!canCreate && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Mode Lihat-Saja (Read-Only):</strong> Akun Anda terdeteksi bukan sebagai Administrator. Anda dapat melihat data guru namun tidak diizinkan untuk menambah, mengubah, mereset password, atau menghapus data pendidik.
          </span>
        </div>
      )}

      {/* Filter and search controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NIP, nama, atau mapel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-700"
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-600 font-semibold"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Unduh Excel
          </button>

          {/* PDF Export */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-rose-500" />
            Unduh PDF
          </button>

          {/* Print */}
          <PrintButton
            elementId="guru-table-print"
            title="Data Tenaga Pendidik & Guru"
            permission="guru.print"
            activityLogDetail="Mencetak daftar data guru"
            variant="outline"
          />

          {/* Add Teacher Trigger */}
          {canCreate && (
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-900/10 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Tambah Guru Baru
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Data Card/List of Teachers */}
      <div id="guru-table-print" className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
        <PrintHeader
          title="DATA TENAGA PENDIDIK & GURU"
          subtitle="Daftar Guru Pengajar & Staf Pendidik Sekolah"
          metadata={[
            { label: 'Total Guru', value: `${filteredGurus.length} Pendidik` },
            { label: 'Status Filter', value: filterStatus === 'active' ? 'Aktif' : filterStatus === 'inactive' ? 'Nonaktif' : 'Semua Status' }
          ]}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-xs font-mono uppercase">
                <th className="py-3.5 px-6 font-bold">Pendidik</th>
                <th className="py-3.5 px-6 font-bold">NIP & HP</th>
                <th className="py-3.5 px-6 font-bold">Mata Pelajaran</th>
                <th className="py-3.5 px-6 font-bold">Peran Hak Akses</th>
                <th className="py-3.5 px-4 font-bold text-center">Status</th>
                {canUpdate && <th className="py-3.5 px-6 font-bold text-right no-print">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredGurus.length > 0 ? (
                filteredGurus.map((guru) => {
                  const roleName = roles.find(r => r.id === guru.roleId)?.name || 'Guru';
                  const isActive = guru.status === 'active';
                  return (
                    <tr key={guru.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Avatar & Name */}
                      <td className="py-4 px-6 flex items-center gap-3">
                        <img
                          src={guru.foto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${guru.nip}`}
                          alt={guru.nama}
                          className="w-10 h-10 rounded-full border border-slate-100 bg-slate-50"
                        />
                        <div>
                          <p className="font-bold text-slate-800">{guru.nama}</p>
                          <p className="text-xs text-slate-400">{guru.email}</p>
                        </div>
                      </td>

                      {/* NIP & Hp */}
                      <td className="py-4 px-6">
                        <p className="font-mono text-xs font-bold text-slate-700">{guru.nip}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{guru.hp}</p>
                      </td>

                      {/* Mapel Utama */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {guru.mapelUtama || 'Umum'}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {roleName}
                        </span>
                      </td>

                      {/* Status Check/Toggle */}
                      <td className="py-4 px-4 text-center">
                        {canUpdate ? (
                          <button
                            onClick={() => handleToggleStatus(guru)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Klik untuk mengubah status aktif"
                          >
                            {isActive ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                Aktif
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" />
                                Nonaktif
                              </>
                            )}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      {canUpdate && (
                        <td className="py-4 px-6 text-right no-print">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Reset Password Button */}
                            <button
                              onClick={() => {
                                setResettingGuruId(guru.id);
                                setShowResetPasswordModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Reset Password Akun"
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(guru)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ubah Data Guru"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            {/* Delete Button */}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteGuru(guru.id, guru.nama)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Guru"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada data guru yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PrintFooter showKepalaSekolah={true} />
      </div>

      {/* Add / Edit Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-400" />
                {editingGuru ? 'Ubah Informasi Guru' : 'Tambah Guru Baru'}
              </h3>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveGuru} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* NIP */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Nomor Induk Pegawai (NIP)</label>
                  <input
                    type="text"
                    required
                    maxLength={18}
                    placeholder="Contoh: 1983xxxxxxxx"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  />
                </div>

                {/* Name */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Drs. Bambang, M.Pd."
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  />
                </div>

                {/* Email */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Alamat Email Resmi</label>
                  <input
                    type="email"
                    required
                    placeholder="Contoh: guru@sman1jakarta.sch.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* No HP */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Nomor Handphone (WhatsApp)</label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 08123xxx"
                    value={hp}
                    onChange={(e) => setHp(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  />
                </div>

                {/* Mapel Utama */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Mata Pelajaran Utama</label>
                  <input
                    type="text"
                    placeholder="Contoh: Matematika"
                    value={mapelUtama}
                    onChange={(e) => setMapelUtama(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  />
                </div>

                {/* Assigned Role */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Peran Hak Akses (RBAC)</label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Status Akun</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  >
                    <option value="active">Aktif (Bisa Login)</option>
                    <option value="inactive">Nonaktif (Akses Dikunci)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-900/10 transition-colors cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  Simpan Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-400" />
                Reset Kata Sandi Akun
              </h3>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Masukkan Password Baru</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Konfirmasi Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-full">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Konfirmasi Hapus</h3>
                <p className="text-[11px] text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data guru <span className="font-bold text-slate-800">{deleteName}</span>?
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteId(null);
                  setDeleteName('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Ya, Hapus'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg animate-fade-in bg-white border-slate-200/80">
          <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          </div>
          <span className="text-xs font-bold text-slate-700">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
