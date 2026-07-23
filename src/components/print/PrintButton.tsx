import React, { useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { db } from '../../utils/storage';
import { printReport, showDirectToast } from '../../utils/exportUtils';
import { Permission } from '../../types';

interface PrintButtonProps {
  elementId: string;
  title: string;
  permission?: Permission;
  onBeforePrint?: () => boolean | void;
  activityLogDetail?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'amber';
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  elementId,
  title,
  permission = 'laporan.print',
  onBeforePrint,
  activityLogDetail,
  variant = 'secondary',
  size = 'md',
  label = 'Cetak',
  className = ''
}) => {
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  const handleClick = () => {
    // 1. Permission check
    if (permission && !db.hasPermission(permission as Permission)) {
      showDirectToast(`Anda tidak memiliki hak akses untuk mencetak laporan ini! (${permission})`, 'error');
      return;
    }

    // 2. Custom validation
    if (onBeforePrint) {
      const result = onBeforePrint();
      if (result === false) return;
    }

    setIsPrinting(true);

    try {
      // 3. Log Activity
      db.logActivity('Cetak Laporan', activityLogDetail || `Mencetak dokumen ${title}`);

      // 4. Trigger printReport
      printReport(elementId, title);
    } catch (err) {
      console.error('Print button execution error:', err);
      showDirectToast('Gagal memicu pencetakan dokumen.', 'error');
    } finally {
      setTimeout(() => {
        setIsPrinting(false);
      }, 500);
    }
  };

  // Base styling variants
  let variantClass = 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200';
  if (variant === 'primary') {
    variantClass = 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm';
  } else if (variant === 'outline') {
    variantClass = 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs';
  } else if (variant === 'amber') {
    variantClass = 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm';
  }

  const sizeClass = size === 'sm' ? 'px-2.5 py-1 text-xs gap-1.5' : 'px-3.5 py-2 text-xs gap-2 font-bold';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPrinting}
      title="Cetak Laporan / Simpan PDF"
      className={`inline-flex items-center justify-center rounded-xl transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${variantClass} ${sizeClass} ${className}`}
    >
      {isPrinting ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
          <span>Memproses...</span>
        </>
      ) : (
        <>
          <Printer className="h-3.5 w-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
