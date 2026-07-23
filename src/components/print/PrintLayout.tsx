import React from 'react';
import { PrintHeader } from './PrintHeader';
import { PrintFooter } from './PrintFooter';

interface PrintLayoutProps {
  id: string;
  title: string;
  subtitle?: string;
  metadata?: { label: string; value: string }[];
  guruNama?: string;
  guruNip?: string;
  showKepalaSekolah?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({
  id,
  title,
  subtitle,
  metadata,
  guruNama,
  guruNip,
  showKepalaSekolah,
  children,
  className = ''
}) => {
  return (
    <div id={id} className={`bg-white p-6 rounded-xl border border-slate-200 text-slate-900 font-sans print:p-0 print:border-none ${className}`}>
      <PrintHeader title={title} subtitle={subtitle} metadata={metadata} />
      <div className="w-full my-4 overflow-x-auto">
        {children}
      </div>
      <PrintFooter guruNama={guruNama} guruNip={guruNip} showKepalaSekolah={showKepalaSekolah} />
    </div>
  );
};
