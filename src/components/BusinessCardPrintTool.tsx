import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CreditCard, Printer, FileText, Download, RefreshCw, Upload, Check, AlertCircle, 
  Layers, Settings, Eye, Sliders, Scissors, ArrowLeftRight, CheckCircle2, 
  Sparkles, Info, ZoomIn, ZoomOut, Maximize2, Trash2, ShieldCheck, FileCheck
} from 'lucide-react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { renderPdfThumbnails } from '../utils/pdfRenderer';

// Conversion constant: 1 mm = 72 / 25.4 points
const MM = 72 / 25.4;

export interface PaperPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
}

export const PAPER_PRESETS: PaperPreset[] = [
  { id: 'A4', name: 'A4 (210 × 297 mm)', widthMm: 210, heightMm: 297 },
  { id: 'A3', name: 'A3 (297 × 420 mm)', widthMm: 297, heightMm: 420 },
  { id: 'A5', name: 'A5 (148 × 210 mm)', widthMm: 148, heightMm: 210 },
  { id: 'LETTER', name: 'US Letter (8.5 × 11 in / 215.9 × 279.4 mm)', widthMm: 215.9, heightMm: 279.4 },
  { id: 'LEGAL', name: 'US Legal (8.5 × 14 in / 215.9 × 355.6 mm)', widthMm: 215.9, heightMm: 355.6 },
  { id: 'TABLOID', name: 'Tabloid / 11×17 (279.4 × 431.8 mm)', widthMm: 279.4, heightMm: 431.8 },
  { id: 'SRA3', name: 'SRA3 Press Sheet (320 × 450 mm)', widthMm: 320, heightMm: 450 },
  { id: 'CUSTOM', name: 'Custom Paper Size...', widthMm: 210, heightMm: 297 },
];

export interface CardPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  region: string;
}

export const CARD_PRESETS: CardPreset[] = [
  { id: 'EU', name: 'EU / ISO 7810 Standard', widthMm: 85, heightMm: 55, region: 'UK, EU, International' },
  { id: 'US', name: 'US / Canada Standard (3.5 × 2 in)', widthMm: 88.9, heightMm: 50.8, region: 'USA, Canada' },
  { id: 'JP', name: 'Japanese Meishi (91 × 55 mm)', widthMm: 91, heightMm: 55, region: 'Japan' },
  { id: 'AU', name: 'Australian / NZ (90 × 55 mm)', widthMm: 90, heightMm: 55, region: 'Australia, NZ' },
  { id: 'SQUARE', name: 'Square Card (65 × 65 mm)', widthMm: 65, heightMm: 65, region: 'Modern / Creative' },
  { id: 'MINI', name: 'Mini / Sleek (85 × 25 mm)', widthMm: 85, heightMm: 25, region: 'Compact / Slim' },
  { id: 'CUSTOM', name: 'Custom Card Dimensions...', widthMm: 85, heightMm: 55, region: 'User specified' },
];

export const BusinessCardPrintTool: React.FC = () => {
  // Input Files & Data
  const [sourceMode, setSourceMode] = useState<'single' | 'separate'>('single');
  const [singlePdfFile, setSinglePdfFile] = useState<File | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [isSingleSided, setIsSingleSided] = useState<boolean>(false);

  // Rendered previews of front & back
  const [frontThumb, setFrontThumb] = useState<string | null>(null);
  const [backThumb, setBackThumb] = useState<string | null>(null);
  const [detectedCardSizeMm, setDetectedCardSizeMm] = useState<{ width: number; height: number } | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  // Paper & Card Dimensions
  const [selectedPaper, setSelectedPaper] = useState<string>('A4');
  const [customPaperW, setCustomPaperW] = useState<number>(210);
  const [customPaperH, setCustomPaperH] = useState<number>(297);

  const [selectedCardSize, setSelectedCardSize] = useState<string>('EU');
  const [cardW, setCardW] = useState<number>(85);
  const [cardH, setCardH] = useState<number>(55);

  // Prepress Parameters
  const [targetBleedMm, setTargetBleedMm] = useState<number>(2.0); // extra bleed printed
  const [sourceBleedMm, setSourceBleedMm] = useState<number>(0.0); // bleed already present in source file
  const [marginMm, setMarginMm] = useState<number>(6.0); // min margin from edge of sheet
  const [gapMode, setGapMode] = useState<'auto' | 'custom'>('auto');
  const [customGapMm, setCustomGapMm] = useState<number>(4.0);
  
  // Placement & Yield
  const [orientationMode, setOrientationMode] = useState<'auto' | 'unrotated' | 'rotated'>('auto');
  const [duplexFlip, setDuplexFlip] = useState<'long' | 'short'>('long');
  const [drawCropMarks, setDrawCropMarks] = useState<boolean>(true);
  const [drawSlug, setDrawSlug] = useState<boolean>(true);
  const [drawCenterMarks, setDrawCenterMarks] = useState<boolean>(true);

  // Visual View State
  const [previewSide, setPreviewSide] = useState<'front' | 'back' | 'both'>('front');
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [printRunCount, setPrintRunCount] = useState<number>(250);

  // Processing state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Resolve active paper width & height in mm
  const paperDimMm = useMemo(() => {
    if (selectedPaper === 'CUSTOM') {
      return { w: Math.max(50, customPaperW), h: Math.max(50, customPaperH) };
    }
    const preset = PAPER_PRESETS.find(p => p.id === selectedPaper) || PAPER_PRESETS[0];
    return { w: preset.widthMm, h: preset.heightMm };
  }, [selectedPaper, customPaperW, customPaperH]);

  // Actual spacing gap between cards
  const effectiveGapMm = useMemo(() => {
    if (gapMode === 'custom') {
      return Math.max(0, customGapMm);
    }
    // Auto: If bleed > 0, standard imposition requires at least 2 * bleed spacing so cut marks don't overlap
    return targetBleedMm > 0 ? targetBleedMm * 2 : 0;
  }, [gapMode, customGapMm, targetBleedMm]);

  // Single card slot size including target bleed (trimmed card size + 2 * bleed)
  const slotW = cardW + 2 * targetBleedMm;
  const slotH = cardH + 2 * targetBleedMm;

  // Imposition Grid Calculation (reverse-engineered from card2print.py)
  const imposition = useMemo(() => {
    const pw = paperDimMm.w;
    const ph = paperDimMm.h;
    const availW = pw - 2 * marginMm;
    const availH = ph - 2 * marginMm;
    const gap = effectiveGapMm;

    // Option 0: unrotated card on sheet
    const cols0 = Math.max(0, Math.floor((availW + gap) / (slotW + gap)));
    const rows0 = Math.max(0, Math.floor((availH + gap) / (slotH + gap)));
    const count0 = cols0 * rows0;

    // Option 1: rotated card 90 degrees on sheet
    const cols1 = Math.max(0, Math.floor((availW + gap) / (slotH + gap)));
    const rows1 = Math.max(0, Math.floor((availH + gap) / (slotW + gap)));
    const count1 = cols1 * rows1;

    let isRotated = false;
    let cols = cols0;
    let rows = rows0;
    let count = count0;

    if (orientationMode === 'auto') {
      if (count1 > count0) {
        isRotated = true;
        cols = cols1;
        rows = rows1;
        count = count1;
      } else {
        isRotated = false;
        cols = cols0;
        rows = rows0;
        count = count0;
      }
    } else if (orientationMode === 'rotated') {
      isRotated = true;
      cols = cols1;
      rows = rows1;
      count = count1;
    } else {
      isRotated = false;
      cols = cols0;
      rows = rows0;
      count = count0;
    }

    // Cell dimensions on sheet
    const cellW = isRotated ? slotH : slotW;
    const cellH = isRotated ? slotW : slotH;

    // Total grid bounds
    const gridW = cols > 0 ? cols * cellW + (cols - 1) * gap : 0;
    const gridH = rows > 0 ? rows * cellH + (rows - 1) * gap : 0;

    // Centering offsets
    const x0 = (pw - gridW) / 2;
    const y0 = (ph - gridH) / 2;

    // Paper area coverage percentage
    const cardArea = count * (cardW * cardH);
    const paperArea = pw * ph;
    const coverage = paperArea > 0 ? (cardArea / paperArea) * 100 : 0;

    return {
      cols,
      rows,
      count,
      isRotated,
      cellW,
      cellH,
      gridW,
      gridH,
      x0,
      y0,
      coverage,
      gap
    };
  }, [paperDimMm, marginMm, slotW, slotH, effectiveGapMm, orientationMode, cardW, cardH]);

  // Handle single PDF file selection
  const handleSinglePdfUpload = async (file: File) => {
    setSinglePdfFile(file);
    setIsExtracting(true);
    setStatusMsg({ text: 'Inspecting PDF page dimensions and generating thumbnails...', type: 'info' });
    try {
      const summary = await renderPdfThumbnails(file, 2, 1.2);
      if (summary.pages.length > 0) {
        setFrontThumb(summary.pages[0].dataUrl);
        // Page 1 dimensions in points -> mm
        if (summary.pageDimensions[0]) {
          const ptW = summary.pageDimensions[0].width;
          const ptH = summary.pageDimensions[0].height;
          // Note: pdfjs scale is 1.2 in call
          const rawPtW = ptW / 1.2;
          const rawPtH = ptH / 1.2;
          const mmW = Number((rawPtW / MM).toFixed(1));
          const mmH = Number((rawPtH / MM).toFixed(1));
          setDetectedCardSizeMm({ width: mmW, height: mmH });

          // Auto-match preset or custom
          const matched = CARD_PRESETS.find(p => 
            p.id !== 'CUSTOM' && (
              (Math.abs(p.widthMm - mmW) < 2 && Math.abs(p.heightMm - mmH) < 2) ||
              (Math.abs(p.widthMm - mmH) < 2 && Math.abs(p.heightMm - mmW) < 2)
            )
          );
          if (matched) {
            setSelectedCardSize(matched.id);
            setCardW(matched.widthMm);
            setCardH(matched.heightMm);
          } else {
            setSelectedCardSize('CUSTOM');
            setCardW(mmW);
            setCardH(mmH);
          }
        }
      }
      if (summary.pages.length > 1) {
        setBackThumb(summary.pages[1].dataUrl);
        setIsSingleSided(false);
      } else {
        setBackThumb(null);
        setIsSingleSided(true);
      }
      setStatusMsg({ text: `Loaded "${file.name}" (${summary.pages.length} page${summary.pages.length > 1 ? 's' : ''})`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: `Failed to inspect PDF: ${err?.message || 'Invalid PDF'}`, type: 'error' });
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle separate front file
  const handleFrontUpload = async (file: File) => {
    setFrontFile(file);
    try {
      if (file.type === 'application/pdf') {
        const summary = await renderPdfThumbnails(file, 1, 1.2);
        if (summary.pages.length > 0) {
          setFrontThumb(summary.pages[0].dataUrl);
        }
      } else {
        // Image file
        const url = URL.createObjectURL(file);
        setFrontThumb(url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle separate back file
  const handleBackUpload = async (file: File) => {
    setBackFile(file);
    try {
      if (file.type === 'application/pdf') {
        const summary = await renderPdfThumbnails(file, 1, 1.2);
        if (summary.pages.length > 0) {
          setBackThumb(summary.pages[0].dataUrl);
        }
      } else {
        const url = URL.createObjectURL(file);
        setBackThumb(url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load a demo business card so users can test immediately
  const handleLoadDemo = async () => {
    setIsExtracting(true);
    setStatusMsg({ text: 'Generating high-res demonstration business cards...', type: 'info' });
    try {
      // Create a clean demo 2-page PDF with pdf-lib (85x55mm)
      const demoDoc = await PDFDocument.create();
      const pageW = 85 * MM;
      const pageH = 55 * MM;

      // Front Page
      const p1 = demoDoc.addPage([pageW, pageH]);
      // Background gradient feel with dark fill
      p1.drawRectangle({
        x: 0,
        y: 0,
        width: pageW,
        height: pageH,
        color: rgb(0.06, 0.06, 0.08),
      });
      // Accent bar
      p1.drawRectangle({
        x: 0,
        y: pageH - 4 * MM,
        width: pageW,
        height: 4 * MM,
        color: rgb(0.72, 0.0, 1.0),
      });
      // Typography
      p1.drawText("CHAOSBOX CREATIVE", {
        x: 6 * MM,
        y: pageH - 18 * MM,
        size: 14,
        color: rgb(1, 1, 1),
      });
      p1.drawText("DESIGN & PREPRESS STUDIO", {
        x: 6 * MM,
        y: pageH - 24 * MM,
        size: 7,
        color: rgb(0.72, 0.0, 1.0),
      });
      p1.drawText("Alex Vance | Lead Engineer", {
        x: 6 * MM,
        y: pageH - 34 * MM,
        size: 9,
        color: rgb(0.9, 0.9, 0.9),
      });
      p1.drawText("hello@chaosbox.io  •  +1 (555) 019-2834", {
        x: 6 * MM,
        y: 8 * MM,
        size: 6.5,
        color: rgb(0.6, 0.6, 0.6),
      });

      // Back Page
      const p2 = demoDoc.addPage([pageW, pageH]);
      p2.drawRectangle({
        x: 0,
        y: 0,
        width: pageW,
        height: pageH,
        color: rgb(0.72, 0.0, 1.0),
      });
      p2.drawRectangle({
        x: 4 * MM,
        y: 4 * MM,
        width: pageW - 8 * MM,
        height: pageH - 8 * MM,
        color: rgb(0.06, 0.06, 0.08),
      });
      p2.drawText("CHAOSBOX", {
        x: 24 * MM,
        y: 28 * MM,
        size: 18,
        color: rgb(1, 1, 1),
      });
      p2.drawText("WWW.CHAOSBOX.IO", {
        x: 27 * MM,
        y: 20 * MM,
        size: 8,
        color: rgb(0.72, 0.0, 1.0),
      });

      const pdfBytes = await demoDoc.save();
      const demoFile = new File([pdfBytes], "Demo_Creative_Card_85x55.pdf", { type: 'application/pdf' });
      await handleSinglePdfUpload(demoFile);
      setSelectedCardSize('EU');
      setCardW(85);
      setCardH(55);
      setStatusMsg({ text: 'Loaded demo double-sided business card ready for imposition!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: 'Error generating demo card', type: 'error' });
    } finally {
      setIsExtracting(false);
    }
  };

  // Generate and Download the Print-Ready Imposition PDF
  const handleGeneratePrintReadyPdf = async () => {
    if (imposition.count === 0) {
      setStatusMsg({ text: 'No cards fit on this sheet. Adjust paper or card dimensions.', type: 'error' });
      return;
    }

    setIsExporting(true);
    setStatusMsg({ text: 'Generating 2-page duplex print-ready PDF with precision crop marks...', type: 'info' });

    try {
      const outputPdf = await PDFDocument.create();
      const pwPt = paperDimMm.w * MM;
      const phPt = paperDimMm.h * MM;

      // Source document setup
      let frontSourcePage: any = null;
      let backSourcePage: any = null;

      if (sourceMode === 'single' && singlePdfFile) {
        const fileBuffer = await singlePdfFile.arrayBuffer();
        const srcDoc = await PDFDocument.load(fileBuffer);
        const embeddedPages = await outputPdf.embedPages(srcDoc.getPages());
        frontSourcePage = embeddedPages[0];
        if (embeddedPages.length > 1 && !isSingleSided) {
          backSourcePage = embeddedPages[1];
        } else {
          backSourcePage = isSingleSided ? null : embeddedPages[0];
        }
      } else if (sourceMode === 'separate') {
        if (frontFile) {
          if (frontFile.type === 'application/pdf') {
            const buf = await frontFile.arrayBuffer();
            const fDoc = await PDFDocument.load(buf);
            const emb = await outputPdf.embedPdf(fDoc);
            frontSourcePage = emb[0];
          } else {
            const buf = await frontFile.arrayBuffer();
            const img = frontFile.type.includes('png') ? await outputPdf.embedPng(buf) : await outputPdf.embedJpg(buf);
            frontSourcePage = img;
          }
        }
        if (backFile && !isSingleSided) {
          if (backFile.type === 'application/pdf') {
            const buf = await backFile.arrayBuffer();
            const bDoc = await PDFDocument.load(buf);
            const emb = await outputPdf.embedPdf(bDoc);
            backSourcePage = emb[0];
          } else {
            const buf = await backFile.arrayBuffer();
            const img = backFile.type.includes('png') ? await outputPdf.embedPng(buf) : await outputPdf.embedJpg(buf);
            backSourcePage = img;
          }
        }
      }

      // Calculations in points
      const cellWPt = imposition.cellW * MM;
      const cellHPt = imposition.cellH * MM;
      const gapPt = imposition.gap * MM;
      const x0Pt = imposition.x0 * MM;
      const y0Pt = imposition.y0 * MM;
      const bleedPt = targetBleedMm * MM;
      const cardWPt = cardW * MM;
      const cardHPt = cardH * MM;

      // Card rotation angle
      // When card is rotated on sheet:
      // Front is rotated 90 or 270 deg
      const rotFrontDeg = imposition.isRotated ? 90 : 0;
      // Duplex flip angle for back side (from card2print.py:
      // up_front = 0 if rotated else 90
      // up_back = (180 - up_front) if flip == "long" else -up_front
      // rot_front = (up_front - 90) % 360
      // rot_back = (up_back - 90) % 360)
      let rotBackDeg = 0;
      if (imposition.isRotated) {
        // Rotated 90 on front
        // Long edge flip: back rotates to 270 to match head-to-head registration
        rotBackDeg = duplexFlip === 'long' ? 270 : 90;
      } else {
        // Unrotated on front
        // Long edge flip: back stays 0 (upright)
        // Short edge flip: back flips 180 (head-to-toe)
        rotBackDeg = duplexFlip === 'long' ? 0 : 180;
      }

      // Function to draw crop marks on a page
      const drawPrepressMarks = (sheetPage: any, isBackSide: boolean) => {
        if (!drawCropMarks) return;

        const markLen = Math.min(4 * MM, (x0Pt - bleedPt) * 0.7);
        const markOffset = 1.2 * MM; // spacing between cut line and mark
        const strokeW = 0.35; // Fine 0.35pt hairline
        const markColor = rgb(0, 0, 0);

        // Compute all X cut boundaries across columns
        const xCutCoords: number[] = [];
        for (let c = 0; c < imposition.cols; c++) {
          const colX = x0Pt + c * (cellWPt + gapPt);
          // trim left and trim right of this card cell
          const trimLeft = colX + bleedPt;
          const trimRight = colX + cellWPt - bleedPt;
          xCutCoords.push(trimLeft);
          xCutCoords.push(trimRight);
        }

        // Compute all Y cut boundaries across rows
        const yCutCoords: number[] = [];
        for (let r = 0; r < imposition.rows; r++) {
          const rowY = y0Pt + r * (cellHPt + gapPt);
          const trimBottom = rowY + bleedPt;
          const trimTop = rowY + cellHPt - bleedPt;
          yCutCoords.push(trimBottom);
          yCutCoords.push(trimTop);
        }

        // Draw vertical crop marks at the top and bottom margins of the sheet
        const topGridY = y0Pt + imposition.gridH * MM;
        const btmGridY = y0Pt;

        for (const cx of xCutCoords) {
          // Bottom margin mark
          sheetPage.drawLine({
            start: { x: cx, y: btmGridY - markOffset },
            end: { x: cx, y: btmGridY - markOffset - markLen },
            thickness: strokeW,
            color: markColor,
          });
          // Top margin mark
          sheetPage.drawLine({
            start: { x: cx, y: topGridY + markOffset },
            end: { x: cx, y: topGridY + markOffset + markLen },
            thickness: strokeW,
            color: markColor,
          });

          // If gap > 0, draw tick marks in the intermediate gutter
          if (imposition.gap > 0 && imposition.rows > 1) {
            for (let r = 0; r < imposition.rows - 1; r++) {
              const gutterBottom = y0Pt + (r + 1) * (cellHPt + gapPt) - gapPt + bleedPt;
              const gutterTop = y0Pt + (r + 1) * (cellHPt + gapPt) - bleedPt;
              // Tick inside gutter
              sheetPage.drawLine({
                start: { x: cx, y: gutterBottom },
                end: { x: cx, y: Math.min(gutterBottom + markLen * 0.5, gutterTop) },
                thickness: strokeW,
                color: markColor,
              });
            }
          }
        }

        // Draw horizontal crop marks at the left and right margins of the sheet
        const leftGridX = x0Pt;
        const rightGridX = x0Pt + imposition.gridW * MM;

        for (const cy of yCutCoords) {
          // Left margin mark
          sheetPage.drawLine({
            start: { x: leftGridX - markOffset, y: cy },
            end: { x: leftGridX - markOffset - markLen, y: cy },
            thickness: strokeW,
            color: markColor,
          });
          // Right margin mark
          sheetPage.drawLine({
            start: { x: rightGridX + markOffset, y: cy },
            end: { x: rightGridX + markOffset + markLen, y: cy },
            thickness: strokeW,
            color: markColor,
          });

          // Gutter marks in horizontal spacing
          if (imposition.gap > 0 && imposition.cols > 1) {
            for (let c = 0; c < imposition.cols - 1; c++) {
              const gutterLeft = x0Pt + (c + 1) * (cellWPt + gapPt) - gapPt + bleedPt;
              const gutterRight = x0Pt + (c + 1) * (cellWPt + gapPt) - bleedPt;
              sheetPage.drawLine({
                start: { x: gutterLeft, y: cy },
                end: { x: Math.min(gutterLeft + markLen * 0.5, gutterRight), y: cy },
                thickness: strokeW,
                color: markColor,
              });
            }
          }
        }

        // Draw Sheet Center Registration Crosshairs
        if (drawCenterMarks) {
          const crossLen = 3 * MM;
          // Top Center
          sheetPage.drawLine({ start: { x: pwPt / 2, y: phPt - 2 * MM }, end: { x: pwPt / 2, y: phPt - 2 * MM - crossLen }, thickness: 0.3, color: markColor });
          sheetPage.drawLine({ start: { x: pwPt / 2 - crossLen / 2, y: phPt - 2 * MM - crossLen / 2 }, end: { x: pwPt / 2 + crossLen / 2, y: phPt - 2 * MM - crossLen / 2 }, thickness: 0.3, color: markColor });
          // Bottom Center
          sheetPage.drawLine({ start: { x: pwPt / 2, y: 2 * MM }, end: { x: pwPt / 2, y: 2 * MM + crossLen }, thickness: 0.3, color: markColor });
          sheetPage.drawLine({ start: { x: pwPt / 2 - crossLen / 2, y: 2 * MM + crossLen / 2 }, end: { x: pwPt / 2 + crossLen / 2, y: 2 * MM + crossLen / 2 }, thickness: 0.3, color: markColor });
        }

        // Draw Prepress Slug Info
        if (drawSlug) {
          const slugText = `CHAOSBOX PREPRESS • ${isBackSide ? 'PAGE 2 (BACK SHEET)' : 'PAGE 1 (FRONT SHEET)'} • ${selectedPaper} (${paperDimMm.w}x${paperDimMm.h}mm) • CARD: ${cardW}x${cardH}mm (Bleed: ${targetBleedMm}mm) • DUPLEX: ${duplexFlip.toUpperCase()} EDGE • YIELD: ${imposition.count} CARDS (${imposition.cols}x${imposition.rows})`;
          sheetPage.drawText(slugText, {
            x: x0Pt,
            y: phPt - Math.max(3 * MM, y0Pt * 0.5),
            size: 5.5,
            color: rgb(0.2, 0.2, 0.2),
          });
        }
      };

      // Helper function to render a card onto the sheet at a specific cell
      const drawCardAtCell = (
        sheetPage: any, 
        source: any, 
        cellCol: number, 
        cellRow: number, 
        rotDeg: number,
        isBack: boolean
      ) => {
        // Calculate cell bottom-left on sheet
        const cx = x0Pt + cellCol * (cellWPt + gapPt);
        const cy = y0Pt + cellRow * (cellHPt + gapPt);

        // Center of the cell
        const centerX = cx + cellWPt / 2;
        const centerY = cy + cellHPt / 2;

        if (source) {
          // If source is EmbeddedPage or PDFImage
          const drawW = imposition.isRotated ? cellHPt : cellWPt;
          const drawH = imposition.isRotated ? cellWPt : cellHPt;

          let drawX = centerX - drawW / 2;
          let drawY = centerY - drawH / 2;

          if (rotDeg === 90) {
            // Rotated 90 deg counter-clockwise in PDF coordinate system
            // Local bounding box rotates such that:
            // X spans [x - drawH, x], center is x - drawH / 2
            // Y spans [y, y + drawW], center is y + drawW / 2
            // To align bounding box center with (centerX, centerY):
            drawX = centerX + drawH / 2;
            drawY = centerY - drawW / 2;
          } else if (rotDeg === 270) {
            // Rotated 270 deg counter-clockwise in PDF coordinate system
            // Local bounding box rotates such that:
            // X spans [x, x + drawH], center is x + drawH / 2
            // Y spans [y - drawW, y], center is y - drawW / 2
            // To align bounding box center with (centerX, centerY):
            drawX = centerX - drawH / 2;
            drawY = centerY + drawW / 2;
          } else if (rotDeg === 180) {
            // Rotated 180 deg
            // X spans [x - drawW, x], center is x - drawW / 2
            // Y spans [y - drawH, y], center is y - drawH / 2
            drawX = centerX + drawW / 2;
            drawY = centerY + drawH / 2;
          } else {
            // 0 deg unrotated
            drawX = centerX - drawW / 2;
            drawY = centerY - drawH / 2;
          }

          const drawParams: any = {
            x: drawX,
            y: drawY,
            width: drawW,
            height: drawH,
            ...(rotDeg !== 0 ? { rotate: degrees(rotDeg) } : {})
          };

          const isImage = typeof source.scale === 'function';
          if (isImage) {
            sheetPage.drawImage(source, drawParams);
          } else {
            sheetPage.drawPage(source, drawParams);
          }
        } else {
          // Fallback outline if no source artwork uploaded yet
          sheetPage.drawRectangle({
            x: cx + bleedPt,
            y: cy + bleedPt,
            width: cellWPt - 2 * bleedPt,
            height: cellHPt - 2 * bleedPt,
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 0.5,
          });
          sheetPage.drawText(`${isBack ? 'BACK' : 'FRONT'} #${cellRow * imposition.cols + cellCol + 1}`, {
            x: centerX - 15,
            y: centerY - 3,
            size: 8,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
      };

      // ==========================================
      // PAGE 1: FRONT SHEET
      // ==========================================
      const frontPage = outputPdf.addPage([pwPt, phPt]);
      // Background white
      frontPage.drawRectangle({ x: 0, y: 0, width: pwPt, height: phPt, color: rgb(1, 1, 1) });

      // Place front cards
      for (let r = 0; r < imposition.rows; r++) {
        for (let c = 0; c < imposition.cols; c++) {
          drawCardAtCell(frontPage, frontSourcePage, c, r, rotFrontDeg, false);
        }
      }
      // Draw marks
      drawPrepressMarks(frontPage, false);

      // ==========================================
      // PAGE 2: BACK SHEET (If not single-sided)
      // ==========================================
      if (!isSingleSided) {
        const backPage = outputPdf.addPage([pwPt, phPt]);
        backPage.drawRectangle({ x: 0, y: 0, width: pwPt, height: phPt, color: rgb(1, 1, 1) });

        // DUPLEX REGISTRATION LOGIC:
        // When printing duplex and flipping on Long Edge (horizontal flip):
        // Card at column `c` on the front will be physically located at `(cols - 1 - c)` on the back!
        // When flipping on Short Edge (vertical flip):
        // Card at row `r` on the front will be physically located at `(rows - 1 - r)` on the back!
        for (let r = 0; r < imposition.rows; r++) {
          for (let c = 0; c < imposition.cols; c++) {
            let backCol = c;
            let backRow = r;

            if (duplexFlip === 'long') {
              // Horizontal mirror across sheet columns
              backCol = imposition.cols - 1 - c;
            } else {
              // Vertical mirror across sheet rows
              backRow = imposition.rows - 1 - r;
            }

            drawCardAtCell(backPage, backSourcePage || frontSourcePage, backCol, backRow, rotBackDeg, true);
          }
        }
        // Draw marks
        drawPrepressMarks(backPage, true);
      }

      // Finalize and save
      const finalPdfBytes = await outputPdf.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const baseName = singlePdfFile ? singlePdfFile.name.replace(/\.[^/.]+$/, "") : "BusinessCards";
      const outFileName = `${baseName}_${selectedPaper}_${imposition.count}UP_${isSingleSided ? 'Single' : 'Duplex'}_PrintReady.pdf`;
      saveAs(blob, outFileName);

      setStatusMsg({
        text: `Exported ${outFileName} (${(blob.size / 1024).toFixed(1)} KB) with ${imposition.count} cards per sheet!`,
        type: 'success'
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: `Export failed: ${err?.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // Run Calculations
  const requiredSheets = Math.ceil(printRunCount / Math.max(1, imposition.count));
  const recommendedSheets = Math.ceil(requiredSheets * 1.05); // 5% allowance for printer feed alignment and guillotine trim

  return (
    <div className="w-full min-h-screen bg-black text-white p-4 md:p-8 flex flex-col gap-6 font-mono">
      {/* Top Header Banner */}
      <div className="border border-brand-border bg-brand-surface p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-accent bg-black px-2.5 py-1 border border-brand-border">
                PREPRESS IMPOSITION ENGINE
              </span>
              <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 border border-zinc-800">
                DUPLEX SUB-MM ALIGNMENT
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <Printer className="w-7 h-7 text-brand-accent" />
              <span>Business Card to Print-Ready Sheet</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              Convert raw business card designs into professional N-up imposition print sheets for desktop printers or commercial digital presses. Sub-millimeter duplex registration, automatic yield rotation, edge bleed isolation, and vector crop marks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleLoadDemo}
              disabled={isExtracting}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-sm"
              title="Load sample double-sided business card"
            >
              <Sparkles className="w-4 h-4 text-brand-accent" />
              <span>Load Demo Card</span>
            </button>
            <button
              onClick={handleGeneratePrintReadyPdf}
              disabled={isExporting || imposition.count === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent hover:bg-opacity-90 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-accent/20 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Print PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Status Toast */}
        {statusMsg && (
          <div className={`mt-4 p-3 text-xs flex items-center justify-between border ${
            statusMsg.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' :
            statusMsg.type === 'error' ? 'bg-rose-950/40 border-rose-500/50 text-rose-300' :
            'bg-purple-950/40 border-brand-accent/50 text-purple-200'
          }`}>
            <div className="flex items-center gap-2">
              {statusMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {statusMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {statusMsg.type === 'info' && <RefreshCw className="w-4 h-4 text-brand-accent shrink-0 animate-spin" />}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-zinc-500 hover:text-white ml-2 text-[10px]">✕</button>
          </div>
        )}
      </div>

      {/* Main Workbench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Controls & Settings (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Card Upload Section */}
          <div className="border border-brand-border bg-brand-surface p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-brand-accent" />
                <span>1. Source Artwork</span>
              </span>
              <div className="flex gap-1 text-[10px] bg-black p-0.5 border border-brand-border">
                <button
                  onClick={() => setSourceMode('single')}
                  className={`px-2 py-1 ${sourceMode === 'single' ? 'bg-brand-accent text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  1 PDF (2 Pages)
                </button>
                <button
                  onClick={() => setSourceMode('separate')}
                  className={`px-2 py-1 ${sourceMode === 'separate' ? 'bg-brand-accent text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Separate Files
                </button>
              </div>
            </div>

            {sourceMode === 'single' ? (
              <div>
                <label className="border-2 border-dashed border-zinc-700 hover:border-brand-accent/80 transition-colors p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-black/40 group block">
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleSinglePdfUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <FileText className="w-8 h-8 text-zinc-500 group-hover:text-brand-accent transition-colors mb-2" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {singlePdfFile ? singlePdfFile.name : 'Choose Business Card PDF'}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1">
                    Accepts 2-page PDF (Page 1 = Front, Page 2 = Back) or single-page PDF
                  </span>
                </label>

                {detectedCardSizeMm && (
                  <div className="mt-3 p-2 bg-black/60 border border-brand-border flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Detected Source Size:</span>
                    <span className="text-brand-accent font-bold">
                      {detectedCardSizeMm.width} × {detectedCardSizeMm.height} mm
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Front Upload */}
                <label className="border border-dashed border-zinc-700 hover:border-brand-accent p-4 flex flex-col items-center text-center cursor-pointer bg-black/40">
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) handleFrontUpload(e.target.files[0]);
                    }}
                  />
                  <span className="text-[10px] font-bold text-brand-accent uppercase mb-1">FRONT SIDE</span>
                  <span className="text-[11px] text-white truncate max-w-full">
                    {frontFile ? frontFile.name : '+ Upload Front'}
                  </span>
                </label>

                {/* Back Upload */}
                <label className={`border border-dashed p-4 flex flex-col items-center text-center cursor-pointer bg-black/40 ${
                  isSingleSided ? 'opacity-40 border-zinc-800 pointer-events-none' : 'border-zinc-700 hover:border-brand-accent'
                }`}>
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    disabled={isSingleSided}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) handleBackUpload(e.target.files[0]);
                    }}
                  />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase mb-1">BACK SIDE</span>
                  <span className="text-[11px] text-white truncate max-w-full">
                    {backFile ? backFile.name : '+ Upload Back'}
                  </span>
                </label>
              </div>
            )}

            {/* Single-Sided Checkbox */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={isSingleSided}
                  onChange={(e) => setIsSingleSided(e.target.checked)}
                  className="rounded border-zinc-700 bg-black text-brand-accent focus:ring-0 w-3.5 h-3.5"
                />
                <span>Single-Sided Cards (Front only, no back sheet)</span>
              </label>

              {frontThumb && (
                <button
                  onClick={() => {
                    setSinglePdfFile(null);
                    setFrontFile(null);
                    setBackFile(null);
                    setFrontThumb(null);
                    setBackThumb(null);
                    setDetectedCardSizeMm(null);
                  }}
                  className="text-[10px] text-zinc-500 hover:text-rose-400 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {/* Thumbnail preview strip */}
            {(frontThumb || backThumb) && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-black p-2 border border-brand-border">
                  <div className="text-[9px] uppercase tracking-widest text-zinc-400 mb-1 flex justify-between">
                    <span>Front Artwork</span>
                    <span className="text-emerald-400">Loaded</span>
                  </div>
                  {frontThumb ? (
                    <div className="aspect-[85/55] bg-zinc-950 flex items-center justify-center overflow-hidden border border-zinc-800">
                      <img src={frontThumb} alt="Front Card" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="aspect-[85/55] bg-zinc-900/50 flex items-center justify-center text-[10px] text-zinc-600">
                      No Artwork
                    </div>
                  )}
                </div>

                <div className="bg-black p-2 border border-brand-border">
                  <div className="text-[9px] uppercase tracking-widest text-zinc-400 mb-1 flex justify-between">
                    <span>Back Artwork</span>
                    <span className={isSingleSided ? "text-zinc-600" : backThumb ? "text-emerald-400" : "text-amber-400"}>
                      {isSingleSided ? "Off" : backThumb ? "Loaded" : "Blank/Dup"}
                    </span>
                  </div>
                  {!isSingleSided && backThumb ? (
                    <div className="aspect-[85/55] bg-zinc-950 flex items-center justify-center overflow-hidden border border-zinc-800">
                      <img src={backThumb} alt="Back Card" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="aspect-[85/55] bg-zinc-900/50 flex items-center justify-center text-[10px] text-zinc-600">
                      {isSingleSided ? 'Single Sided' : 'No Back File'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Paper & Card Geometry Settings */}
          <div className="border border-brand-border bg-brand-surface p-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-brand-border pb-3">
              <Sliders className="w-4 h-4 text-brand-accent" />
              <span>2. Sheet & Card Dimensions</span>
            </span>

            {/* Target Paper Size */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex justify-between">
                <span>Target Paper Sheet</span>
                <span className="text-white font-mono">{paperDimMm.w} × {paperDimMm.h} mm</span>
              </label>
              <select
                value={selectedPaper}
                onChange={(e) => setSelectedPaper(e.target.value)}
                className="w-full bg-black border border-brand-border p-2 text-xs text-white uppercase tracking-wider outline-none cursor-pointer focus:border-brand-accent"
              >
                {PAPER_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {selectedPaper === 'CUSTOM' && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-800">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase">Sheet Width (mm)</label>
                    <input
                      type="number"
                      value={customPaperW}
                      onChange={(e) => setCustomPaperW(parseFloat(e.target.value) || 210)}
                      className="w-full bg-black border border-zinc-700 p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase">Sheet Height (mm)</label>
                    <input
                      type="number"
                      value={customPaperH}
                      onChange={(e) => setCustomPaperH(parseFloat(e.target.value) || 297)}
                      className="w-full bg-black border border-zinc-700 p-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Finished Card Cut Size */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex justify-between">
                <span>Finished Card Cut Size</span>
                <span className="text-brand-accent font-mono">{cardW} × {cardH} mm</span>
              </label>
              <select
                value={selectedCardSize}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCardSize(val);
                  if (val !== 'CUSTOM') {
                    const preset = CARD_PRESETS.find(p => p.id === val);
                    if (preset) {
                      setCardW(preset.widthMm);
                      setCardH(preset.heightMm);
                    }
                  }
                }}
                className="w-full bg-black border border-brand-border p-2 text-xs text-white uppercase tracking-wider outline-none cursor-pointer focus:border-brand-accent"
              >
                {CARD_PRESETS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.widthMm}×{c.heightMm}mm)
                  </option>
                ))}
              </select>

              {selectedCardSize === 'CUSTOM' && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-800">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase">Card Width (mm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={cardW}
                      onChange={(e) => setCardW(parseFloat(e.target.value) || 85)}
                      className="w-full bg-black border border-zinc-700 p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase">Card Height (mm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={cardH}
                      onChange={(e) => setCardH(parseFloat(e.target.value) || 55)}
                      className="w-full bg-black border border-zinc-700 p-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bleed Settings */}
            <div className="pt-2 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 block">
                    Target Bleed Allowance
                  </span>
                  <span className="text-[9px] text-zinc-500">Extra bleed printed past cut line</span>
                </div>
                <div className="flex items-center gap-1">
                  {[0, 1.5, 2.0, 3.0].map((b) => (
                    <button
                      key={b}
                      onClick={() => setTargetBleedMm(b)}
                      className={`px-2 py-1 text-[10px] border ${
                        targetBleedMm === b ? 'bg-brand-accent text-white border-brand-accent font-bold' : 'bg-black text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {b} mm
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[9px] text-zinc-400 uppercase tracking-wider block mb-1">
                    Sheet Margin (mm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="2"
                    max="30"
                    value={marginMm}
                    onChange={(e) => setMarginMm(parseFloat(e.target.value) || 5)}
                    className="w-full bg-black border border-zinc-700 p-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-400 uppercase tracking-wider block mb-1">
                    Card Gap Gutter
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setGapMode('auto')}
                      className={`flex-1 py-1.5 text-[9px] border ${
                        gapMode === 'auto' ? 'bg-brand-accent text-white border-brand-accent font-bold' : 'bg-black text-zinc-400 border-zinc-800'
                      }`}
                      title="Auto sets gap to 2 * bleed"
                    >
                      Auto ({imposition.gap.toFixed(1)}mm)
                    </button>
                    <button
                      onClick={() => setGapMode('custom')}
                      className={`px-2 py-1.5 text-[9px] border ${
                        gapMode === 'custom' ? 'bg-brand-accent text-white border-brand-accent font-bold' : 'bg-black text-zinc-400 border-zinc-800'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>
              </div>

              {gapMode === 'custom' && (
                <div className="pt-2">
                  <label className="text-[9px] text-zinc-500 uppercase">Custom Gap Between Cards (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={customGapMm}
                    onChange={(e) => setCustomGapMm(parseFloat(e.target.value) || 0)}
                    className="w-full bg-black border border-zinc-700 p-1.5 text-xs text-white mt-1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Orientation & Duplex Registration Rules */}
          <div className="border border-brand-border bg-brand-surface p-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-brand-border pb-3">
              <Layers className="w-4 h-4 text-brand-accent" />
              <span>3. Imposition & Duplex Alignment</span>
            </span>

            {/* Layout Orientation */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Card Rotation on Sheet
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setOrientationMode('auto')}
                  className={`py-2 px-2 text-[10px] uppercase font-bold border text-center transition-all ${
                    orientationMode === 'auto' ? 'bg-brand-accent text-white border-brand-accent shadow-md' : 'bg-black text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  Auto Yield ({imposition.isRotated ? '90°' : '0°'})
                </button>
                <button
                  onClick={() => setOrientationMode('unrotated')}
                  className={`py-2 px-2 text-[10px] uppercase font-bold border text-center transition-all ${
                    orientationMode === 'unrotated' ? 'bg-brand-accent text-white border-brand-accent shadow-md' : 'bg-black text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  Horizontal (0°)
                </button>
                <button
                  onClick={() => setOrientationMode('rotated')}
                  className={`py-2 px-2 text-[10px] uppercase font-bold border text-center transition-all ${
                    orientationMode === 'rotated' ? 'bg-brand-accent text-white border-brand-accent shadow-md' : 'bg-black text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  Rotated (90°)
                </button>
              </div>
            </div>

            {/* Duplex Flip Direction */}
            {!isSingleSided && (
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex justify-between">
                  <span>Duplex Printer Flip Mode</span>
                  <span className="text-brand-accent">
                    {duplexFlip === 'long' ? 'Flip on Long Edge (Standard)' : 'Flip on Short Edge (Turn Over)'}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDuplexFlip('long')}
                    className={`p-2.5 text-left border flex flex-col gap-1 transition-all ${
                      duplexFlip === 'long' ? 'bg-brand-accent/20 border-brand-accent text-white' : 'bg-black border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="text-[11px] font-bold uppercase flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-brand-accent" />
                      Long Edge (Default)
                    </span>
                    <span className="text-[9px] text-zinc-400 leading-tight">
                      Standard desktop & copier duplex. Back cards horizontally mirrored for head-to-head alignment.
                    </span>
                  </button>

                  <button
                    onClick={() => setDuplexFlip('short')}
                    className={`p-2.5 text-left border flex flex-col gap-1 transition-all ${
                      duplexFlip === 'short' ? 'bg-brand-accent/20 border-brand-accent text-white' : 'bg-black border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="text-[11px] font-bold uppercase flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-brand-accent rotate-90" />
                      Short Edge (Head-to-Toe)
                    </span>
                    <span className="text-[9px] text-zinc-400 leading-tight">
                      Calendar flip. Back cards vertically inverted for flip-over binding.
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Prepress Marks Toggles */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={drawCropMarks}
                  onChange={(e) => setDrawCropMarks(e.target.checked)}
                  className="rounded border-zinc-700 bg-black text-brand-accent focus:ring-0 w-3.5 h-3.5"
                />
                <span>Draw Hairline Crop / Trim Marks outside cut boundaries</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={drawSlug}
                  onChange={(e) => setDrawSlug(e.target.checked)}
                  className="rounded border-zinc-700 bg-black text-brand-accent focus:ring-0 w-3.5 h-3.5"
                />
                <span>Print Prepress Info Slug & Date in sheet margin</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={drawCenterMarks}
                  onChange={(e) => setDrawCenterMarks(e.target.checked)}
                  className="rounded border-zinc-700 bg-black text-brand-accent focus:ring-0 w-3.5 h-3.5"
                />
                <span>Include Center Crosshair Registration Targets</span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Prepress Sheet Canvas & Calculator (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* Key Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border border-brand-border bg-brand-surface p-3">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 block">CARDS PER SHEET</span>
              <div className="text-xl md:text-2xl font-black text-brand-accent mt-0.5">
                {imposition.count} <span className="text-xs text-zinc-400 font-normal">UP</span>
              </div>
              <span className="text-[10px] text-zinc-400">
                {imposition.cols} cols × {imposition.rows} rows
              </span>
            </div>

            <div className="border border-brand-border bg-brand-surface p-3">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 block">SHEET COVERAGE</span>
              <div className="text-xl md:text-2xl font-black text-white mt-0.5">
                {imposition.coverage.toFixed(1)}<span className="text-xs text-zinc-400">%</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">
                {imposition.coverage > 65 ? 'High Efficiency' : 'Standard Yield'}
              </span>
            </div>

            <div className="border border-brand-border bg-brand-surface p-3">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 block">BLEED ISOLATION</span>
              <div className="text-xl md:text-2xl font-black text-white mt-0.5">
                +{targetBleedMm}<span className="text-xs text-zinc-400">mm</span>
              </div>
              <span className="text-[10px] text-zinc-400">
                Gutter: {imposition.gap.toFixed(1)}mm
              </span>
            </div>

            <div className="border border-brand-border bg-brand-surface p-3">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 block">REGISTRATION</span>
              <div className="text-xl md:text-2xl font-black text-emerald-400 mt-0.5">
                100%
              </div>
              <span className="text-[10px] text-zinc-400">
                Center: {imposition.x0.toFixed(1)}×{imposition.y0.toFixed(1)}mm
              </span>
            </div>
          </div>

          {/* Interactive Sheet Preview Canvas */}
          <div className="border border-brand-border bg-brand-surface p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-accent" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Sheet Canvas Preview
                </span>
                <span className="text-[10px] text-zinc-400 bg-black px-2 py-0.5 border border-zinc-800">
                  {selectedPaper} ({paperDimMm.w} × {paperDimMm.h} mm)
                </span>
              </div>

              {/* View Switcher: Page 1 Front vs Page 2 Back */}
              <div className="flex items-center gap-2">
                {!isSingleSided && (
                  <div className="flex border border-brand-border bg-black p-0.5 text-[10px]">
                    <button
                      onClick={() => setPreviewSide('front')}
                      className={`px-3 py-1 uppercase font-bold transition-colors ${
                        previewSide === 'front' ? 'bg-brand-accent text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Front (Page 1)
                    </button>
                    <button
                      onClick={() => setPreviewSide('back')}
                      className={`px-3 py-1 uppercase font-bold transition-colors ${
                        previewSide === 'back' ? 'bg-brand-accent text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Back (Page 2)
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1 border border-zinc-800 bg-black p-0.5">
                  <button
                    onClick={() => setPreviewZoom(prev => Math.max(0.7, prev - 0.15))}
                    className="p-1 hover:text-brand-accent text-zinc-400"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[9px] px-1 text-zinc-400">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setPreviewZoom(prev => Math.min(1.8, prev + 0.15))}
                    className="p-1 hover:text-brand-accent text-zinc-400"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewZoom(1)}
                    className="p-1 hover:text-brand-accent text-zinc-400"
                    title="Reset Zoom"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Canvas Paper Container */}
            <div className="w-full bg-zinc-950/80 border border-zinc-800 p-4 md:p-8 flex items-center justify-center overflow-auto min-h-[480px]">
              <div 
                style={{ 
                  transform: `scale(${previewZoom})`, 
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out'
                }}
                className="relative shadow-2xl transition-all"
              >
                {/* Simulated Paper Sheet */}
                <div 
                  style={{
                    width: `${paperDimMm.w * 1.8}px`,
                    height: `${paperDimMm.h * 1.8}px`,
                  }}
                  className="bg-white text-black relative shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-zinc-400 select-none overflow-hidden"
                >
                  {/* Subtle Grid / Margins guideline */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${marginMm * 1.8}px`,
                      top: `${marginMm * 1.8}px`,
                      right: `${marginMm * 1.8}px`,
                      bottom: `${marginMm * 1.8}px`,
                      border: '1px dashed rgba(200, 200, 200, 0.7)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Slug text preview on sheet header */}
                  {drawSlug && (
                    <div 
                      style={{
                        position: 'absolute',
                        left: `${imposition.x0 * 1.8}px`,
                        top: '4px',
                        fontSize: '6px',
                        fontFamily: 'monospace',
                        color: '#666',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      CHAOSBOX • {previewSide === 'front' ? 'FRONT (PAGE 1)' : 'BACK (PAGE 2)'} • {selectedPaper} • {imposition.count}UP • {cardW}×{cardH}mm • DUPLEX: {duplexFlip.toUpperCase()}
                    </div>
                  )}

                  {/* Center Marks */}
                  {drawCenterMarks && (
                    <>
                      <div 
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '2px',
                          width: '1px',
                          height: '8px',
                          backgroundColor: '#000',
                          transform: 'translateX(-50%)',
                        }}
                      />
                      <div 
                        style={{
                          position: 'absolute',
                          left: '50%',
                          bottom: '2px',
                          width: '1px',
                          height: '8px',
                          backgroundColor: '#000',
                          transform: 'translateX(-50%)',
                        }}
                      />
                    </>
                  )}

                  {/* Card Imposition Grid Slots */}
                  {Array.from({ length: imposition.rows }).map((_, r) => {
                    return (
                      <div key={`row-${r}`}>
                        {Array.from({ length: imposition.cols }).map((_, c) => {
                          // Determine front vs back slot registration
                          let activeCol = c;
                          let activeRow = r;
                          if (previewSide === 'back' && !isSingleSided) {
                            if (duplexFlip === 'long') {
                              activeCol = imposition.cols - 1 - c;
                            } else {
                              activeRow = imposition.rows - 1 - r;
                            }
                          }

                          const slotLeft = (imposition.x0 + activeCol * (imposition.cellW + imposition.gap)) * 1.8;
                          const slotTop = (imposition.y0 + activeRow * (imposition.cellH + imposition.gap)) * 1.8;
                          const slotWidth = imposition.cellW * 1.8;
                          const slotHeight = imposition.cellH * 1.8;
                          const bleedPx = targetBleedMm * 1.8;

                          const cardIndex = r * imposition.cols + c + 1;
                          const activeThumb = previewSide === 'front' 
                            ? frontThumb 
                            : (backThumb || frontThumb);

                          const rotAngle = previewSide === 'front'
                            ? (imposition.isRotated ? 90 : 0)
                            : (imposition.isRotated ? (duplexFlip === 'long' ? 270 : 90) : (duplexFlip === 'long' ? 0 : 180));

                          const isRotatedAngle = rotAngle === 90 || rotAngle === 270;

                          return (
                            <div
                              key={`cell-${r}-${c}`}
                              style={{
                                position: 'absolute',
                                left: `${slotLeft}px`,
                                top: `${slotTop}px`,
                                width: `${slotWidth}px`,
                                height: `${slotHeight}px`,
                              }}
                              className="group relative cursor-default"
                            >
                              {/* Outer Bleed Zone Border (shows extra bleed printed beyond cut line) */}
                              {targetBleedMm > 0 && (
                                <div className="absolute inset-0 border border-dashed border-red-500/60 bg-red-500/5 pointer-events-none z-10" />
                              )}

                              {/* Card Artwork Container - Fills the entire bleed-allowance slot */}
                              <div className="absolute inset-0 bg-white overflow-hidden shadow-sm flex items-center justify-center">
                                {activeThumb ? (
                                  <img
                                    src={activeThumb}
                                    alt="Card thumbnail"
                                    style={{
                                      position: 'absolute',
                                      left: '50%',
                                      top: '50%',
                                      width: isRotatedAngle ? `${slotHeight}px` : `${slotWidth}px`,
                                      height: isRotatedAngle ? `${slotWidth}px` : `${slotHeight}px`,
                                      transform: `translate(-50%, -50%) rotate(${rotAngle}deg)`,
                                      transformOrigin: 'center center',
                                      maxWidth: 'none',
                                      maxHeight: 'none',
                                      objectFit: 'fill',
                                    }}
                                    className="select-none pointer-events-none"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-1 text-center">
                                    <span className="text-[8px] font-bold text-zinc-400">
                                      #{cardIndex}
                                    </span>
                                    <span className="text-[7px] text-zinc-500 uppercase">
                                      {previewSide === 'front' ? 'Front' : 'Back'}
                                    </span>
                                  </div>
                                )}

                                {/* Trim Box (Cut boundary outline in vibrant purple showing exact card cut) */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: `${bleedPx}px`,
                                    top: `${bleedPx}px`,
                                    right: `${bleedPx}px`,
                                    bottom: `${bleedPx}px`,
                                    border: '1.5px solid rgba(183, 0, 255, 0.85)',
                                    pointerEvents: 'none',
                                  }}
                                >
                                  {/* Slot number badge inside the trim safe area */}
                                  <div className="absolute top-0.5 left-0.5 bg-black/80 text-white text-[6px] px-1 py-0.2 font-mono font-bold leading-none pointer-events-none">
                                    #{cardIndex}
                                  </div>
                                </div>
                              </div>

                              {/* Hairline Crop Marks outside each card boundary */}
                              {drawCropMarks && (
                                <>
                                  {/* Top Left vertical */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${bleedPx}px`,
                                      top: `${bleedPx - 6}px`,
                                      width: '1px',
                                      height: '5px',
                                      backgroundColor: '#000',
                                    }}
                                  />
                                  {/* Top Left horizontal */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${bleedPx - 6}px`,
                                      top: `${bleedPx}px`,
                                      width: '5px',
                                      height: '1px',
                                      backgroundColor: '#000',
                                    }}
                                  />
                                  {/* Top Right vertical */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      right: `${bleedPx}px`,
                                      top: `${bleedPx - 6}px`,
                                      width: '1px',
                                      height: '5px',
                                      backgroundColor: '#000',
                                    }}
                                  />
                                  {/* Top Right horizontal */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      right: `${bleedPx - 6}px`,
                                      top: `${bleedPx}px`,
                                      width: '5px',
                                      height: '1px',
                                      backgroundColor: '#000',
                                    }}
                                  />
                                  {/* Bottom Left vertical */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${bleedPx}px`,
                                      bottom: `${bleedPx - 6}px`,
                                      width: '1px',
                                      height: '5px',
                                      backgroundColor: '#000',
                                    }}
                                  />
                                  {/* Bottom Left horizontal */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${bleedPx - 6}px`,
                                      bottom: `${bleedPx}px`,
                                      width: '5px',
                                      height: '1px',
                                      backgroundColor: '#000',
                                    }}
                                  />
                                  {/* Bottom Right vertical */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      right: `${bleedPx}px`,
                                      bottom: `${bleedPx - 6}px`,
                                      width: '1px',
                                      height: '5px',
                                      backgroundColor: '#000',
                                    }}
                                  />
                                  {/* Bottom Right horizontal */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      right: `${bleedPx - 6}px`,
                                      bottom: `${bleedPx}px`,
                                      width: '5px',
                                      height: '1px',
                                      backgroundColor: '#000',
                                    }}
                                  />
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Canvas Legend */}
            <div className="flex flex-wrap items-center justify-between text-[10px] text-zinc-400 gap-2 pt-2 border-t border-zinc-800">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 border border-brand-accent bg-purple-500/20 inline-block" />
                  Cut / Trim Line ({cardW} × {cardH} mm)
                </span>
                {targetBleedMm > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border border-red-500 bg-red-500/20 inline-block" />
                    +{targetBleedMm}mm Bleed Zone
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-black inline-block" />
                  Hairline Crop Marks
                </span>
              </div>
              <span className="text-zinc-500">
                Grid: {imposition.gridW.toFixed(1)} × {imposition.gridH.toFixed(1)} mm
              </span>
            </div>
          </div>

          {/* Print Run Estimator & Prepress Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Print Run Calculator */}
            <div className="border border-brand-border bg-brand-surface p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-brand-accent" />
                <span>Print Run Calculator</span>
              </span>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
                    Total Cards Needed
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="10"
                    value={printRunCount}
                    onChange={(e) => setPrintRunCount(parseInt(e.target.value) || 250)}
                    className="w-full bg-black border border-zinc-700 p-2 text-sm text-white font-bold"
                  />
                </div>
                <div className="flex gap-1 pt-4">
                  {[100, 250, 500, 1000].map(cnt => (
                    <button
                      key={cnt}
                      onClick={() => setPrintRunCount(cnt)}
                      className={`px-2 py-1.5 text-[10px] border ${
                        printRunCount === cnt ? 'bg-brand-accent text-white border-brand-accent font-bold' : 'bg-black text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-1 text-xs border-t border-zinc-800">
                <div className="flex justify-between text-zinc-300">
                  <span>Exact Sheets Needed:</span>
                  <span className="font-bold text-white font-mono">{requiredSheets} {selectedPaper} sheets</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>With +5% Waste Allowance:</span>
                  <span className="font-bold text-brand-accent font-mono">{recommendedSheets} sheets</span>
                </div>
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Guillotine Cuts per Stack:</span>
                  <span className="text-white font-mono">
                    {imposition.cols * 2 + imposition.rows * 2} trim cuts
                  </span>
                </div>
              </div>
            </div>

            {/* Print Shop Guidelines */}
            <div className="border border-brand-border bg-brand-surface p-4 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Press Production Guidelines</span>
              </span>

              <div className="space-y-2 text-[11px] text-zinc-300">
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    <strong>Scale 100% / Actual Size:</strong> Never select "Fit to printable area" or "Shrink to fit" in your print dialog.
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    <strong>Duplex Setting:</strong> Set your printer driver to <strong>{duplexFlip === 'long' ? 'Flip on Long Edge' : 'Flip on Short Edge'}</strong>.
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    <strong>Stock Weight:</strong> Recommended paper weight is <strong>300 - 350 GSM</strong> heavy uncoated or silk cardstock.
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    <strong>Sub-mm Registration:</strong> Both front and back grids are centered identically on the sheet geometry.
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
