import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Users,
  GraduationCap,
  BookOpen,
  School,
  Calendar,
  Award,
  TrendingUp,
  TrendingDown,
  Info,
  ChevronRight,
  Filter,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import { db } from '../utils/storage';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { PrintHeader } from './print/PrintHeader';
import { PrintFooter } from './print/PrintFooter';
import { PrintButton } from './print/PrintButton';
import { Siswa, Kelas, MataPelajaran, Nilai, Guru } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function RekapNilaiView() {
  const [activeSubTab, setActiveSubTab] = useState<'kelas' | 'mapel' | 'siswa'>('kelas');

  // Filter States
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>('2025/2026');
  const [selectedSemester, setSelectedSemester] = useState<string>('Ganjil');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedMapelId, setSelectedMapelId] = useState<string>('');
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // DB States & Role Scoping
  const isGuru = db.isGuru();
  const isWaliKelas = db.isWaliKelas();
  const homeroomClass = db.getHomeroomClass();
  const teacherClasses = db.getTeacherClasses();
  const teacherMapels = db.getTeacherMapels();
  const currentTeacher = db.getTeacherProfile();
  const teacherMapelIds = new Set(teacherMapels.map(m => m.id));

  const school = db.getSettings();
  const kelasList = db.getKelas();
  const mapelList = db.getMapels();
  const gurus = db.getGurus();
  const students = db.getSiswas().filter(s => s.status === 'active');
  const allNilais = db.getNilais();

  const availableKelasList = isGuru
    ? teacherClasses
    : isWaliKelas && homeroomClass
    ? [homeroomClass]
    : kelasList;

  const availableMapelList = isGuru
    ? teacherMapels
    : mapelList;

  // Handle defaults & enforce homeroom class and teacher profile for Wali Kelas / Role Guru
  React.useEffect(() => {
    if (isGuru && currentTeacher) {
      setSelectedGuruId(currentTeacher.id);
    }
  }, [isGuru, currentTeacher]);

  React.useEffect(() => {
    if (isWaliKelas && homeroomClass) {
      setSelectedKelasId(homeroomClass.id);
    } else if (isGuru && teacherClasses.length > 0) {
      if (!teacherClasses.some(k => k.id === selectedKelasId)) {
        setSelectedKelasId(teacherClasses[0].id);
      }
    } else if (kelasList.length > 0 && !selectedKelasId) {
      setSelectedKelasId(kelasList[0].id);
    }
  }, [isGuru, isWaliKelas, homeroomClass, teacherClasses, kelasList]);

  React.useEffect(() => {
    if (isGuru && teacherMapels.length > 0) {
      if (!teacherMapels.some(m => m.id === selectedMapelId)) {
        setSelectedMapelId(teacherMapels[0].id);
      }
    } else if (mapelList.length > 0 && !selectedMapelId) {
      setSelectedMapelId(mapelList[0].id);
    }
  }, [isGuru, teacherMapels, mapelList]);

  React.useEffect(() => {
    if (selectedKelasId) {
      const activeClass = kelasList.find(k => k.id === selectedKelasId);
      if (activeClass) {
        const classMapels = mapelList;
        if (classMapels.length > 0 && !selectedMapelId) {
          setSelectedMapelId(classMapels[0].id);
        }
      }
    }
  }, [selectedKelasId, mapelList]);

  React.useEffect(() => {
    if (selectedKelasId) {
      const classStudents = students.filter(s => s.kelasId === selectedKelasId);
      if (classStudents.length > 0 && !selectedSiswaId) {
        setSelectedSiswaId(classStudents[0].id);
      }
    }
  }, [selectedKelasId, students]);

  // Derived filter selections
  const activeClass = kelasList.find(k => k.id === selectedKelasId);
  const activeMapel = mapelList.find(m => m.id === selectedMapelId);
  const activeGuru = gurus.find(g => g.id === (isGuru && currentTeacher ? currentTeacher.id : selectedGuruId || activeMapel?.guruId)) || currentTeacher;
  const activeSiswa = students.find(s => s.id === selectedSiswaId);
  const classStudents = students.filter(s => s.kelasId === selectedKelasId);

  // Sorting helper by: 1. Jenis Penilaian, 2. Tanggal Input, 3. Topik/Bab
  const jenisPriority: Record<string, number> = {
    'Tugas': 1,
    'Ulangan Harian': 2,
    'UH': 2,
    'Praktik': 3,
    'PTS': 4,
    'PAS': 5,
    'Sikap': 6
  };

  const sortNilais = (nilais: Nilai[]) => {
    return [...nilais].sort((a, b) => {
      const priorityA = jenisPriority[a.jenis] || 99;
      const priorityB = jenisPriority[b.jenis] || 99;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      if (a.tanggalInput !== b.tanggalInput) {
        return a.tanggalInput.localeCompare(b.tanggalInput);
      }
      return (a.topik || '').localeCompare(b.topik || '');
    });
  };

  // Evaluasi generator per item
  const generateItemEvaluation = (jenis: string, topik: string, score: number) => {
    if (score >= 90) {
      if (jenis === 'Tugas') return "Sangat baik dalam memahami materi dan mampu menerapkan konsep dengan tepat.";
      if (jenis === 'Ulangan Harian' || jenis === 'UH') return "Sangat menguasai konsep materi dengan hasil evaluasi yang amat memuaskan.";
      return "Sangat menguasai materi dengan hasil yang sangat memuaskan.";
    } else if (score >= 85) {
      if (jenis === 'Tugas') return "Memahami konsep dasar dengan baik. Perlu meningkatkan konsistensi dalam menyelesaikan latihan.";
      return "Penguasaan materi sudah baik, tingkatkan kecermatan dan konsistensi.";
    } else if (score >= 80) {
      if (jenis === 'Ulangan Harian' || jenis === 'UH') return "Penguasaan materi sudah baik, namun masih perlu meningkatkan ketelitian dalam menjawab soal.";
      return "Penguasaan materi sudah baik, pertahankan semangat dan ketelitian belajar.";
    } else if (score >= 75) {
      return "Penguasaan materi cukup memadai untuk memenuhi batas KKM. Perbanyak latihan mandiri.";
    } else {
      return "Hasil belajar masih di bawah KKM. Memerlukan bimbingan ekstra dan remedi terstruktur.";
    }
  };

  // Filter nilais by selected parameters
  const getFilteredNilais = () => {
    return allNilais.filter(n => {
      if (n.skor === null || n.skor === undefined || isNaN(Number(n.skor))) return false;
      if (selectedMapelId && n.mapelId !== selectedMapelId) return false;

      const student = students.find(s => s.id === n.siswaId);
      if (!student || student.kelasId !== selectedKelasId) return false;

      if (startDate && n.tanggalInput < startDate) return false;
      if (endDate && n.tanggalInput > endDate) return false;

      if (isGuru && currentTeacher) {
        if (n.diinputOleh !== currentTeacher.id && !teacherMapelIds.has(n.mapelId)) return false;
      } else if (selectedGuruId && n.diinputOleh !== selectedGuruId) {
        return false;
      }

      return true;
    });
  };

  // Retrieve non-null student scores for detailed student view
  const getStudentDetailedNilais = (siswaId: string, mapelId?: string) => {
    const sNilais = allNilais.filter(n => {
      if (n.siswaId !== siswaId) return false;
      if (mapelId && n.mapelId !== mapelId) return false;

      if (startDate && n.tanggalInput < startDate) return false;
      if (endDate && n.tanggalInput > endDate) return false;

      if (isGuru && currentTeacher) {
        if (n.diinputOleh !== currentTeacher.id && !teacherMapelIds.has(n.mapelId)) return false;
      } else if (selectedGuruId && n.diinputOleh !== selectedGuruId) {
        return false;
      }

      // Filter out NULL / empty / non-entered scores
      if (n.skor === null || n.skor === undefined || isNaN(Number(n.skor))) return false;

      return true;
    });

    return sortNilais(sNilais);
  };

  // Evaluasi generator helper
  const generateEvaluation = (type: string, score: number) => {
    if (!score) return "Belum ada evaluasi nilai.";
    if (type === 'Ulangan Harian' || type === 'UH') {
      if (score >= 90) return "Sangat memahami materi dengan luar biasa, menunjukkan ketekunan belajar tinggi.";
      if (score >= 80) return "Mampu memahami materi dengan baik, namun masih perlu meningkatkan ketelitian dalam mengerjakan soal.";
      if (score >= 70) return "Cukup memahami materi dasar, perlu memperbanyak latihan soal untuk meningkatkan pemahaman.";
      return "Memerlukan bimbingan intensif dan remedial untuk memahami materi pokok.";
    }
    if (type === 'Tugas') {
      if (score >= 90) return "Sangat baik dalam penyelesaian tugas mandiri dengan kualitas sangat memuaskan.";
      if (score >= 80) return "Tugas dikerjakan dengan baik dan rapi, pemahaman konsep tugas sudah cukup mantap.";
      if (score >= 70) return "Tugas diselesaikan dengan cukup baik, namun perlu lebih teliti membaca instruksi.";
      return "Kualitas pengerjaan tugas masih rendah, perlu pendampingan belajar khusus.";
    }
    if (type === 'Praktik') {
      if (score >= 90) return "Sangat baik dalam penerapan praktik dan menunjukkan penguasaan keterampilan yang sangat memuaskan.";
      if (score >= 80) return "Sangat baik dalam praktik serta mampu menerapkan materi secara mandiri.";
      if (score >= 70) return "Keterampilan praktik sudah cukup baik, namun perlu lebih fokus pada langkah prosedur.";
      return "Membutuhkan latihan praktik mandiri tambahan untuk meningkatkan keterampilan psikomotorik.";
    }
    if (type === 'PTS') {
      if (score >= 90) return "Menunjukkan tingkat penguasaan konsep yang prima pada materi tengah semester.";
      if (score >= 80) return "Hasil ujian tengah semester memuaskan, pertahankan motivasi belajar.";
      if (score >= 70) return "Perlu meningkatkan pemahaman konsep melalui latihan yang lebih rutin.";
      return "Hasil evaluasi tengah semester belum optimal, memerlukan remedial materi dasar.";
    }
    if (type === 'PAS') {
      if (score >= 90) return "Menunjukkan penguasaan materi yang sangat baik dan konsisten.";
      if (score >= 80) return "Pencapaian akhir semester memuaskan, pertahankan fokus di semester mendatang.";
      if (score >= 70) return "Hasil akhir semester cukup, disarankan untuk lebih fokus saat review materi.";
      return "Hasil akhir semester masih di bawah KKM, perlu pembimbingan intensif.";
    }
    return "Evaluasi pencapaian sudah memadai.";
  };

  // Kesimpulan generator helper
  const generateConclusion = (average: number) => {
    if (!average) return "Data nilai siswa belum memadai untuk ditarik kesimpulan evaluasi belajar.";
    if (average >= 85) {
      return "Secara keseluruhan siswa menunjukkan perkembangan belajar yang luar biasa. Pemahaman konsep teori dan praktik sudah sangat matang serta mampu belajar secara mandiri dengan hasil yang sangat memuaskan.";
    }
    if (average >= 75) {
      return "Secara keseluruhan siswa menunjukkan perkembangan belajar yang baik. Kemampuan praktik sudah sangat baik, sedangkan pemahaman teori masih perlu ditingkatkan melalui latihan dan pendampingan.";
    }
    return "Secara keseluruhan siswa menunjukkan perkembangan belajar yang cukup, namun masih membutuhkan perhatian khusus. Diperlukan intervensi remedial terstruktur dan pendampingan ekstra untuk mengejar ketertinggalan materi.";
  };

  // Aggregate student score matrix for selected mapel
  const getStudentGradesSummary = (siswaId: string) => {
    const sNilais = allNilais.filter(n => n.siswaId === siswaId && n.mapelId === selectedMapelId);
    
    const filterByDateRange = (list: Nilai[]) => {
      return list.filter(n => {
        if (startDate && n.tanggalInput < startDate) return false;
        if (endDate && n.tanggalInput > endDate) return false;
        return true;
      });
    };

    const uhGrades = filterByDateRange(sNilais.filter(n => n.jenis === 'Ulangan Harian'));
    const tugasGrades = filterByDateRange(sNilais.filter(n => n.jenis === 'Tugas'));
    const praktikGrades = filterByDateRange(sNilais.filter(n => n.jenis === 'Praktik'));
    const ptsGrades = filterByDateRange(sNilais.filter(n => n.jenis === 'PTS'));
    const pasGrades = filterByDateRange(sNilais.filter(n => n.jenis === 'PAS'));

    const uh = uhGrades.length > 0 ? Math.round(uhGrades.reduce((sum, n) => sum + n.skor, 0) / uhGrades.length) : 0;
    const tugas = tugasGrades.length > 0 ? Math.round(tugasGrades.reduce((sum, n) => sum + n.skor, 0) / tugasGrades.length) : 0;
    const praktik = praktikGrades.length > 0 ? Math.round(praktikGrades.reduce((sum, n) => sum + n.skor, 0) / praktikGrades.length) : 0;
    const pts = ptsGrades.length > 0 ? Math.round(ptsGrades.reduce((sum, n) => sum + n.skor, 0) / ptsGrades.length) : 0;
    const pas = pasGrades.length > 0 ? Math.round(pasGrades.reduce((sum, n) => sum + n.skor, 0) / pasGrades.length) : 0;

    // Calculate final grade
    const components = [uh, tugas, praktik, pts, pas].filter(v => v > 0);
    const finalScore = components.length > 0 ? Math.round(components.reduce((sum, v) => sum + v, 0) / components.length) : 0;

    return { uh, tugas, praktik, pts, pas, finalScore };
  };

  // Compile Class Statistics
  const getClassStats = () => {
    const summaries = classStudents.map(s => getStudentGradesSummary(s.id));
    const activeFinalScores = summaries.map(sum => sum.finalScore).filter(f => f > 0);
    
    if (activeFinalScores.length === 0) {
      return { average: 0, highest: 0, lowest: 0, tuntasCount: 0, tuntasPercentage: 0, totalGraded: 0, distribution: [] };
    }

    const sumAll = activeFinalScores.reduce((acc, score) => acc + score, 0);
    const average = Math.round(sumAll / activeFinalScores.length);
    const highest = Math.max(...activeFinalScores);
    const lowest = Math.min(...activeFinalScores);

    const kkmVal = activeMapel?.kkm || 75;
    const tuntasCount = activeFinalScores.filter(s => s >= kkmVal).length;
    const tuntasPercentage = Math.round((tuntasCount / activeFinalScores.length) * 100);

    // Distribution
    const ranges = {
      '< 70': 0,
      '70-79': 0,
      '80-89': 0,
      '90-100': 0
    };

    activeFinalScores.forEach(score => {
      if (score < 70) ranges['< 70']++;
      else if (score < 80) ranges['70-79']++;
      else if (score < 90) ranges['80-89']++;
      else ranges['90-100']++;
    });

    const distribution = Object.keys(ranges).map(key => ({
      name: key,
      'Jumlah Siswa': ranges[key as keyof typeof ranges]
    }));

    return {
      average,
      highest,
      lowest,
      tuntasCount,
      tuntasPercentage,
      totalGraded: activeFinalScores.length,
      distribution
    };
  };

  const getStudentGradesSummaryForMapel = (siswaId: string, mapelId: string) => {
    const sNilais = allNilais.filter(n => n.siswaId === siswaId && n.mapelId === mapelId);
    const filterByDateRange = (list: Nilai[]) => list.filter(n => {
      if (startDate && n.tanggalInput < startDate) return false;
      if (endDate && n.tanggalInput > endDate) return false;
      return true;
    });

    const uhGrades = filterByDateRange(sNilais.filter(n => n.jenis === 'Ulangan Harian'));
    const tugasGrades = filterByDateRange(sNilais.filter(n => n.jenis === 'Tugas'));
    const praktikGrades = filterByDateRange(sNilais.filter(n => n.jenis === 'Praktik'));
    const ptsGrades = filterByDateRange(sNilais.filter(n => n.jenis === 'PTS'));
    const pasGrades = filterByDateRange(sNilais.filter(n => n.jenis === 'PAS'));

    const uh = uhGrades.length > 0 ? Math.round(uhGrades.reduce((sum, n) => sum + n.skor, 0) / uhGrades.length) : 0;
    const tugas = tugasGrades.length > 0 ? Math.round(tugasGrades.reduce((sum, n) => sum + n.skor, 0) / tugasGrades.length) : 0;
    const praktik = praktikGrades.length > 0 ? Math.round(praktikGrades.reduce((sum, n) => sum + n.skor, 0) / praktikGrades.length) : 0;
    const pts = ptsGrades.length > 0 ? Math.round(ptsGrades.reduce((sum, n) => sum + n.skor, 0) / ptsGrades.length) : 0;
    const pas = pasGrades.length > 0 ? Math.round(pasGrades.reduce((sum, n) => sum + n.skor, 0) / pasGrades.length) : 0;

    const components = [uh, tugas, praktik, pts, pas].filter(v => v > 0);
    const finalScore = components.length > 0 ? Math.round(components.reduce((sum, v) => sum + v, 0) / components.length) : 0;

    return { uh, tugas, praktik, pts, pas, finalScore };
  };

  const getMapelStats = (mapelId: string) => {
    const mapelObj = mapelList.find(m => m.id === mapelId);
    const summaries = classStudents.map(s => getStudentGradesSummaryForMapel(s.id, mapelId));
    const activeScores = summaries.map(sum => sum.finalScore).filter(f => f > 0);

    if (activeScores.length === 0) {
      return { average: 0, hi: 0, lo: 0, pass: 0, totalGraded: 0 };
    }

    const average = Math.round(activeScores.reduce((sum, v) => sum + v, 0) / activeScores.length);
    const hi = Math.max(...activeScores);
    const lo = Math.min(...activeScores);
    const kkmVal = mapelObj?.kkm || 75;
    const passCount = activeScores.filter(s => s >= kkmVal).length;
    const pass = Math.round((passCount / activeScores.length) * 100);

    return { average, hi, lo, pass, totalGraded: activeScores.length };
  };

  const classStats = getClassStats();


  const handleExportExcel = () => {
    if (activeSubTab === 'kelas') {
      if (!selectedKelasId || !selectedMapelId) return;
      const headers = ["No", "NIS", "Nama Siswa", "UH", "Tugas", "Praktik", "PTS", "PAS", "Nilai Akhir", "Status Kelulusan"];
      const keys = ["no", "nis", "nama", "uh", "tugas", "praktik", "pts", "pas", "finalScore", "status"];
      const data = classStudents.map((s, idx) => {
        const summary = getStudentGradesSummary(s.id);
        return {
          no: idx + 1,
          nis: s.nis,
          nama: s.nama,
          uh: summary.uh || '-',
          tugas: summary.tugas || '-',
          praktik: summary.praktik || '-',
          pts: summary.pts || '-',
          pas: summary.pas || '-',
          finalScore: summary.finalScore || '-',
          status: generateConclusion(summary.finalScore)
        };
      });
      exportToExcel(data, headers, keys, `Rekap_Nilai_Kelas_${activeClass?.nama || 'Kelas'}`);
    } else if (activeSubTab === 'mapel') {
      if (!selectedKelasId) return;
      const headers = ["No", "Mata Pelajaran", "Guru Pengampu", "Siswa Dinilai", "Nilai Rata-Rata", "Tertinggi", "Terendah", "Persentase Ketuntasan"];
      const keys = ["no", "mapel", "guru", "graded", "avg", "hi", "lo", "pass"];
      const data = mapelList.map((m, idx) => {
        const stats = getMapelStats(m.id);
        const g = db.getGurus().find(guru => guru.id === m.guruId);
        return {
          no: idx + 1,
          mapel: m.nama,
          guru: g ? g.nama : '-',
          graded: stats.totalGraded,
          avg: stats.average,
          hi: stats.hi || '-',
          lo: stats.lo || '-',
          pass: `${stats.pass}%`
        };
      });
      exportToExcel(data, headers, keys, `Rekap_Nilai_Mapel_Kelas_${activeClass?.nama || 'Kelas'}`);
    } else if (activeSubTab === 'siswa') {
      if (!selectedSiswaId || !activeSiswa) return;
      const studentNilais = getStudentDetailedNilais(activeSiswa.id, selectedMapelId);
      const headers = ["No", "Jenis Penilaian", "Topik / Bab", "Skor Nilai", "Evaluasi Guru"];
      const keys = ["no", "jenis", "topik", "skor", "evaluasi"];
      const data = studentNilais.map((n, idx) => ({
        no: idx + 1,
        jenis: n.jenis,
        topik: n.topik || '-',
        skor: n.skor,
        evaluasi: generateItemEvaluation(n.jenis, n.topik || '', n.skor)
      }));
      exportToExcel(data, headers, keys, `Rekap_Detail_Nilai_${activeSiswa.nama.replace(/\s+/g, '_')}`);
    }
    db.logActivity("Ekspor Rekap Nilai Excel", `Melakukan ekspor rekap nilai sub-tab ${activeSubTab} ke Excel`);
  };

  const handleExportPDF = () => {
    const activeUser = db.getCurrentUser();
    if (activeSubTab === 'kelas') {
      if (!selectedKelasId || !selectedMapelId) return;
      const headers = ["#", "NIS", "Nama Siswa", "UH", "TGS", "PRK", "PTS", "PAS", "Rapor", "Status"];
      const body = classStudents.map((s, idx) => {
        const summary = getStudentGradesSummary(s.id);
        return [
          idx + 1,
          s.nis,
          s.nama,
          summary.uh || '-',
          summary.tugas || '-',
          summary.praktik || '-',
          summary.pts || '-',
          summary.pas || '-',
          summary.finalScore || '-',
          summary.finalScore >= (activeMapel?.kkm || 75) ? 'TUNTAS' : 'REMEDIAL'
        ];
      });
      exportToPDF(
        `Laporan Rekapitulasi Nilai Kelas - ${activeClass?.nama || ''}`,
        headers,
        body,
        `Rekap_Nilai_Kelas_${activeClass?.nama || ''}`,
        {
          subtitle: `Mata Pelajaran: ${activeMapel?.nama || ''} (KKM: ${activeMapel?.kkm || 75}) | Rentang Waktu KBM`,
          guruNama: activeUser.name,
          guruNip: activeUser.nip || '........................'
        }
      );
    } else if (activeSubTab === 'mapel') {
      if (!selectedKelasId) return;
      const headers = ["#", "Mata Pelajaran", "Guru Pengampu", "Rata-Rata", "Tertinggi", "Terendah", "Kelulusan %"];
      const body = mapelList.map((m, idx) => {
        const stats = getMapelStats(m.id);
        const g = db.getGurus().find(guru => guru.id === m.guruId);
        return [
          idx + 1,
          m.nama,
          g ? g.nama : '-',
          stats.average,
          stats.hi || '-',
          stats.lo || '-',
          `${stats.pass}%`
        ];
      });
      exportToPDF(
        `Laporan Capaian Belajar Per Mata Pelajaran - Kelas ${activeClass?.nama || ''}`,
        headers,
        body,
        `Rekap_Nilai_Mapel_Kelas_${activeClass?.nama || ''}`,
        {
          subtitle: `Rangkuman Seluruh Bidang Studi Kurikulum Merdeka`,
          guruNama: activeUser.name,
          guruNip: activeUser.nip || '........................'
        }
      );
    } else if (activeSubTab === 'siswa') {
      if (!selectedSiswaId || !activeSiswa) return;
      const studentNilais = getStudentDetailedNilais(activeSiswa.id, selectedMapelId);
      const headers = ["#", "Jenis Penilaian", "Topik / Bab", "Skor Nilai", "Evaluasi Guru"];
      const body = studentNilais.map((n, idx) => [
        idx + 1,
        n.jenis,
        n.topik || '-',
        n.skor,
        generateItemEvaluation(n.jenis, n.topik || '', n.skor)
      ]);
      exportToPDF(
        `Laporan Pencapaian Kompetensi Belajar Siswa (Detail)`,
        headers,
        body,
        `Rekap_Detail_Nilai_${activeSiswa.nama.replace(/\s+/g, '_')}`,
        {
          subtitle: `Nama: ${activeSiswa.nama} (NIS: ${activeSiswa.nis}) | Kelas: ${activeClass?.nama || ''} | Mapel: ${activeMapel?.nama || ''}`,
          guruNama: activeGuru?.nama || currentTeacher?.nama || activeUser.name,
          guruNip: activeGuru?.nip || currentTeacher?.nip || activeUser.nip || '........................'
        }
      );
    }
    db.logActivity("Ekspor Rekap Nilai PDF", `Melakukan ekspor rekap nilai sub-tab ${activeSubTab} ke PDF`);
  };

  return (
    <div className="space-y-6">
      {/* Upper Navigation Tabs */}
      <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex flex-wrap gap-1 w-fit no-print">
        <button
          onClick={() => setActiveSubTab('kelas')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'kelas'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <School className="h-3.5 w-3.5" />
          Rekap Per Kelas
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
          Rekap Per Mapel
        </button>
        <button
          onClick={() => setActiveSubTab('siswa')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'siswa'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Detail Per Siswa
        </button>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4 no-print">
        <div className="flex items-center gap-2 text-slate-700 font-extrabold text-xs uppercase tracking-wider">
          <Filter className="h-4 w-4 text-blue-500" />
          <span>Filter Laporan</span>
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
            <label>Kelas / Rombel</label>
            <select
              value={selectedKelasId}
              disabled={isWaliKelas && availableKelasList.length === 1}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className={`w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none ${
                isWaliKelas && availableKelasList.length === 1 ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''
              }`}
            >
              <option value="">-- Pilih Kelas --</option>
              {availableKelasList.map(k => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Mata Pelajaran</label>
            <select
              value={selectedMapelId}
              onChange={(e) => setSelectedMapelId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
            >
              <option value="">-- Pilih Mapel --</option>
              {availableMapelList.map(m => (
                <option key={m.id} value={m.id}>{m.nama} (KKM: {m.kkm})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-slate-100 pt-3">
          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label className="flex items-center justify-between">
              <span>Guru Pengampu</span>
              {isGuru && <span className="text-[10px] text-amber-600 font-extrabold">(Terkunci / Auto)</span>}
            </label>
            <select
              value={isGuru && currentTeacher ? currentTeacher.id : selectedGuruId}
              disabled={isGuru}
              onChange={(e) => setSelectedGuruId(e.target.value)}
              className={`w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none ${
                isGuru ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'
              }`}
            >
              {isGuru && currentTeacher ? (
                <option value={currentTeacher.id}>{currentTeacher.nama} (Guru Login)</option>
              ) : (
                <>
                  <option value="">-- Semua Guru / Sesuai Mapel --</option>
                  {gurus.map(g => (
                    <option key={g.id} value={g.id}>{g.nama}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          {activeSubTab === 'siswa' && (
            <div className="space-y-1 text-xs font-bold text-slate-500">
              <label>Siswa</label>
              <select
                value={selectedSiswaId}
                onChange={(e) => setSelectedSiswaId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none animate-fade-in"
              >
                <option value="">-- Pilih Siswa --</option>
                {classStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>
          )}

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
            elementId={activeSubTab === 'kelas' ? 'rekap-nilai-kelas-print' : activeSubTab === 'mapel' ? 'rekap-nilai-mapel-print' : 'rekap-nilai-siswa-print'}
            title={`Rekap Nilai (${activeSubTab === 'kelas' ? 'Per Kelas' : activeSubTab === 'mapel' ? 'Per Mapel' : 'Per Siswa'})`}
            permission="rekap.print"
            activityLogDetail={`Mencetak rekap nilai sub-tab ${activeSubTab}`}
            variant="solid"
          />
        </div>
      </div>

      {/* RENDER SUB-TAB 1: REKAP NILAI KELAS */}
      {activeSubTab === 'kelas' && (
        <div className="space-y-6">
          {/* Statistical Highlights */}
          {classStats.totalGraded > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 no-print">
              <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Rata-rata Kelas</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-0.5">{classStats.average}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Nilai Tertinggi</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-0.5">{classStats.highest}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs flex items-center gap-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Nilai Terendah</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-0.5">{classStats.lowest}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs flex items-center gap-3 col-span-1 md:col-span-2">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Ketuntasan (KKM: {activeMapel?.kkm || 75})</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm font-extrabold text-slate-800">{classStats.tuntasCount} / {classStats.totalGraded} Siswa</p>
                    <span className="text-xs font-black text-indigo-600">{classStats.tuntasPercentage}% Tuntas</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${classStats.tuntasPercentage}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Graphical Analytics Section */}
          {classStats.totalGraded > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
              {/* Score Distribution Chart */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Distribusi Nilai Akhir Siswa
                </h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classStats.distribution}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontStyle="bold" />
                      <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="Jumlah Siswa" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pass percentage chart */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Rasio Kelulusan Terhadap KKM
                </h4>
                <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6">
                  <div className="h-40 w-40 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Tuntas', value: classStats.tuntasCount },
                            { name: 'Remedial', value: classStats.totalGraded - classStats.tuntasCount }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 font-semibold text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span>Tuntas KKM: {classStats.tuntasCount} Siswa ({classStats.tuntasPercentage}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span>Remedial: {classStats.totalGraded - classStats.tuntasCount} Siswa ({100 - classStats.tuntasPercentage}%)</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] leading-relaxed">
                      Siswa dinyatakan tuntas jika Nilai Akhir &ge; {activeMapel?.kkm || 75}.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REPORT SHEET PREVIEW */}
          <div id="rekap-nilai-kelas-print" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 print:border-none print:p-0">
            {/* Logo and Header Block */}
            <div className="flex items-center justify-between border-b-4 border-double border-slate-800 pb-4">
              <div className="text-left space-y-1">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{school.namaSekolah}</h2>
                <p className="text-[10px] text-slate-500 font-bold font-mono leading-relaxed">{school.alamat}</p>
                <p className="text-[10px] text-slate-400 font-mono">Telp: {school.telepon} • Web: {school.website} • Email: {school.email}</p>
              </div>
              <img
                src={school.logo}
                alt="Logo Sekolah"
                className="w-14 h-14 rounded-xl border border-slate-200 shadow-xs"
              />
            </div>

            {/* Title */}
            <div className="text-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Laporan Rekapitulasi Nilai Akhir Hasil Belajar</h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Tahun Ajaran {selectedTahunAjaran} • Semester {selectedSemester}</p>
            </div>

            {/* Subheader Information */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600">
              <div className="space-y-1.5">
                <p>Mata Pelajaran: <span className="text-slate-800 font-bold">{activeMapel?.nama || '-'}</span></p>
                <p>Kelas / Rombel: <span className="text-slate-800 font-bold">{activeClass?.nama || '-'}</span></p>
                <p>KKM Standar: <span className="text-slate-800 font-mono font-bold">{activeMapel?.kkm || '-'}</span></p>
              </div>
              <div className="space-y-1.5 text-right font-mono text-[11px]">
                <p>Guru Pengampu: {activeGuru?.nama || '-'}</p>
                <p>NIP: {activeGuru?.nip || '-'}</p>
                <p>Dicetak Tanggal: {new Date().toLocaleDateString('id-ID')}</p>
              </div>
            </div>

            {/* Core Grades Matrix Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-mono uppercase">
                    <th className="py-3 px-4 font-bold">No</th>
                    <th className="py-3 px-4 font-bold">NIS</th>
                    <th className="py-3 px-4 font-bold">Nama Lengkap Siswa</th>
                    <th className="py-3 px-4 font-bold text-center">UH</th>
                    <th className="py-3 px-4 font-bold text-center">Tugas</th>
                    <th className="py-3 px-4 font-bold text-center">Praktik</th>
                    <th className="py-3 px-4 font-bold text-center">PTS</th>
                    <th className="py-3 px-4 font-bold text-center">PAS</th>
                    <th className="py-3 px-4 font-bold text-center">Nilai Akhir</th>
                    <th className="py-3 px-4 font-bold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {classStudents.map((siswa, idx) => {
                    const grades = getStudentGradesSummary(siswa.id);
                    const isPass = grades.finalScore >= (activeMapel?.kkm || 75);

                    return (
                      <tr key={siswa.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">{siswa.nis}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">{siswa.nama}</td>
                        <td className="py-2.5 px-4 text-center font-mono">{grades.uh || '-'}</td>
                        <td className="py-2.5 px-4 text-center font-mono">{grades.tugas || '-'}</td>
                        <td className="py-2.5 px-4 text-center font-mono">{grades.praktik || '-'}</td>
                        <td className="py-2.5 px-4 text-center font-mono">{grades.pts || '-'}</td>
                        <td className="py-2.5 px-4 text-center font-mono">{grades.pas || '-'}</td>
                        <td className="py-2.5 px-4 text-center font-mono font-extrabold text-sm text-slate-800 bg-slate-50/50">{grades.finalScore || '-'}</td>
                        <td className="py-2.5 px-4 text-center">
                          {grades.finalScore > 0 ? (
                            isPass ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 text-[10px]">TUNTAS</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-100 text-[10px]">REMEDIAL</span>
                            )
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {classStudents.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400 italic font-normal">
                        Tidak ada siswa terdaftar di dalam kelas ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Standard Signature Block ONLY containing the Subject Teacher */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12 text-xs font-bold text-center">
              <div></div> {/* Empty left column for alignment */}
              <div className="space-y-20 ml-auto w-64">
                <div className="space-y-1">
                  <p className="text-slate-500 font-medium font-sans">Mengetahui,</p>
                  <p className="text-slate-800 font-bold font-sans">Guru Mata Pelajaran</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-800 underline font-extrabold text-[13px]">{activeGuru?.nama || '_______________________'}</p>
                  <p className="text-slate-400 font-mono text-[10px] font-normal">NIP : {activeGuru?.nip || '........................'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER SUB-TAB 2: REKAP NILAI MAPEL */}
      {activeSubTab === 'mapel' && (
        <div className="space-y-6">
          <div id="rekap-nilai-mapel-print" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 print:border-none print:p-0">
            {/* Header */}
            <div className="flex items-center justify-between border-b-4 border-double border-slate-800 pb-4">
              <div className="text-left space-y-1">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{school.namaSekolah}</h2>
                <p className="text-[10px] text-slate-500 font-bold font-mono leading-relaxed">{school.alamat}</p>
              </div>
              <img
                src={school.logo}
                alt="Logo Sekolah"
                className="w-14 h-14 rounded-xl border border-slate-200 shadow-xs"
              />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Ringkasan Laporan Hasil Evaluasi Mata Pelajaran</h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Tahun Ajaran {selectedTahunAjaran} • Semester {selectedSemester}</p>
            </div>

            {/* Info panel */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600 flex justify-between items-center">
              <div>
                <p>Mata Pelajaran: <span className="text-slate-800 font-black">{activeMapel?.nama || '-'}</span></p>
                <p className="mt-1">Kurikulum KKM Standar: <span className="text-slate-800 font-mono font-black">{activeMapel?.kkm || '-'}</span></p>
              </div>
              <div className="text-right">
                <p>Pendidik Utama: <span className="text-slate-800 font-bold">{activeGuru?.nama || '-'}</span></p>
                <p className="mt-1">NIP: <span className="text-slate-500 font-mono font-medium">{activeGuru?.nip || '-'}</span></p>
              </div>
            </div>

            {/* List of rombels/classes and their statistics on this subject */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-mono uppercase">
                    <th className="py-3 px-4 font-bold">No</th>
                    <th className="py-3 px-4 font-bold">Kelas / Rombel</th>
                    <th className="py-3 px-4 font-bold">Wali Kelas</th>
                    <th className="py-3 px-4 font-bold text-center">Jumlah Siswa</th>
                    <th className="py-3 px-4 font-bold text-center">Rata-Rata Nilai</th>
                    <th className="py-3 px-4 font-bold text-center">Tinggi</th>
                    <th className="py-3 px-4 font-bold text-center">Rendah</th>
                    <th className="py-3 px-4 font-bold text-center">Persentase Lulus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {kelasList.map((k, idx) => {
                    // Calculate stats for each class on selected mapel
                    const classSts = students.filter(s => s.kelasId === k.id);
                    const summaries = classSts.map(s => getStudentGradesSummary(s.id));
                    const activeFinalScores = summaries.map(sum => sum.finalScore).filter(f => f > 0);

                    const avg = activeFinalScores.length > 0 ? Math.round(activeFinalScores.reduce((a, b) => a + b, 0) / activeFinalScores.length) : 0;
                    const hi = activeFinalScores.length > 0 ? Math.max(...activeFinalScores) : 0;
                    const lo = activeFinalScores.length > 0 ? Math.min(...activeFinalScores) : 0;
                    const pass = activeFinalScores.length > 0 ? Math.round((activeFinalScores.filter(s => s >= (activeMapel?.kkm || 75)).length / activeFinalScores.length) * 100) : 0;

                    return (
                      <tr key={k.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-800">{k.nama}</td>
                        <td className="py-3 px-4 text-slate-600">{gurus.find(g => g.id === k.waliKelasId)?.nama || '-'}</td>
                        <td className="py-3 px-4 text-center font-mono">{classSts.length} Siswa</td>
                        <td className="py-3 px-4 text-center font-mono font-bold">{avg || '-'}</td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-600">{hi || '-'}</td>
                        <td className="py-3 px-4 text-center font-mono text-rose-600">{lo || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          {activeFinalScores.length > 0 ? (
                            <span className="font-mono text-indigo-600 font-extrabold">{pass}%</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Standard Signature Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12 text-xs font-bold text-center">
              <div></div>
              <div className="space-y-20 ml-auto w-64">
                <div className="space-y-1">
                  <p className="text-slate-500 font-medium">Mengetahui,</p>
                  <p className="text-slate-800 font-bold">Guru Mata Pelajaran</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-800 underline font-extrabold text-[13px]">{activeGuru?.nama || '_______________________'}</p>
                  <p className="text-slate-400 font-mono text-[10px] font-normal font-mono">NIP : {activeGuru?.nip || '........................'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER SUB-TAB 3: REKAP DETAIL PER SISWA */}
      {activeSubTab === 'siswa' && (
        <div className="space-y-6">
          {selectedSiswaId && activeSiswa ? (
            <div id="rekap-nilai-siswa-print" className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6 max-w-4xl mx-auto print:border-none print:p-0 animate-fade-in">
              {/* Paper Header block */}
              <div className="border-b-4 border-double border-slate-800 pb-4 flex items-center justify-between">
                <div className="text-left space-y-1">
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{school.namaSekolah}</h2>
                  <p className="text-[10px] text-slate-500 font-bold font-mono">{school.alamat}</p>
                </div>
                <img
                  src={school.logo}
                  alt="Logo Sekolah"
                  className="w-12 h-12 rounded-lg border border-slate-200 shadow-xs"
                />
              </div>

              <div className="text-center">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Laporan Pencapaian Kompetensi Belajar Siswa (Detail)</h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Tahun Ajaran {selectedTahunAjaran} • Semester {selectedSemester}</p>
              </div>

              {/* Bio Block */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600">
                <div className="space-y-1.5">
                  <p>Nama Peserta Didik: <span className="text-slate-800 font-bold">{activeSiswa.nama}</span></p>
                  <p>Nomor Induk Siswa (NIS): <span className="text-slate-800 font-mono font-bold">{activeSiswa.nis}</span></p>
                  <p>NISN (Nasional): <span className="text-slate-800 font-mono">{activeSiswa.nisn || '-'}</span></p>
                </div>
                <div className="space-y-1.5 text-right font-mono">
                  <p>Kelas / Rombel: <span className="text-slate-800 font-bold">{activeClass?.nama || '-'}</span></p>
                  <p>Guru Pengampu: <span className="text-slate-800 font-bold">{activeGuru?.nama || '-'}</span></p>
                  <p>Mata Pelajaran: <span className="text-slate-800 font-bold">{activeMapel?.nama || '-'}</span></p>
                </div>
              </div>

              {/* Detail Component Table with automatic evaluation per item */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  Rincian Komponen Penilaian dan Evaluasi Otomatis
                </h4>

                {(() => {
                  const studentNilais = getStudentDetailedNilais(activeSiswa.id, selectedMapelId);
                  const finalAvg = studentNilais.length > 0
                    ? Math.round(studentNilais.reduce((sum, n) => sum + n.skor, 0) / studentNilais.length)
                    : 0;

                  return (
                    <div className="space-y-4">
                      {/* Main components grid */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-mono uppercase">
                              <th className="py-2.5 px-4 font-bold">Jenis Penilaian</th>
                              <th className="py-2.5 px-4 font-bold">Topik / Bab</th>
                              <th className="py-2.5 px-4 font-bold text-center w-28">Skor Nilai</th>
                              <th className="py-2.5 px-4 font-bold">Evaluasi Guru Pengampu</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                            {studentNilais.map((item, index) => {
                              const evaluationText = generateItemEvaluation(item.jenis, item.topik || '', item.skor);
                              return (
                                <tr key={item.id || index} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 px-4 font-bold text-slate-800">{item.jenis}</td>
                                  <td className="py-3 px-4 text-slate-700 font-semibold">{item.topik || '-'}</td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`inline-flex items-center justify-center px-2.5 py-1 font-mono font-bold text-xs rounded-md ${
                                      item.skor >= (activeMapel?.kkm || 75)
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                                    }`}>
                                      {item.skor}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 font-normal leading-relaxed text-[11px]">
                                    {evaluationText}
                                  </td>
                                </tr>
                              );
                            })}
                            {studentNilais.length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-400 font-normal italic">
                                  Belum ada komponen penilaian yang memiliki skor nilai untuk siswa dan mata pelajaran yang dipilih.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Cumulative Score Summary Card & Conclusion */}
                      {studentNilais.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl flex flex-col md:flex-row gap-6 items-center">
                          <div className="text-center md:border-r md:border-slate-200/80 md:pr-6 flex-shrink-0">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Nilai Rata-Rata Rapor</p>
                            <p className={`text-3xl font-black font-mono mt-1 ${
                              finalAvg >= (activeMapel?.kkm || 75) ? 'text-emerald-700' : 'text-rose-700'
                            }`}>
                              {finalAvg}
                            </p>
                            <span className={`inline-block mt-1.5 px-2.5 py-0.5 text-[9px] font-black rounded border ${
                              finalAvg >= (activeMapel?.kkm || 75)
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {finalAvg >= (activeMapel?.kkm || 75) ? 'LULUS / TUNTAS' : 'BELUM TUNTAS'}
                            </span>
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            <p className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">Kesimpulan Hasil Evaluasi Akhir</p>
                            <p className="text-xs text-slate-600 leading-relaxed font-normal italic">
                              &ldquo;{generateConclusion(finalAvg)}&rdquo;
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Standard Signature Block */}
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
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200/80 rounded-xl p-10 text-center text-slate-400 text-xs no-print">
              Silakan pilih rombel dan peserta didik terlebih dahulu pada bar filter di atas untuk memuat lembar raport detail siswa.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
