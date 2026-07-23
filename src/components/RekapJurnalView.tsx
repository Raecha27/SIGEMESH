import React, { useState } from 'react';
import {
  ClipboardList,
  Download,
  Printer,
  School,
  BookOpen,
  Calendar,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileText,
  User,
  Clock,
  MessageSquare
} from 'lucide-react';
import { db } from '../utils/storage';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { PrintHeader } from './print/PrintHeader';
import { PrintFooter } from './print/PrintFooter';
import { PrintButton } from './print/PrintButton';
import { Jurnal, Kelas, MataPelajaran, Guru } from '../types';

export default function RekapJurnalView() {
  const [activeSubTab, setActiveSubTab] = useState<'guru' | 'kelas' | 'mapel' | 'periode'>('guru');

  // Filter States
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>('2025/2026');
  const [selectedSemester, setSelectedSemester] = useState<string>('Ganjil');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedMapelId, setSelectedMapelId] = useState<string>('');
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // DB States & Role Scoping
  const isWaliKelas = db.isWaliKelas();
  const homeroomClass = db.getHomeroomClass();

  const school = db.getSettings();
  const kelasList = db.getKelas();
  const mapelList = db.getMapels();
  const gurus = db.getGurus();
  const jurnals = db.getJurnals();

  // Initial Default values & enforce homeroom class for Wali Kelas
  React.useEffect(() => {
    if (isWaliKelas && homeroomClass) {
      setSelectedKelasId(homeroomClass.id);
    } else if (kelasList.length > 0 && !selectedKelasId) {
      setSelectedKelasId(kelasList[0].id);
    }
    if (mapelList.length > 0 && !selectedMapelId) {
      setSelectedMapelId(mapelList[0].id);
    }
    if (gurus.length > 0 && !selectedGuruId) {
      setSelectedGuruId(gurus[0].id);
    }
  }, [isWaliKelas, homeroomClass, kelasList, mapelList, gurus]);

  // Derived Filter Selections
  const activeClass = kelasList.find(k => k.id === selectedKelasId);
  const activeMapel = mapelList.find(m => m.id === selectedMapelId);
  const activeGuru = gurus.find(g => g.id === (selectedGuruId || activeMapel?.guruId));

  // Core filter logic
  const getFilteredJurnals = () => {
    return jurnals.filter(j => {
      // Filter by active tab primary dimension
      if (activeSubTab === 'guru' && selectedGuruId && j.diisiOleh !== selectedGuruId) return false;
      if (activeSubTab === 'kelas' && selectedKelasId && j.kelasId !== selectedKelasId) return false;
      if (activeSubTab === 'mapel' && selectedMapelId && j.mapelId !== selectedMapelId) return false;

      // Other secondary filters
      if (activeSubTab !== 'guru' && selectedGuruId && j.diisiOleh !== selectedGuruId) return false;
      if (activeSubTab !== 'kelas' && selectedKelasId && j.kelasId !== selectedKelasId) return false;
      if (activeSubTab !== 'mapel' && selectedMapelId && j.mapelId !== selectedMapelId) return false;

      // Period filters
      if (startDate && j.tanggal < startDate) return false;
      if (endDate && j.tanggal > endDate) return false;

      return true;
    });
  };

  const filteredJurnals = getFilteredJurnals();


  const handleExportExcel = () => {
    const headers = ["No", "Tanggal", "Hari / Jam", "Kelas", "Mata Pelajaran", "Guru Pengajar", "Materi Ajar", "Tujuan KBM", "Ringkasan Kehadiran", "Kendala", "Catatan"];
    const keys = ["no", "tanggal", "hariJam", "kelas", "mapel", "guru", "materi", "tujuan", "hadir", "kendala", "catatan"];
    
    const data = filteredJurnals.map((j, idx) => {
      const cls = kelasList.find(k => k.id === j.kelasId)?.nama || '';
      const mpl = mapelList.find(m => m.id === j.mapelId)?.nama || '';
      const gru = gurus.find(g => g.id === j.diisiOleh)?.nama || '';
      return {
        no: idx + 1,
        tanggal: j.tanggal,
        hariJam: `${j.hari} / ${j.jam}`,
        kelas: cls,
        mapel: mpl,
        guru: gru,
        materi: j.materi,
        tujuan: j.tujuanPembelajaran,
        hadir: j.kehadiranRingkasan,
        kendala: j.kendala || '-',
        catatan: j.catatan || '-'
      };
    });

    exportToExcel(data, headers, keys, `Rekap_Jurnal_Mengajar_${activeSubTab.toUpperCase()}`);
    db.logActivity("Ekspor Jurnal Excel", `Mengekspor rekap jurnal mengajar ke Excel`);
  };

  const handleExportPDF = () => {
    const headers = ["#", "Tanggal/Jam", "Kelas & Mapel", "Guru", "Materi & Kegiatan", "Kehadiran"];
    const body = filteredJurnals.map((j, idx) => {
      const cls = kelasList.find(k => k.id === j.kelasId)?.nama || '';
      const mpl = mapelList.find(m => m.id === j.mapelId)?.nama || '';
      const gru = gurus.find(g => g.id === j.diisiOleh)?.nama || '';
      return [
        idx + 1,
        `${j.tanggal}\n${j.hari} / ${j.jam}`,
        `Kelas: ${cls}\nMapel: ${mpl}`,
        gru,
        `Materi: ${j.materi}\nTujuan: ${j.tujuanPembelajaran}`,
        j.kehadiranRingkasan
      ];
    });

    const activeUser = db.getCurrentUser();
    exportToPDF(
      `Laporan Rekapitulasi Jurnal Mengajar - Per ${activeSubTab.toUpperCase()}`,
      headers,
      body,
      `Rekap_Jurnal_${activeSubTab.toUpperCase()}`,
      {
        subtitle: `Tahun Ajaran: 2026/2027 | Semester: Ganjil`,
        guruNama: activeUser.name,
        guruNip: activeUser.nip || '........................'
      }
    );
    db.logActivity("Ekspor Jurnal PDF", `Mengekspor rekap jurnal mengajar ke PDF`);
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs inside Rekap Jurnal */}
      <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex flex-wrap gap-1 w-fit no-print">
        <button
          onClick={() => setActiveSubTab('guru')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'guru'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          Rekap Jurnal Guru
        </button>
        <button
          onClick={() => setActiveSubTab('kelas')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'kelas'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <School className="h-3.5 w-3.5" />
          Rekap Jurnal Per Kelas
        </button>
        <button
          onClick={() => setActiveSubTab('mapel')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'mapel'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Rekap Jurnal Per Mapel
        </button>
        <button
          onClick={() => setActiveSubTab('periode')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'periode'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Rekap Jurnal Per Periode
        </button>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4 no-print">
        <div className="flex items-center gap-2 text-slate-700 font-extrabold text-xs uppercase tracking-wider">
          <Filter className="h-4 w-4 text-blue-500" />
          <span>Filter Jurnal KBM</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Tahun Ajaran</label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => setSelectedTahunAjaran(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
            >
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
            </select>
          </div>

          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Pendidik / Guru</label>
            <select
              value={selectedGuruId}
              onChange={(e) => setSelectedGuruId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
            >
              <option value="">-- Pilih Guru --</option>
              {gurus.map(g => (
                <option key={g.id} value={g.id}>{g.nama}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Kelas / Rombel</label>
            <select
              value={selectedKelasId}
              disabled={isWaliKelas}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className={`w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none ${
                isWaliKelas ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''
              }`}
            >
              {isWaliKelas ? (
                <option value={homeroomClass?.id}>{homeroomClass?.nama || 'Kelas Perwalian'}</option>
              ) : (
                <>
                  <option value="">-- Pilih Kelas --</option>
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-slate-100 pt-3">
          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Mata Pelajaran</label>
            <select
              value={selectedMapelId}
              onChange={(e) => setSelectedMapelId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
            >
              <option value="">-- Pilih Mapel --</option>
              {mapelList.map(m => (
                <option key={m.id} value={m.id}>{m.nama}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
            />
          </div>

          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Tanggal Selesai</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            Ekspor Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-rose-500" />
            Ekspor PDF
          </button>
          <PrintButton
            elementId="rekap-jurnal-print"
            title={`Rekap Jurnal Mengajar (${activeSubTab.toUpperCase()})`}
            permission="rekap.print"
            activityLogDetail={`Mencetak rekap jurnal mengajar sub-tab ${activeSubTab}`}
            variant="solid"
          />
        </div>
      </div>

      {/* CORE PRINTABLE SHEET CONTAINER */}
      <div id="rekap-jurnal-print" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 print:border-none print:p-0">
        {/* Printable Header Block */}
        <div className="flex items-center justify-between border-b-4 border-double border-slate-800 pb-4">
          <div className="text-left space-y-1">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{school.namaSekolah}</h2>
            <p className="text-[10px] text-slate-500 font-bold font-mono">{school.alamat}</p>
          </div>
          <img
            src={school.logo}
            alt="Logo Sekolah"
            className="w-14 h-14 rounded-xl border border-slate-200"
          />
        </div>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
            Rekap Jurnal Kegiatan Belajar Mengajar (KBM)
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-semibold">Tahun Ajaran {selectedTahunAjaran} • Semester {selectedSemester}</p>
        </div>

        {/* Informative Grid */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600">
          <div className="space-y-1.5">
            <p>Fokus Rekap: <span className="text-slate-800 font-black uppercase tracking-wider">{activeSubTab === 'guru' ? 'Per Pendidik (Guru)' : activeSubTab === 'kelas' ? 'Per Kelas / Rombel' : activeSubTab === 'mapel' ? 'Per Mata Pelajaran' : 'Per Periode Tanggal'}</span></p>
            {activeSubTab === 'kelas' && <p>Nama Kelas: <span className="text-slate-800 font-bold">{activeClass?.nama || '-'}</span></p>}
            {activeSubTab === 'mapel' && <p>Mata Pelajaran: <span className="text-slate-800 font-bold">{activeMapel?.nama || '-'}</span></p>}
            {activeSubTab === 'guru' && <p>Guru Pengampu: <span className="text-slate-800 font-bold">{activeGuru?.nama || '-'}</span></p>}
          </div>
          <div className="space-y-1.5 text-right font-mono text-[11px]">
            <p>Jumlah Jurnal Tercatat: <span className="text-slate-800 font-bold">{filteredJurnals.length} Catatan</span></p>
            <p>Rentang Waktu: <span className="text-slate-800">{startDate || 'Awal'} s/d {endDate || 'Akhir'}</span></p>
          </div>
        </div>

        {/* Core Jurnal Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-mono uppercase">
                <th className="py-2.5 px-4 font-bold">No</th>
                <th className="py-2.5 px-4 font-bold">Tanggal / Jam</th>
                {activeSubTab !== 'kelas' && <th className="py-2.5 px-4 font-bold">Kelas</th>}
                {activeSubTab !== 'mapel' && <th className="py-2.5 px-4 font-bold">Mata Pelajaran</th>}
                {activeSubTab !== 'guru' && <th className="py-2.5 px-4 font-bold">Guru Pengampu</th>}
                <th className="py-2.5 px-4 font-bold">Materi & Tujuan KBM</th>
                <th className="py-2.5 px-4 font-bold">Ringkasan Absensi</th>
                <th className="py-2.5 px-4 font-bold">Catatan / Hambatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {filteredJurnals.map((j, idx) => {
                const cls = kelasList.find(k => k.id === j.kelasId);
                const mpl = mapelList.find(m => m.id === j.mapelId);
                const gru = gurus.find(g => g.id === j.diisiOleh);

                return (
                  <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{j.tanggal}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{j.hari} • {j.jam}</p>
                    </td>
                    {activeSubTab !== 'kelas' && (
                      <td className="py-3 px-4 font-extrabold text-slate-700">{cls?.nama || '-'}</td>
                    )}
                    {activeSubTab !== 'mapel' && (
                      <td className="py-3 px-4 text-slate-700 font-medium">{mpl?.nama || '-'}</td>
                    )}
                    {activeSubTab !== 'guru' && (
                      <td className="py-3 px-4 text-slate-600 font-medium">{gru?.nama || '-'}</td>
                    )}
                    <td className="py-3 px-4 max-w-[200px] space-y-1">
                      <p className="text-slate-800 font-bold">Materi: <span className="font-normal text-slate-600">{j.materi}</span></p>
                      <p className="text-[10px] text-slate-400 font-normal italic leading-snug">Tujuan: {j.tujuanPembelajaran}</p>
                    </td>
                    <td className="py-3 px-4 text-[10px] font-mono text-slate-500 leading-snug">
                      {j.kehadiranRingkasan}
                    </td>
                    <td className="py-3 px-4 max-w-[150px] text-[10px] leading-relaxed font-normal text-slate-500">
                      {j.kendala && (
                        <p className="text-rose-600 font-semibold flex items-start gap-0.5">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          Hambatan: {j.kendala}
                        </p>
                      )}
                      {j.catatan && (
                        <p className="text-slate-500 flex items-start gap-0.5 mt-1">
                          <MessageSquare className="h-3 w-3 mt-0.5 text-slate-400 flex-shrink-0" />
                          Catatan: {j.catatan}
                        </p>
                      )}
                      {!j.kendala && !j.catatan && <span className="text-slate-300">-</span>}
                    </td>
                  </tr>
                );
              })}
              {filteredJurnals.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 italic font-normal">
                    Belum ada catatan jurnal KBM yang cocok dengan kriteria filter di atas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Standard Teacher Signature ONLY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12 text-xs font-bold text-center">
          <div></div>
          <div className="space-y-20 ml-auto w-64">
            <div className="space-y-1">
              <p className="text-slate-500 font-medium">Mengetahui,</p>
              <p className="text-slate-800 font-bold">Guru Mata Pelajaran</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-800 underline font-extrabold text-[13px]">{activeGuru?.nama || '_______________________'}</p>
              <p className="text-slate-400 font-mono text-[10px] font-normal">NIP : {activeGuru?.nip || '........................'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
