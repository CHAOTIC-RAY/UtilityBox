import React, { useState } from 'react';
import { FileText, Download, CheckCircle } from 'lucide-react';
import { Photo } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface PdfReportToolProps {
  photos: Photo[];
}

export const PdfReportTool: React.FC<PdfReportToolProps> = ({ photos }) => {
  const [reportTitle, setReportTitle] = useState('GEOSPATIAL FIELD SURVEY');
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const doc = new jsPDF();
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text(reportTitle, 14, 25);
      doc.save(`report-${Date.now()}.pdf`);
      setIsGenerating(false);
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="border border-brand-border p-6 bg-brand-surface">
        <h2 className="text-xl font-bold uppercase tracking-[0.2em] text-white flex items-center gap-3">
          <FileText className="w-5 h-5 text-brand-accent" />
          PDF Report Generator
        </h2>
      </div>

      <div className="p-6 border border-brand-border bg-brand-surface space-y-6">
        <div>
          <label className="block text-[9px] font-bold uppercase text-brand-muted mb-2 tracking-[0.2em]">Report Title</label>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="w-full bg-black border border-brand-border px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-accent"
          />
        </div>

        <button
          onClick={generatePDF}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-accent hover:bg-white hover:text-black transition-colors text-[10px] font-bold uppercase tracking-[0.2em] text-white disabled:opacity-50"
        >
          {isGenerating ? 'Compiling...' : (
            <>
              <Download className="w-4 h-4" />
              Download PDF Report
            </>
          )}
        </button>
      </div>
    </div>
  );
};
