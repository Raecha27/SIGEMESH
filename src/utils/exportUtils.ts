// Reporting & Exporting Utility for Teacher Assistant App
// Built with xlsx, jspdf, and jspdf-autotable

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exports JSON data to a highly polished Excel file with auto-fitted column widths
 */
export const exportToExcel = (
  data: any[],
  headers: string[],
  keys: string[],
  filenamePrefix: string
) => {
  // Map raw data array to objects with header names
  const worksheetData = data.map((item) => {
    const obj: { [key: string]: any } = {};
    headers.forEach((header, index) => {
      const key = keys[index];
      let val = item[key];
      
      // Format boolean statuses
      if (typeof val === 'boolean') {
        val = val ? 'Aktif' : 'Nonaktif';
      }
      // Format arrays
      if (Array.isArray(val)) {
        val = val.join(', ');
      }
      obj[header] = val ?? '-';
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  // Auto column width calculation
  const maxLenMap: { [key: string]: number } = {};
  worksheetData.forEach((row) => {
    Object.keys(row).forEach((col) => {
      const valStr = String(row[col]);
      maxLenMap[col] = Math.max(maxLenMap[col] || col.length, valStr.length);
    });
  });

  // Apply widths
  worksheet['!cols'] = Object.keys(maxLenMap).map((col) => ({
    wch: Math.min(Math.max(maxLenMap[col] + 3, 10), 50) // clamp width between 10 and 50 chars
  }));

  // Generate filename with current ISO date
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, filename);
};

/**
 * Generates and downloads a beautifully formatted, branded PDF report.
 * Includes a formal Indonesian Ministry Header, custom styling, and an aligned teacher signature.
 */
export const exportToPDF = (
  title: string,
  headers: string[],
  body: any[][],
  filenamePrefix: string,
  options?: {
    subtitle?: string;
    kelas?: string;
    mapel?: string;
    semester?: string;
    guruNama?: string;
    guruNip?: string;
  }
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Page geometry
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;

  // 1. School Header (KOP SURAT PEMERINTAH)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PEMERINTAH PROVINSI DKI JAKARTA', pageWidth / 2, 14, { align: 'center' });
  doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', pageWidth / 2, 19, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text('SMK NEGERI 1 JAKARTA', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Jl. Budi Utomo No. 7, Sawah Besar, Jakarta Pusat, Telp: (021) 3813622', pageWidth / 2, 30, { align: 'center' });
  doc.text('Email: info@smkn1jakarta.sch.id | Website: www.smkn1jakarta.sch.id', pageWidth / 2, 34, { align: 'center' });

  // Draw elegant double header separator lines
  doc.setLineWidth(0.8);
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.line(marginX, 37, pageWidth - marginX, 37);
  doc.setLineWidth(0.2);
  doc.line(marginX, 38.5, pageWidth - marginX, 38.5);

  // 2. Report Metadata Title Section
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title.toUpperCase(), pageWidth / 2, 47, { align: 'center' });

  if (options?.subtitle) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(options.subtitle, pageWidth / 2, 52, { align: 'center' });
  }

  // Draw small metadata table details
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setDrawColor(226, 232, 240); // slate-200
  
  let currentY = 58;

  if (options?.kelas || options?.mapel || options?.semester) {
    doc.setFont('Helvetica', 'normal');
    let metaLeft = `${options.kelas ? `Rombel: ${options.kelas}` : ''}  ${options.mapel ? `|  Mata Pelajaran: ${options.mapel}` : ''}`;
    let metaRight = `${options.semester ? `Semester: ${options.semester}` : ''}`;
    
    doc.text(metaLeft, marginX, currentY);
    doc.text(metaRight, pageWidth - marginX, currentY, { align: 'right' });
    currentY += 5;
  }

  // 3. Render Data Table (jsPDF AutoTable)
  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: body,
    theme: 'striped',
    headStyles: {
      fillColor: [16, 185, 129], // emerald-600
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85], // slate-700
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 } // # column auto centered
    },
    margin: { left: marginX, right: marginX },
    didDrawPage: (data: any) => {
      // Small page number footer on each page
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Halaman ${data.pageNumber} dari ${doc.getNumberOfPages()} | Teacher Assistant SMK Negeri 1 Jakarta`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  });

  // 4. Aligned Signature Block (Guru Mata Pelajaran Only - No Kepala Sekolah reference)
  const lastTableFinalY = (doc as any).lastAutoTable?.finalY ?? (autoTable as any).previousAutoTable?.(doc)?.finalY ?? (currentY + 40);
  const finalY = lastTableFinalY + 12;

  // If signature block fits on the current page, render it, otherwise add a new page
  let sigY = finalY;
  if (sigY + 35 > pageHeight - 15) {
    doc.addPage();
    sigY = 25;
  }

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  
  const today = new Date();
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const formattedDate = `Jakarta, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

  // Signature Block - aligned to the right side of the page
  const sigX = pageWidth - marginX - 60;
  doc.text(formattedDate, sigX, sigY);
  doc.text('Mengetahui,', sigX, sigY + 5);
  doc.setFont('Helvetica', 'bold');
  doc.text('Guru Mata Pelajaran,', sigX, sigY + 10);

  // Signature line and info
  doc.text('__________________________', sigX, sigY + 28);
  doc.setFont('Helvetica', 'bold');
  doc.text(options?.guruNama || 'Guru Pembimbing', sigX, sigY + 33);
  doc.setFont('Helvetica', 'normal');
  doc.text(`NIP: ${options?.guruNip || '........................'}`, sigX, sigY + 37);

  // Save/Download PDF
  const dateStr = today.toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${dateStr}.pdf`;
  doc.save(filename);
};

/**
 * Displays a beautiful, floating notification on document.body for instant feedback
 */
export const showDirectToast = (message: string, type: 'success' | 'error' | 'info') => {
  const existing = document.getElementById('print-direct-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'print-direct-toast';
  toast.className = 'fixed bottom-5 right-5 z-[9999] max-w-md bg-slate-900 text-white rounded-xl shadow-xl p-4 flex items-start gap-3 border border-slate-800';
  
  if (!document.getElementById('slide-in-print-style')) {
    const style = document.createElement('style');
    style.id = 'slide-in-print-style';
    style.innerHTML = `
      @keyframes slide-in-print {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .animate-slide-in {
        animation: slide-in-print 0.3s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
  }
  toast.classList.add('animate-slide-in');

  let icon = 'ℹ️';
  let title = 'Informasi';
  if (type === 'success') {
    icon = '✅';
    title = 'Sukses';
  } else if (type === 'error') {
    icon = '❌';
    title = 'Akses Ditolak';
    toast.className = 'fixed bottom-5 right-5 z-[9999] max-w-md bg-rose-950 text-rose-100 rounded-xl shadow-xl p-4 flex items-start gap-3 border border-rose-800';
  }

  toast.innerHTML = `
    <div class="text-xl">${icon}</div>
    <div class="flex-1 space-y-1">
      <p class="font-bold text-sm text-white">${title}</p>
      <p class="text-xs leading-relaxed">${message}</p>
    </div>
    <button class="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-white/10" onclick="this.parentElement.remove()">✕</button>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 7000);
};

/**
 * Triggers standard system print dialog specifically targeting a DOM container
 * while completely and beautifully isolating it from background app elements.
 */
export const printReport = (elementId: string, title: string) => {
  const content = document.getElementById(elementId);
  if (!content) {
    console.error(`Element with id '${elementId}' not found for printing.`);
    showDirectToast(`Gagal mencetak: Konten "${title}" tidak dapat ditemukan di halaman ini.`, 'error');
    return;
  }

  // Create a clean stylesheet override for print
  const style = document.createElement('style');
  style.id = 'print-style-override';
  style.innerHTML = `
    @media print {
      body > *:not(#print-capture-area) {
        display: none !important;
        visibility: hidden !important;
      }
      #print-capture-area, #print-capture-area * {
        visibility: visible !important;
      }
      #print-capture-area {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        background: white !important;
        color: black !important;
      }
      /* Remove non-printable tags inside the print container */
      .no-print, button, form, input, select {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  // Wrap target content in the printable capture area id
  const printArea = document.createElement('div');
  printArea.id = 'print-capture-area';
  
  // Clone element to prevent losing state/events
  const clone = content.cloneNode(true) as HTMLElement;
  printArea.appendChild(clone);
  document.body.appendChild(printArea);

  try {
    // Trigger browser print
    window.print();
  } catch (err: any) {
    console.warn("Direct window.print() failed or was blocked by iframe/browser security constraints.", err);
    showDirectToast(
      "Browser memblokir dialog cetak langsung karena batasan keamanan iFrame. Silakan gunakan tombol 'Ekspor PDF' atau 'Ekspor Excel' untuk mengunduh laporan berkualitas tinggi.",
      'info'
    );
  }

  // Clean up
  setTimeout(() => {
    printArea.remove();
    style.remove();
  }, 1000);
};
