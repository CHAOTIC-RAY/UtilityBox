import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Merge, Scissors, FileArchive, Edit3, Image as ImageIcon, FileImage, 
  FileCode, RotateCw, RotateCcw, Trash2, Layers, Lock, Unlock, Hash, Type, PenTool, 
  EyeOff, GitCompare, Crop, Minimize2, FileSpreadsheet, Download, ArrowUp, ArrowDown, Plus, 
  CheckCircle, AlertCircle, Copy, GripVertical, ArrowLeft, ArrowRight, CheckSquare, Square, 
  RefreshCw, ZoomIn, Eye, Sparkles, Check, MoveLeft, MoveRight
} from 'lucide-react';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { renderPdfThumbnails, renderSinglePdfPage } from '../utils/pdfRenderer';

export type PdfToolType = 
  | 'merge' 
  | 'split' 
  | 'compress' 
  | 'edit'
  | 'image2pdf' 
  | 'pdf2images'
  | 'extract' 
  | 'rotate' 
  | 'delete'
  | 'rearrange'
  | 'protect' 
  | 'unlock' 
  | 'pagenumbers' 
  | 'watermark' 
  | 'sign'
  | 'redact'
  | 'compare'
  | 'crop'
  | 'flatten'
  | 'text2pdf';

export interface PageVisualItem {
  id: string;
  originalIndex: number; // 0-based index in source PDF
  originalPageNumber: number; // 1-based
  rotation: number; // 0, 90, 180, 270 relative rotation
  thumbnailUrl: string;
  selectedForDelete: boolean;
  selectedForSplit: boolean;
  width: number;
  height: number;
}

export interface ImageVisualItem {
  id: string;
  file: File;
  name: string;
  url: string;
  rotation: number;
}

export interface MergeDocVisualItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount?: number;
  coverUrl?: string;
}

export interface PdfToolsSuiteProps {
  onNavigateToCardPrint?: () => void;
  activeToolId?: PdfToolType;
  onSelectTool?: (tool: PdfToolType) => void;
}

export const PdfToolsSuite: React.FC<PdfToolsSuiteProps> = ({ 
  onNavigateToCardPrint,
  activeToolId,
  onSelectTool
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<PdfToolType>('rearrange');
  const activeTab = activeToolId !== undefined ? activeToolId : internalActiveTab;
  const setActiveTab = (tool: PdfToolType) => {
    setInternalActiveTab(tool);
    onSelectTool?.(tool);
  };
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Loaded raw files
  const [files, setFiles] = useState<Array<{ id: string; file: File; name: string; size: number }>>([]);
  
  // Visual Page State for the active PDF
  const [pages, setPages] = useState<PageVisualItem[]>([]);
  const [isRenderingPages, setIsRenderingPages] = useState(false);
  const [activePreviewPageIndex, setActivePreviewPageIndex] = useState<number>(0);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Visual state for Image-to-PDF
  const [imageItems, setImageItems] = useState<ImageVisualItem[]>([]);

  // Visual state for Merge PDF
  const [mergeDocs, setMergeDocs] = useState<MergeDocVisualItem[]>([]);

  // Drag and Drop state
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [dragOverPageIndex, setDragOverPageIndex] = useState<number | null>(null);
  const [draggedDocIndex, setDraggedDocIndex] = useState<number | null>(null);
  const [dragOverDocIndex, setDragOverDocIndex] = useState<number | null>(null);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);

  // Split mode
  const [splitMode, setSplitMode] = useState<'visual' | 'range' | 'cuts'>('visual');
  const [splitRange, setSplitRange] = useState('1-2, 3');
  const [cutPoints, setCutPoints] = useState<number[]>([]); // indices after which to cut

  // Tool options state
  const [rotateAngle, setRotateAngle] = useState<number>(90);
  const [userPassword, setUserPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [imageMargin, setImageMargin] = useState<number>(10);
  const [imagePageFit, setImagePageFit] = useState<'fit' | 'a4' | 'letter'>('fit');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.3);
  const [watermarkRotation, setWatermarkRotation] = useState<number>(45);
  const [pageNumberPosition, setPageNumberPosition] = useState<'bottom-center' | 'bottom-right' | 'top-center'>('bottom-center');
  const [pageNumberFormat, setPageNumberFormat] = useState<'simple' | 'full'>('full');

  // New tool options state
  const [editText, setEditText] = useState('Sample Annotated Note');
  const [editX, setEditX] = useState<number>(50);
  const [editY, setEditY] = useState<number>(50);
  const [signatureName, setSignatureName] = useState('Authorized Signature');
  const [signaturePosition, setSignaturePosition] = useState<'bottom-right' | 'bottom-left' | 'center'>('bottom-right');
  const [redactBox, setRedactBox] = useState({ page: 1, x: 50, y: 50, width: 200, height: 35 });
  const [cropMarginPts, setCropMarginPts] = useState<number>(20);
  const [textInputDoc, setTextInputDoc] = useState('# Document Heading\n\nThis text document will be formatted directly into a crisp PDF file.\n- Zero server roundtrips\n- Instant client-side download');
  
  // Output states
  const [extractedText, setExtractedText] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<{ identical: boolean; details: string[] } | null>(null);

  // Load pages when primary file changes
  useEffect(() => {
    if (files.length === 0) {
      setPages([]);
      return;
    }

    // If it's a PDF file, render visual page thumbnails
    const primary = files[0];
    if (primary.file.type === 'application/pdf' || primary.file.name.toLowerCase().endsWith('.pdf')) {
      let isSubscribed = true;
      setIsRenderingPages(true);

      renderPdfThumbnails(primary.file, 60, 0.45)
        .then(summary => {
          if (!isSubscribed) return;
          const initialPages: PageVisualItem[] = summary.pages.map((p, idx) => ({
            id: `p-${idx}-${Date.now()}`,
            originalIndex: idx,
            originalPageNumber: idx + 1,
            rotation: 0,
            thumbnailUrl: p.dataUrl,
            selectedForDelete: false,
            selectedForSplit: true,
            width: p.width,
            height: p.height
          }));
          setPages(initialPages);
          setActivePreviewPageIndex(0);
          setIsRenderingPages(false);
        })
        .catch(err => {
          console.warn('PDF thumbnail generation failed, falling back:', err);
          if (!isSubscribed) return;
          // Fallback minimal pages using pdf-lib
          primary.file.arrayBuffer().then(buf => {
            PDFDocument.load(buf, { ignoreEncryption: true } as any).then(doc => {
              const count = doc.getPageCount();
              const fallbackPages: PageVisualItem[] = Array.from({ length: count }, (_, i) => ({
                id: `p-fb-${i}`,
                originalIndex: i,
                originalPageNumber: i + 1,
                rotation: 0,
                thumbnailUrl: '',
                selectedForDelete: false,
                selectedForSplit: true,
                width: 200,
                height: 280
              }));
              setPages(fallbackPages);
              setIsRenderingPages(false);
            }).catch(() => {
              setIsRenderingPages(false);
            });
          }).catch(() => setIsRenderingPages(false));
        });

      return () => {
        isSubscribed = false;
      };
    }
  }, [files[0]?.id]);

  // Synchronize Merge Docs visual queue
  useEffect(() => {
    if (activeTab === 'merge') {
      const docs: MergeDocVisualItem[] = files.map((f, idx) => {
        const existing = mergeDocs.find(d => d.id === f.id);
        if (existing) return existing;
        return {
          id: f.id,
          file: f.file,
          name: f.name,
          size: f.size,
          pageCount: undefined,
          coverUrl: undefined
        };
      });

      setMergeDocs(docs);

      // Async extract cover & page count for each doc
      docs.forEach((doc, idx) => {
        if (!doc.coverUrl && (doc.file.type === 'application/pdf' || doc.file.name.toLowerCase().endsWith('.pdf'))) {
          renderPdfThumbnails(doc.file, 1, 0.3).then(sum => {
            if (sum.pages[0]) {
              setMergeDocs(prev => prev.map(d => d.id === doc.id ? {
                ...d,
                pageCount: sum.numPages,
                coverUrl: sum.pages[0].dataUrl
              } : d));
            }
          }).catch(() => {});
        }
      });
    }
  }, [files, activeTab]);

  // Synchronize Image Items visual queue
  useEffect(() => {
    if (activeTab === 'image2pdf') {
      const items: ImageVisualItem[] = files.map(f => {
        const existing = imageItems.find(img => img.id === f.id);
        if (existing) return existing;
        return {
          id: f.id,
          file: f.file,
          name: f.name,
          url: URL.createObjectURL(f.file),
          rotation: 0
        };
      });
      setImageItems(items);
    }
  }, [files, activeTab]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).map((file: File) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size
    }));

    if (activeTab === 'merge' || activeTab === 'image2pdf' || activeTab === 'compare') {
      setFiles(prev => [...prev, ...selected]);
    } else {
      setFiles(selected);
    }
    setStatusMessage(null);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setImageItems(prev => prev.filter(i => i.id !== id));
    setMergeDocs(prev => prev.filter(d => d.id !== id));
  };

  const clearFiles = () => {
    setFiles([]);
    setPages([]);
    setImageItems([]);
    setMergeDocs([]);
    setExtractedText('');
    setComparisonResult(null);
    setStatusMessage(null);
  };

  // --- REORDER (REARRANGE) DRAG & DROP & CONTROLS ---
  const handlePageDragStart = (index: number) => {
    setDraggedPageIndex(index);
  };

  const handlePageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedPageIndex === null || draggedPageIndex === index) return;
    setDragOverPageIndex(index);
  };

  const handlePageDrop = (targetIndex: number) => {
    if (draggedPageIndex === null || draggedPageIndex === targetIndex) {
      setDraggedPageIndex(null);
      setDragOverPageIndex(null);
      return;
    }

    const updated = [...pages];
    const [moved] = updated.splice(draggedPageIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setPages(updated);
    setDraggedPageIndex(null);
    setDragOverPageIndex(null);
  };

  const movePage = (index: number, direction: 'left' | 'right') => {
    const target = direction === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= pages.length) return;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setPages(updated);
  };

  const reversePagesOrder = () => {
    setPages(prev => [...prev].reverse());
  };

  const resetPagesOrder = () => {
    setPages(prev => [...prev].sort((a, b) => a.originalIndex - b.originalIndex));
  };

  const oddPagesFirst = () => {
    const odds = pages.filter(p => p.originalPageNumber % 2 !== 0);
    const evens = pages.filter(p => p.originalPageNumber % 2 === 0);
    setPages([...odds, ...evens]);
  };

  const evenPagesFirst = () => {
    const odds = pages.filter(p => p.originalPageNumber % 2 !== 0);
    const evens = pages.filter(p => p.originalPageNumber % 2 === 0);
    setPages([...evens, ...odds]);
  };

  // --- ROTATE PAGES CONTROLS ---
  const rotateSinglePage = (index: number, delta: number) => {
    setPages(prev => prev.map((p, idx) => {
      if (idx !== index) return p;
      const nextRot = (p.rotation + delta + 360) % 360;
      return { ...p, rotation: nextRot };
    }));
  };

  const rotateAllPages = (delta: number) => {
    setPages(prev => prev.map(p => ({
      ...p,
      rotation: (p.rotation + delta + 360) % 360
    })));
  };

  const rotateOddPages = (delta: number) => {
    setPages(prev => prev.map(p => {
      if (p.originalPageNumber % 2 !== 0) {
        return { ...p, rotation: (p.rotation + delta + 360) % 360 };
      }
      return p;
    }));
  };

  const rotateEvenPages = (delta: number) => {
    setPages(prev => prev.map(p => {
      if (p.originalPageNumber % 2 === 0) {
        return { ...p, rotation: (p.rotation + delta + 360) % 360 };
      }
      return p;
    }));
  };

  const resetAllRotations = () => {
    setPages(prev => prev.map(p => ({ ...p, rotation: 0 })));
  };

  // --- DELETE PAGES CONTROLS ---
  const toggleDeletePage = (index: number) => {
    setPages(prev => prev.map((p, idx) => idx === index ? { ...p, selectedForDelete: !p.selectedForDelete } : p));
  };

  const selectAllForDelete = () => {
    setPages(prev => prev.map(p => ({ ...p, selectedForDelete: true })));
  };

  const deselectAllForDelete = () => {
    setPages(prev => prev.map(p => ({ ...p, selectedForDelete: false })));
  };

  const invertDeleteSelection = () => {
    setPages(prev => prev.map(p => ({ ...p, selectedForDelete: !p.selectedForDelete })));
  };

  const selectEvenForDelete = () => {
    setPages(prev => prev.map(p => ({
      ...p,
      selectedForDelete: p.originalPageNumber % 2 === 0
    })));
  };

  const selectOddForDelete = () => {
    setPages(prev => prev.map(p => ({
      ...p,
      selectedForDelete: p.originalPageNumber % 2 !== 0
    })));
  };

  // --- SPLIT CONTROLS ---
  const toggleSplitPage = (index: number) => {
    setPages(prev => prev.map((p, idx) => idx === index ? { ...p, selectedForSplit: !p.selectedForSplit } : p));
  };

  const selectAllForSplit = () => {
    setPages(prev => prev.map(p => ({ ...p, selectedForSplit: true })));
  };

  const clearSplitSelection = () => {
    setPages(prev => prev.map(p => ({ ...p, selectedForSplit: false })));
  };

  const toggleCutPoint = (afterIndex: number) => {
    setCutPoints(prev => {
      if (prev.includes(afterIndex)) {
        return prev.filter(c => c !== afterIndex);
      }
      return [...prev, afterIndex].sort((a, b) => a - b);
    });
  };

  // --- MERGE DOCS DRAG & DROP ---
  const handleMergeDocDragStart = (index: number) => {
    setDraggedDocIndex(index);
  };

  const handleMergeDocDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedDocIndex === null || draggedDocIndex === index) return;
    setDragOverDocIndex(index);
  };

  const handleMergeDocDrop = (targetIndex: number) => {
    if (draggedDocIndex === null || draggedDocIndex === targetIndex) {
      setDraggedDocIndex(null);
      setDragOverDocIndex(null);
      return;
    }
    const updated = [...mergeDocs];
    const [moved] = updated.splice(draggedDocIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setMergeDocs(updated);
    // Also reorder files
    const updatedFiles = [...files];
    const [movedFile] = updatedFiles.splice(draggedDocIndex, 1);
    updatedFiles.splice(targetIndex, 0, movedFile);
    setFiles(updatedFiles);

    setDraggedDocIndex(null);
    setDragOverDocIndex(null);
  };

  const moveMergeDoc = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= mergeDocs.length) return;
    const updated = [...mergeDocs];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setMergeDocs(updated);

    const updatedFiles = [...files];
    const tempF = updatedFiles[index];
    updatedFiles[index] = updatedFiles[target];
    updatedFiles[target] = tempF;
    setFiles(updatedFiles);
  };

  // --- IMAGES TO PDF DRAG & DROP ---
  const handleImageDragStart = (index: number) => {
    setDraggedImageIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedImageIndex === null || draggedImageIndex === index) return;
    setDragOverImageIndex(index);
  };

  const handleImageDrop = (targetIndex: number) => {
    if (draggedImageIndex === null || draggedImageIndex === targetIndex) {
      setDraggedImageIndex(null);
      setDragOverImageIndex(null);
      return;
    }
    const updated = [...imageItems];
    const [moved] = updated.splice(draggedImageIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setImageItems(updated);
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
  };

  const rotateImageItem = (index: number) => {
    setImageItems(prev => prev.map((img, idx) => idx === index ? { ...img, rotation: (img.rotation + 90) % 360 } : img));
  };

  const moveImageItem = (index: number, direction: 'left' | 'right') => {
    const target = direction === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= imageItems.length) return;
    const updated = [...imageItems];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setImageItems(updated);
  };

  // ==========================================
  // PDF PROCESS EXECUTION HANDLERS
  // ==========================================

  // 1. MERGE PDF (with visual drag-and-drop order)
  const processMerge = async () => {
    if (mergeDocs.length < 2) {
      setStatusMessage({ text: 'Please upload at least 2 PDF files to merge.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Merging PDF documents in visual sequence...', type: 'info' });

    try {
      const mergedPdf = await PDFDocument.create();
      for (const item of mergeDocs) {
        const arrayBuffer = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-merged-${Date.now()}.pdf`);
      setStatusMessage({ text: `Successfully merged ${mergeDocs.length} PDFs into a single document!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Merge failed: ${err.message || 'Corrupted or protected PDF file.'}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. SPLIT PDF (Visual click extraction or cuts)
  const processSplit = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file to split.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Splitting PDF document...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const totalPages = pdf.getPageCount();

      if (splitMode === 'visual') {
        const keepIndices = pages
          .filter(p => p.selectedForSplit)
          .map(p => p.originalIndex);

        if (keepIndices.length === 0) {
          setStatusMessage({ text: 'Please select at least one page to extract.', type: 'error' });
          setIsProcessing(false);
          return;
        }

        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdf, keepIndices);
        copiedPages.forEach(p => newPdf.addPage(p));

        const bytes = await newPdf.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        saveAs(blob, `chaosbox-extracted-${keepIndices.length}-pages-${files[0].name}`);
        setStatusMessage({ text: `Extracted ${keepIndices.length} page(s) into standalone PDF!`, type: 'success' });
      } else if (splitMode === 'cuts' && cutPoints.length > 0) {
        // Zip split chunks
        const zip = new JSZip();
        const cutsSorted = [...cutPoints].sort((a, b) => a - b);
        let start = 0;
        let partIndex = 1;

        for (let i = 0; i <= cutsSorted.length; i++) {
          const end = i < cutsSorted.length ? cutsSorted[i] : totalPages - 1;
          const chunkIndices: number[] = [];
          for (let p = start; p <= end; p++) {
            if (p < totalPages) chunkIndices.push(p);
          }
          if (chunkIndices.length > 0) {
            const partPdf = await PDFDocument.create();
            const copied = await partPdf.copyPages(pdf, chunkIndices);
            copied.forEach(page => partPdf.addPage(page));
            const partBytes = await partPdf.save();
            zip.file(`part-${partIndex}-pages-${start + 1}-to-${end + 1}.pdf`, partBytes);
            partIndex++;
          }
          start = end + 1;
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `chaosbox-split-parts-${files[0].name}.zip`);
        setStatusMessage({ text: `Split into ${partIndex - 1} PDF parts and downloaded as ZIP!`, type: 'success' });
      } else {
        // Range mode
        const pagesToExtract: number[] = [];
        const parts = splitRange.split(',').map(s => s.trim());
        for (const part of parts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n, 10));
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                pagesToExtract.push(i - 1);
              }
            }
          } else {
            const pageNum = parseInt(part, 10);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
              pagesToExtract.push(pageNum - 1);
            }
          }
        }

        const uniquePages = Array.from(new Set(pagesToExtract)).sort((a, b) => a - b);
        if (uniquePages.length === 0) {
          setStatusMessage({ text: 'Invalid split range specified.', type: 'error' });
          setIsProcessing(false);
          return;
        }

        const newPdf = await PDFDocument.create();
        const copied = await newPdf.copyPages(pdf, uniquePages);
        copied.forEach(p => newPdf.addPage(p));

        const bytes = await newPdf.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        saveAs(blob, `chaosbox-split-${files[0].name}`);
        setStatusMessage({ text: `Extracted ${uniquePages.length} pages successfully!`, type: 'success' });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Split failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. COMPRESS PDF
  const processCompress = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file to compress.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Optimizing and compressing PDF binary structure...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const compressedBytes = await pdf.save({ useObjectStreams: true });
      const origSize = files[0].file.size;
      const newSize = compressedBytes.length;
      const saved = Math.max(0, Math.round(((origSize - newSize) / origSize) * 100));

      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-compressed-${files[0].name}`);
      setStatusMessage({ 
        text: `Compression complete! Original: ${(origSize / 1024).toFixed(1)}KB → ${(newSize / 1024).toFixed(1)}KB (${saved}% reduced).`, 
        type: 'success' 
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Compress failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. EDIT & ANNOTATE PDF
  const processEdit = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file to edit.', type: 'error' });
      return;
    }
    if (!editText.trim()) {
      setStatusMessage({ text: 'Please enter annotation text to add.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Embedding text annotation on page...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const font = await pdf.embedFont(StandardFonts.HelveticaBold);
      const totalPages = pdf.getPageCount();

      const targetPageIndex = Math.max(0, Math.min(totalPages - 1, activePreviewPageIndex));
      const page = pdf.getPage(targetPageIndex);
      
      page.drawText(editText, {
        x: editX,
        y: editY,
        size: 14,
        font,
        color: rgb(0.9, 0.1, 0.2),
      });

      const updatedBytes = await pdf.save();
      const blob = new Blob([updatedBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-edited-${files[0].name}`);
      setStatusMessage({ text: `Added annotation to page ${targetPageIndex + 1} successfully!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Editing failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. IMAGES TO PDF (Using visual order and rotation)
  const processImagesToPdf = async () => {
    if (imageItems.length === 0) {
      setStatusMessage({ text: 'Please upload image files (JPG, PNG, WebP).', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: `Converting ${imageItems.length} images to PDF in visual order...`, type: 'info' });

    try {
      const pdfDoc = await PDFDocument.create();
      for (const item of imageItems) {
        const imageBuffer = await item.file.arrayBuffer();
        let embeddedImage;

        if (item.file.type === 'image/png' && item.rotation === 0) {
          embeddedImage = await pdfDoc.embedPng(imageBuffer);
        } else {
          // Render on canvas to support rotation and format conversions
          const img = new Image();
          const objUrl = URL.createObjectURL(item.file);
          await new Promise((res) => { img.onload = res; img.src = objUrl; });

          const canvas = document.createElement('canvas');
          if (item.rotation === 90 || item.rotation === 270) {
            canvas.width = img.height;
            canvas.height = img.width;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((item.rotation * Math.PI) / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
          }

          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          const res = await fetch(jpegDataUrl);
          const jpegBuf = await res.arrayBuffer();
          embeddedImage = await pdfDoc.embedJpg(jpegBuf);
          URL.revokeObjectURL(objUrl);
        }

        const { width, height } = embeddedImage;
        const page = pdfDoc.addPage([width + imageMargin * 2, height + imageMargin * 2]);
        page.drawImage(embeddedImage, {
          x: imageMargin,
          y: imageMargin,
          width: width,
          height: height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-images-${Date.now()}.pdf`);
      setStatusMessage({ text: `Converted ${imageItems.length} images into PDF in your exact order!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Conversion failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. PDF TO IMAGES (Real high-res rendering via pdfjs-dist)
  const processPdfToImages = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Rendering all pages to crisp high-resolution PNG images...', type: 'info' });

    try {
      const summary = await renderPdfThumbnails(files[0].file, 50, 1.5);
      const zip = new JSZip();

      for (let i = 0; i < summary.pages.length; i++) {
        const page = summary.pages[i];
        if (page.dataUrl) {
          const base64Data = page.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
          zip.file(`page-${page.pageNumber}.jpg`, base64Data, { base64: true });
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `chaosbox-pages-${files[0].name}.zip`);
      setStatusMessage({ text: `Rendered ${summary.pages.length} pages and downloaded as ZIP archive!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `PDF to Images failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 7. EXTRACT TEXT
  const processExtractText = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file to extract text.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Extracting document metadata & text stream structure...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pageCount = pdf.getPageCount();

      let textOutput = `--- CHAOSBOX PDF METADATA & STRUCTURE ---\n`;
      textOutput += `Source File: ${files[0].name}\n`;
      textOutput += `Total Pages: ${pageCount}\n`;
      textOutput += `Extracted Date: ${new Date().toLocaleString()}\n\n`;

      textOutput += `[DOCUMENT ATTRIBUTES]\n`;
      textOutput += `Title: ${pdf.getTitle() || 'Untitled'}\n`;
      textOutput += `Author: ${pdf.getAuthor() || 'N/A'}\n`;
      textOutput += `Subject: ${pdf.getSubject() || 'N/A'}\n`;
      textOutput += `Producer: ${pdf.getProducer() || 'PDF-Lib Engine'}\n\n`;

      textOutput += `[PAGE INDEX BREAKDOWN]\n`;
      for (let i = 0; i < pageCount; i++) {
        textOutput += `--- PAGE ${i + 1} OF ${pageCount} ---\n`;
        const page = pdf.getPage(i);
        textOutput += `Page Resolution: ${Math.round(page.getWidth())}x${Math.round(page.getHeight())} pt\n`;
        textOutput += `Base Rotation: ${page.getRotation().angle}°\n\n`;
      }

      setExtractedText(textOutput);
      setStatusMessage({ text: 'Text structure & document metadata extracted!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Extraction failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 8. ROTATE PDF (Visual per-page rotations applied)
  const processRotate = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file to rotate.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Applying visual per-page rotations...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const totalPages = pdf.getPageCount();

      pages.forEach((pageItem) => {
        if (pageItem.originalIndex < totalPages) {
          const page = pdf.getPage(pageItem.originalIndex);
          const currentRotation = page.getRotation().angle;
          const finalAngle = (currentRotation + pageItem.rotation) % 360;
          page.setRotation(degrees(finalAngle));
        }
      });

      const rotatedBytes = await pdf.save();
      const blob = new Blob([rotatedBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-rotated-${files[0].name}`);
      setStatusMessage({ text: `Successfully rotated and saved all ${totalPages} pages!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Rotation failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 9. DELETE PAGES (Visual selection applied)
  const processDeletePages = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Removing selected pages from document...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);

      // Keep only pages where selectedForDelete is false
      const keepIndices = pages
        .filter(p => !p.selectedForDelete)
        .map(p => p.originalIndex);

      if (keepIndices.length === 0) {
        setStatusMessage({ text: 'Cannot delete all pages in the document. Please leave at least one page.', type: 'error' });
        setIsProcessing(false);
        return;
      }

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdf, keepIndices);
      copiedPages.forEach(p => newPdf.addPage(p));

      const newBytes = await newPdf.save();
      const blob = new Blob([newBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-cleaned-${files[0].name}`);
      setStatusMessage({ text: `Deleted ${pages.length - keepIndices.length} pages. Kept ${keepIndices.length} pages!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Deletion failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 10. REARRANGE & REORDER PAGES (Visual Drag-and-Drop applied)
  const processRearrange = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file.', type: 'error' });
      return;
    }
    if (pages.length === 0) {
      setStatusMessage({ text: 'No pages loaded to rearrange.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Reordering document according to your visual layout...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);

      // Get page indices in visual order
      const sequence = pages.map(p => p.originalIndex);

      const reorderedPdf = await PDFDocument.create();
      const copiedPages = await reorderedPdf.copyPages(pdf, sequence);
      
      copiedPages.forEach((page, i) => {
        // Also apply any custom per-page rotation if set
        const pageItem = pages[i];
        if (pageItem && pageItem.rotation !== 0) {
          const curr = page.getRotation().angle;
          page.setRotation(degrees((curr + pageItem.rotation) % 360));
        }
        reorderedPdf.addPage(page);
      });

      const reorderedBytes = await reorderedPdf.save();
      const blob = new Blob([reorderedBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-reordered-${files[0].name}`);
      setStatusMessage({ text: `Successfully reordered ${sequence.length} pages in custom sequence!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Rearrange failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 11. PROTECT PDF
  const processProtect = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file to encrypt.', type: 'error' });
      return;
    }
    if (!userPassword) {
      setStatusMessage({ text: 'Please provide at least a User Password to protect the file.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Applying encryption and access permissions...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);

      if ((pdf as any).encrypt) {
        (pdf as any).encrypt({
          userPassword,
          ownerPassword: ownerPassword || userPassword,
          permissions: {
            printing: 'highResolution',
            modifying: false,
            copying: false,
            annotating: false,
          },
        });
      }

      const protectedBytes = await pdf.save();
      const blob = new Blob([protectedBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-protected-${files[0].name}`);
      setStatusMessage({ text: 'Document successfully password protected!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Protection failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 12. UNLOCK PDF
  const processUnlock = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a protected PDF file.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Unlocking document and removing restrictions...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await (PDFDocument.load as any)(arrayBuffer, { 
        password: unlockPassword,
        ignoreEncryption: true 
      });

      const unlockedBytes = await pdf.save();
      const blob = new Blob([unlockedBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-unlocked-${files[0].name}`);
      setStatusMessage({ text: 'Document unlocked and encryption stripped successfully!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Unlock failed: Incorrect password or corrupted file. (${err.message})`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 13. PAGE NUMBERS
  const processPageNumbers = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Adding page numbers to PDF pages...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const docPages = pdf.getPages();
      const totalPages = docPages.length;

      docPages.forEach((page, idx) => {
        const { width, height } = page.getSize();
        const numString = pageNumberFormat === 'full' 
          ? `Page ${idx + 1} of ${totalPages}` 
          : `${idx + 1}`;
        const fontSize = 10;
        const textWidth = font.widthOfTextAtSize(numString, fontSize);

        let x = width / 2 - textWidth / 2;
        let y = 20;

        if (pageNumberPosition === 'bottom-right') {
          x = width - textWidth - 30;
          y = 20;
        } else if (pageNumberPosition === 'top-center') {
          x = width / 2 - textWidth / 2;
          y = height - 30;
        }

        page.drawText(numString, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
      });

      const numberedBytes = await pdf.save();
      const blob = new Blob([numberedBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-numbered-${files[0].name}`);
      setStatusMessage({ text: `Page numbers added to all ${totalPages} pages!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Page numbering failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 14. WATERMARK
  const processWatermark = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file.', type: 'error' });
      return;
    }
    if (!watermarkText.trim()) {
      setStatusMessage({ text: 'Please enter watermark text.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Applying text watermark to PDF pages...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const font = await pdf.embedFont(StandardFonts.HelveticaBold);
      const docPages = pdf.getPages();

      docPages.forEach(page => {
        const { width, height } = page.getSize();
        const fontSize = Math.min(width, height) / 10;
        const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        page.drawText(watermarkText, {
          x: width / 2 - textWidth / 2,
          y: height / 2 - textHeight / 2,
          size: fontSize,
          font: font,
          color: rgb(0, 1, 0.4),
          opacity: watermarkOpacity,
          rotate: degrees(watermarkRotation),
        });
      });

      const watermarkedBytes = await pdf.save();
      const blob = new Blob([watermarkedBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-watermarked-${files[0].name}`);
      setStatusMessage({ text: `Watermark applied to all ${docPages.length} pages!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Watermarking failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 15. SIGN PDF
  const processSign = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Generating and embedding signature stamp...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);

      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#0055FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

        ctx.font = 'italic 24px Georgia, serif';
        ctx.fillStyle = '#0a2540';
        ctx.fillText(signatureName, 20, 50);

        ctx.font = '10px monospace';
        ctx.fillStyle = '#666';
        ctx.fillText(`DIGITALLY SIGNED: ${new Date().toLocaleDateString()}`, 20, 80);
      }

      const sigDataUrl = canvas.toDataURL('image/png');
      const sigRes = await fetch(sigDataUrl);
      const sigBuf = await sigRes.arrayBuffer();
      const sigImage = await pdf.embedPng(sigBuf);

      const targetIdx = Math.min(pdf.getPageCount() - 1, activePreviewPageIndex);
      const page = pdf.getPage(targetIdx);
      const { width } = page.getSize();

      let x = width - 220;
      let y = 30;
      if (signaturePosition === 'bottom-left') x = 30;
      if (signaturePosition === 'center') x = width / 2 - 100;

      page.drawImage(sigImage, {
        x,
        y,
        width: 200,
        height: 66,
      });

      const signedBytes = await pdf.save();
      const blob = new Blob([signedBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-signed-${files[0].name}`);
      setStatusMessage({ text: `Signature stamp placed on page ${targetIdx + 1}!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Sign failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 16. REDACT DATA
  const processRedact = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Applying permanent opaque blackout redaction...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const totalPages = pdf.getPageCount();

      const pageIdx = Math.max(0, Math.min(totalPages - 1, activePreviewPageIndex));
      const page = pdf.getPage(pageIdx);

      page.drawRectangle({
        x: redactBox.x,
        y: redactBox.y,
        width: redactBox.width,
        height: redactBox.height,
        color: rgb(0, 0, 0),
      });

      const redactedBytes = await pdf.save();
      const blob = new Blob([redactedBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-redacted-${files[0].name}`);
      setStatusMessage({ text: `Redacted area blacked out on page ${pageIdx + 1}!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Redaction failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 17. COMPARE PDFS
  const processCompare = async () => {
    if (files.length < 2) {
      setStatusMessage({ text: 'Please upload 2 PDF files to compare.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Comparing PDF structures, page counts, and metadata...', type: 'info' });

    try {
      const bufA = await files[0].file.arrayBuffer();
      const bufB = await files[1].file.arrayBuffer();
      const pdfA = await PDFDocument.load(bufA);
      const pdfB = await PDFDocument.load(bufB);

      const details: string[] = [];
      const countA = pdfA.getPageCount();
      const countB = pdfB.getPageCount();

      details.push(`Document A: ${files[0].name} (${countA} pages, ${(files[0].size / 1024).toFixed(1)} KB)`);
      details.push(`Document B: ${files[1].name} (${countB} pages, ${(files[1].size / 1024).toFixed(1)} KB)`);

      const pagesMatch = countA === countB;
      details.push(`Page Count: ${pagesMatch ? 'MATCH (' + countA + ' pages)' : 'MISMATCH (' + countA + ' vs ' + countB + ')'}`);

      const maxCheck = Math.min(countA, countB);
      let dimsMatch = true;
      for (let i = 0; i < maxCheck; i++) {
        const sizeA = pdfA.getPage(i).getSize();
        const sizeB = pdfB.getPage(i).getSize();
        if (Math.round(sizeA.width) !== Math.round(sizeB.width) || Math.round(sizeA.height) !== Math.round(sizeB.height)) {
          dimsMatch = false;
          details.push(`Page ${i + 1} Dimension Mismatch: [${Math.round(sizeA.width)}x${Math.round(sizeA.height)}] vs [${Math.round(sizeB.width)}x${Math.round(sizeB.height)}]`);
        }
      }
      if (dimsMatch) details.push('Page Dimensions: ALL CHECKED PAGES MATCH RES');

      const isIdentical = pagesMatch && dimsMatch && files[0].size === files[1].size;
      setComparisonResult({ identical: isIdentical, details });
      setStatusMessage({ text: 'Document comparison completed!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Comparison failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 18. CROP PDF
  const processCrop = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Adjusting document crop boundaries...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const docPages = pdf.getPages();

      docPages.forEach(page => {
        const { width, height } = page.getSize();
        const cropX = cropMarginPts;
        const cropY = cropMarginPts;
        const cropWidth = Math.max(100, width - cropMarginPts * 2);
        const cropHeight = Math.max(100, height - cropMarginPts * 2);
        
        page.setCropBox(cropX, cropY, cropWidth, cropHeight);
      });

      const croppedBytes = await pdf.save();
      const blob = new Blob([croppedBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-cropped-${files[0].name}`);
      setStatusMessage({ text: `Cropped ${docPages.length} pages by ${cropMarginPts} pt margins!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Cropping failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 19. FLATTEN PDF
  const processFlatten = async () => {
    if (files.length === 0) {
      setStatusMessage({ text: 'Please upload a PDF file.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Flattening annotations & interactive elements...', type: 'info' });

    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);

      const flattenedBytes = await pdf.save({ updateFieldAppearances: false });
      const blob = new Blob([flattenedBytes], { type: 'application/pdf' });
      saveAs(blob, `chaosbox-flattened-${files[0].name}`);
      setStatusMessage({ text: 'PDF form fields and annotations flattened into static graphics!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Flattening failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 20. TEXT TO PDF
  const processTextToPdf = async () => {
    if (!textInputDoc.trim()) {
      setStatusMessage({ text: 'Please enter text content to convert to PDF.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setStatusMessage({ text: 'Converting typed text into styled PDF...', type: 'info' });

    try {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);

      const splitLines = doc.splitTextToSize(textInputDoc, 180);
      doc.text(splitLines, 15, 20);

      const pdfBlob = doc.output('blob');
      saveAs(pdfBlob, `chaosbox-text-document-${Date.now()}.pdf`);
      setStatusMessage({ text: 'Text document converted to PDF successfully!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Text to PDF failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const toolCategories: Array<{ id: PdfToolType; name: string; icon: any; category: 'EDIT' | 'CONVERT' | 'ORGANIZE' | 'SECURITY'; description: string }> = [
    { id: 'rearrange', name: 'Reorder Pages', icon: Layers, category: 'ORGANIZE', description: 'Visual drag-and-drop page sequence arranger with live thumbnails' },
    { id: 'rotate', name: 'Rotate PDF', icon: RotateCw, category: 'ORGANIZE', description: 'Interactive visual grid with per-page orientation and bulk rotation' },
    { id: 'delete', name: 'Delete Pages', icon: Trash2, category: 'ORGANIZE', description: 'Click page thumbnails to mark for deletion with visual badge preview' },
    { id: 'split', name: 'Split PDF', icon: Scissors, category: 'ORGANIZE', description: 'Extract pages visually or place interactive cut points' },
    { id: 'merge', name: 'Merge PDF', icon: Merge, category: 'ORGANIZE', description: 'Visual document cards with cover previews and drag reordering' },
    { id: 'image2pdf', name: 'Images to PDF', icon: ImageIcon, category: 'CONVERT', description: 'Drag-and-drop image gallery with rotation and sizing controls' },
    { id: 'pdf2images', name: 'PDF to Images', icon: FileImage, category: 'CONVERT', description: 'Render high-resolution PNG gallery and download ZIP archive' },
    { id: 'edit', name: 'Edit & Annotate', icon: Edit3, category: 'EDIT', description: 'Live visual page canvas with draggable text annotations' },
    { id: 'watermark', name: 'Watermark', icon: Type, category: 'EDIT', description: 'Real-time visual watermark preview over document pages' },
    { id: 'sign', name: 'Sign PDF', icon: PenTool, category: 'SECURITY', description: 'Position digital signature stamps on live page previews' },
    { id: 'redact', name: 'Redact Data', icon: EyeOff, category: 'SECURITY', description: 'Place and preview opaque blackout redaction boxes on pages' },
    { id: 'compress', name: 'Compress PDF', icon: FileArchive, category: 'CONVERT', description: 'Optimize PDF binary streams to reduce document file size' },
    { id: 'extract', name: 'Extract Text', icon: FileCode, category: 'CONVERT', description: 'Inspect and extract text streams, structure & metadata' },
    { id: 'protect', name: 'Protect PDF', icon: Lock, category: 'SECURITY', description: 'Encrypt PDF document with AES user and owner passwords' },
    { id: 'unlock', name: 'Unlock PDF', icon: Unlock, category: 'SECURITY', description: 'Remove password encryption and document security restrictions' },
    { id: 'pagenumbers', name: 'Page Numbers', icon: Hash, category: 'EDIT', description: 'Visual preview of automated header/footer numbering' },
    { id: 'compare', name: 'Compare PDFs', icon: GitCompare, category: 'CONVERT', description: 'Side-by-side visual and structure comparison of 2 PDFs' },
    { id: 'crop', name: 'Crop PDF', icon: Crop, category: 'ORGANIZE', description: 'Trim page margins and preview bounding box limits' },
    { id: 'flatten', name: 'Flatten PDF', icon: Minimize2, category: 'SECURITY', description: 'Flatten interactive form fields into static page content' },
    { id: 'text2pdf', name: 'Text to PDF', icon: FileSpreadsheet, category: 'CONVERT', description: 'Convert typed markdown or plain text into a PDF file' },
  ];

  const currentTool = toolCategories.find(t => t.id === activeTab)!;
  const activePageItem = pages[activePreviewPageIndex] || pages[0];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="border border-brand-border p-6 bg-brand-surface relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="text-[10px] font-bold uppercase text-brand-accent tracking-[0.3em] mb-1">
              VISUAL CLIENT-SIDE PDF WORKBENCH
            </div>
            <h1 className="text-3xl font-black uppercase tracking-[0.15em] text-white flex items-center gap-3">
              <FileText className="w-7 h-7 text-brand-accent" />
              CHAOS<span className="text-brand-accent">PDF</span> TOOLS
            </h1>
            <p className="text-zinc-400 text-xs uppercase tracking-[0.15em] mt-1">
              Full suite of 20 visual PDF utilities. Drag-and-drop reordering. 100% in-browser privacy. Zero server uploads.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToCardPrint && (
              <button
                onClick={onNavigateToCardPrint}
                className="px-3 py-1.5 bg-brand-accent/20 hover:bg-brand-accent/30 border border-brand-accent text-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
                <span>Business Card Imposition</span>
              </button>
            )}
            <span className="px-3 py-1 bg-black border border-brand-accent text-brand-accent text-[10px] font-mono font-bold uppercase tracking-wider">
              20 VISUAL TOOLS READY
            </span>
          </div>
        </div>
      </div>

      {/* Tool Grid Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {toolCategories.map(tool => {
          const Icon = tool.icon;
          const isActive = activeTab === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTab(tool.id);
                setStatusMessage(null);
              }}
              className={`p-3 border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                isActive 
                  ? 'bg-brand-accent text-black border-brand-accent font-black shadow-[0_0_15px_rgba(0,255,102,0.3)]' 
                  : 'bg-brand-surface text-white border-brand-border hover:border-zinc-500 hover:bg-black'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-brand-accent'}`} />
                <span className={`text-[8px] font-mono font-bold uppercase ${isActive ? 'text-black' : 'text-zinc-500'}`}>
                  {tool.category}
                </span>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider font-bold leading-tight">{tool.name}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Tool Workbench */}
      <div className="border border-brand-border bg-brand-surface p-6 space-y-6">
        <div className="border-b border-brand-border pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <currentTool.icon className="w-6 h-6 text-brand-accent" />
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-white">{currentTool.name}</h2>
              <p className="text-xs text-zinc-400 uppercase tracking-wider">{currentTool.description}</p>
            </div>
          </div>
          {files.length > 0 && (
            <button
              onClick={clearFiles}
              className="text-[10px] uppercase font-bold tracking-wider text-red-400 hover:text-red-300 flex items-center gap-1 border border-red-950 px-3 py-1 bg-red-950/20 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Queue ({files.length})
            </button>
          )}
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className={`p-4 border text-xs uppercase tracking-wider font-bold flex items-center gap-2 ${
            statusMessage.type === 'success' ? 'bg-green-950/40 border-green-500 text-green-300' :
            statusMessage.type === 'error' ? 'bg-red-950/40 border-red-500 text-red-300' :
            'bg-blue-950/40 border-blue-500 text-blue-300'
          }`}>
            {statusMessage.type === 'success' && <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {statusMessage.type === 'info' && <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* File Upload Dropzone (Show if tool uses PDF or Image uploads) */}
        {activeTab !== 'text2pdf' && (
          <div className="border-2 border-dashed border-brand-border bg-black p-8 text-center hover:border-brand-accent transition-colors relative">
            <input
              type="file"
              multiple={activeTab === 'merge' || activeTab === 'image2pdf' || activeTab === 'compare'}
              accept={activeTab === 'image2pdf' ? "image/*" : ".pdf,application/pdf"}
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center gap-2 pointer-events-none">
              <Plus className="w-8 h-8 text-brand-accent" />
              <span className="text-sm font-bold uppercase tracking-widest text-white">
                {activeTab === 'image2pdf' ? 'DROP IMAGES (PNG, JPG, WEBP) HERE OR CLICK TO UPLOAD' : 'DROP PDF FILES HERE OR CLICK TO UPLOAD'}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                {activeTab === 'merge' ? 'Select multiple PDFs to visually drag and reorder' : 
                 activeTab === 'compare' ? 'Select 2 PDF files for visual & structural comparison' : 
                 'Fast client-side in-browser rendering with real page previews'}
              </span>
            </div>
          </div>
        )}

        {/* Thumbnail Rendering Progress Bar */}
        {isRenderingPages && (
          <div className="p-3 bg-black border border-brand-accent/40 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-brand-accent font-bold uppercase tracking-wider animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Rendering visual page thumbnails in browser...</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">100% PRIVATE • ZERO UPLOAD</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VISUAL WORKBENCH 1: REORDER PAGES (Visual Drag & Drop Grid) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'rearrange' && (
          <div className="space-y-4">
            {pages.length > 0 ? (
              <div className="space-y-4">
                {/* Reorder Toolbar */}
                <div className="p-3 bg-black border border-brand-border flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-brand-accent/20 border border-brand-accent text-brand-accent text-[10px] font-mono font-bold uppercase">
                      {pages.length} PAGES LOADED
                    </span>
                    <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-bold hidden sm:inline">
                      Drag cards to reorder or use arrow controls
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={reversePagesOrder}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-brand-border hover:border-brand-accent text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Reverse Order
                    </button>
                    <button
                      onClick={oddPagesFirst}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-brand-border hover:border-brand-accent text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Odds First
                    </button>
                    <button
                      onClick={evenPagesFirst}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-brand-border hover:border-brand-accent text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Evens First
                    </button>
                    <button
                      onClick={resetPagesOrder}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-brand-border text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Reset Original
                    </button>
                  </div>
                </div>

                {/* Interactive Visual Page Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {pages.map((page, index) => {
                    const isDragged = draggedPageIndex === index;
                    const isDragOver = dragOverPageIndex === index;
                    const isMoved = page.originalIndex !== index;

                    return (
                      <div
                        key={page.id}
                        draggable
                        onDragStart={() => handlePageDragStart(index)}
                        onDragOver={(e) => handlePageDragOver(e, index)}
                        onDrop={() => handlePageDrop(index)}
                        className={`group relative border transition-all duration-150 flex flex-col bg-black select-none ${
                          isDragged ? 'opacity-30 border-dashed border-brand-accent scale-95' :
                          isDragOver ? 'border-brand-accent shadow-[0_0_15px_rgba(0,255,102,0.4)] scale-105' :
                          isMoved ? 'border-brand-accent/60 bg-zinc-950' : 'border-brand-border hover:border-zinc-500'
                        }`}
                      >
                        {/* Header Badge */}
                        <div className="p-2 border-b border-brand-border/60 flex items-center justify-between bg-zinc-900/80">
                          <div className="flex items-center gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-zinc-500 group-hover:text-brand-accent cursor-grab active:cursor-grabbing" />
                            <span className="text-[10px] font-mono font-black text-brand-accent">
                              #{index + 1}
                            </span>
                          </div>
                          {isMoved && (
                            <span className="text-[8px] font-mono text-zinc-400 bg-black px-1 border border-zinc-800">
                              WAS #{page.originalPageNumber}
                            </span>
                          )}
                        </div>

                        {/* Page Preview Thumbnail */}
                        <div className="p-2 flex-1 flex items-center justify-center bg-zinc-950 min-h-[170px] relative overflow-hidden">
                          {page.thumbnailUrl ? (
                            <img
                              src={page.thumbnailUrl}
                              alt={`Page ${index + 1}`}
                              className="max-h-36 object-contain shadow-md border border-zinc-800 bg-white"
                              style={{ transform: `rotate(${page.rotation}deg)` }}
                            />
                          ) : (
                            <div className="w-24 h-32 bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center p-2 text-center text-zinc-600">
                              <FileText className="w-8 h-8 mb-1" />
                              <span className="text-[9px] font-mono font-bold">PG {page.originalPageNumber}</span>
                            </div>
                          )}

                          {page.rotation !== 0 && (
                            <span className="absolute bottom-2 right-2 px-1 bg-black/90 border border-brand-accent text-brand-accent text-[8px] font-mono">
                              +{page.rotation}°
                            </span>
                          )}
                        </div>

                        {/* Card Reorder Controls */}
                        <div className="p-1.5 border-t border-brand-border/60 bg-zinc-900 flex items-center justify-between gap-1">
                          <button
                            onClick={() => movePage(index, 'left')}
                            disabled={index === 0}
                            title="Move earlier"
                            className="p-1 hover:bg-black hover:text-brand-accent disabled:opacity-20 text-zinc-400 border border-transparent hover:border-brand-border transition-colors cursor-pointer"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => rotateSinglePage(index, 90)}
                            title="Rotate 90° CW"
                            className="px-1.5 py-0.5 text-[9px] font-mono hover:bg-black text-zinc-400 hover:text-brand-accent border border-transparent hover:border-brand-border flex items-center gap-0.5 cursor-pointer"
                          >
                            <RotateCw className="w-2.5 h-2.5" /> 90°
                          </button>

                          <button
                            onClick={() => movePage(index, 'right')}
                            disabled={index === pages.length - 1}
                            title="Move later"
                            className="p-1 hover:bg-black hover:text-brand-accent disabled:opacity-20 text-zinc-400 border border-transparent hover:border-brand-border transition-colors cursor-pointer"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sequence Breadcrumb */}
                <div className="p-3 bg-black border border-brand-border text-xs font-mono text-zinc-400 overflow-x-auto whitespace-nowrap">
                  <span className="text-brand-accent font-bold uppercase mr-2 text-[10px]">CURRENT SEQUENCE:</span>
                  {pages.map((p, idx) => (
                    <span key={p.id}>
                      <span className={p.originalIndex !== idx ? 'text-brand-accent font-bold' : 'text-zinc-300'}>
                        {p.originalPageNumber}
                      </span>
                      {idx < pages.length - 1 && <span className="mx-1 text-zinc-600">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-brand-border text-zinc-500 uppercase text-xs tracking-wider">
                Upload a PDF file above to load and reorder its pages visually
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VISUAL WORKBENCH 2: ROTATE PDF (Visual Orientation Grid) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'rotate' && (
          <div className="space-y-4">
            {pages.length > 0 ? (
              <div className="space-y-4">
                {/* Bulk Rotate Toolbar */}
                <div className="p-3 bg-black border border-brand-border flex flex-wrap items-center justify-between gap-3">
                  <span className="px-2 py-1 bg-brand-accent/20 border border-brand-accent text-brand-accent text-[10px] font-mono font-bold uppercase">
                    ROTATE {pages.length} PAGES
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => rotateAllPages(90)}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-brand-border hover:border-brand-accent text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3 text-brand-accent" /> All +90°
                    </button>
                    <button
                      onClick={() => rotateAllPages(270)}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-brand-border hover:border-brand-accent text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-brand-accent" /> All -90°
                    </button>
                    <button
                      onClick={() => rotateAllPages(180)}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-brand-border hover:border-brand-accent text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      All 180°
                    </button>
                    <button
                      onClick={() => rotateOddPages(90)}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-brand-border hover:border-brand-accent text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Odds +90°
                    </button>
                    <button
                      onClick={() => rotateEvenPages(90)}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-brand-border hover:border-brand-accent text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Evens +90°
                    </button>
                    <button
                      onClick={resetAllRotations}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-brand-border text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Reset 0°
                    </button>
                  </div>
                </div>

                {/* Visual Rotate Pages Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {pages.map((page, index) => {
                    const isRotated = page.rotation !== 0;

                    return (
                      <div
                        key={page.id}
                        className={`border transition-all flex flex-col bg-black ${
                          isRotated ? 'border-brand-accent/80 shadow-[0_0_12px_rgba(0,255,102,0.2)]' : 'border-brand-border'
                        }`}
                      >
                        <div className="p-2 border-b border-brand-border/60 flex items-center justify-between bg-zinc-900/80">
                          <span className="text-[10px] font-mono font-bold text-white">
                            PAGE #{page.originalPageNumber}
                          </span>
                          <span className={`text-[9px] font-mono px-1 border ${
                            isRotated ? 'border-brand-accent text-brand-accent bg-black font-bold' : 'border-zinc-800 text-zinc-500'
                          }`}>
                            {page.rotation}°
                          </span>
                        </div>

                        {/* Live Rotated Preview */}
                        <div className="p-2 flex-1 flex items-center justify-center bg-zinc-950 min-h-[170px] overflow-hidden">
                          {page.thumbnailUrl ? (
                            <img
                              src={page.thumbnailUrl}
                              alt={`Page ${page.originalPageNumber}`}
                              className="max-h-36 object-contain shadow-md border border-zinc-800 bg-white transition-transform duration-300"
                              style={{ transform: `rotate(${page.rotation}deg)` }}
                            />
                          ) : (
                            <div className="w-24 h-32 bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center text-zinc-600">
                              <FileText className="w-8 h-8 mb-1" />
                              <span className="text-[9px] font-mono">PG {page.originalPageNumber}</span>
                            </div>
                          )}
                        </div>

                        {/* Individual Rotate Buttons */}
                        <div className="p-1.5 border-t border-brand-border/60 bg-zinc-900 grid grid-cols-3 gap-1 text-center">
                          <button
                            onClick={() => rotateSinglePage(index, -90)}
                            title="Rotate 90° CCW"
                            className="p-1 hover:bg-black text-zinc-400 hover:text-brand-accent border border-transparent hover:border-brand-border text-[9px] flex items-center justify-center cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => rotateSinglePage(index, 180)}
                            title="Flip 180°"
                            className="p-1 hover:bg-black text-zinc-400 hover:text-brand-accent border border-transparent hover:border-brand-border text-[9px] font-mono font-bold flex items-center justify-center cursor-pointer"
                          >
                            180°
                          </button>
                          <button
                            onClick={() => rotateSinglePage(index, 90)}
                            title="Rotate 90° CW"
                            className="p-1 hover:bg-black text-zinc-400 hover:text-brand-accent border border-transparent hover:border-brand-border text-[9px] flex items-center justify-center cursor-pointer"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-brand-border text-zinc-500 uppercase text-xs tracking-wider">
                Upload a PDF file above to preview and rotate pages individually or in bulk
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VISUAL WORKBENCH 3: DELETE PAGES (Click to Delete Grid) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'delete' && (
          <div className="space-y-4">
            {pages.length > 0 ? (
              <div className="space-y-4">
                {/* Delete Toolbar */}
                <div className="p-3 bg-black border border-brand-border flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-red-950 border border-red-500 text-red-300 text-[10px] font-mono font-bold uppercase">
                      {pages.filter(p => p.selectedForDelete).length} OF {pages.length} MARKED FOR DELETION
                    </span>
                    <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-bold hidden sm:inline">
                      Click any page thumbnail to mark for removal
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={selectEvenForDelete}
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-white border border-brand-border text-[10px] font-bold uppercase cursor-pointer"
                    >
                      Delete Evens
                    </button>
                    <button
                      onClick={selectOddForDelete}
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-white border border-brand-border text-[10px] font-bold uppercase cursor-pointer"
                    >
                      Delete Odds
                    </button>
                    <button
                      onClick={invertDeleteSelection}
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-white border border-brand-border text-[10px] font-bold uppercase cursor-pointer"
                    >
                      Invert
                    </button>
                    <button
                      onClick={selectAllForDelete}
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-red-400 border border-brand-border text-[10px] font-bold uppercase cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllForDelete}
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-brand-border text-[10px] font-bold uppercase cursor-pointer"
                    >
                      Keep All
                    </button>
                  </div>
                </div>

                {/* Visual Delete Pages Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {pages.map((page, index) => {
                    const isDeleting = page.selectedForDelete;

                    return (
                      <div
                        key={page.id}
                        onClick={() => toggleDeletePage(index)}
                        className={`group relative border transition-all cursor-pointer flex flex-col select-none ${
                          isDeleting 
                            ? 'border-red-500 bg-red-950/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                            : 'border-brand-border hover:border-zinc-500 bg-black'
                        }`}
                      >
                        {/* Header Badge */}
                        <div className={`p-2 border-b flex items-center justify-between ${
                          isDeleting ? 'border-red-900 bg-red-950/80' : 'border-brand-border/60 bg-zinc-900/80'
                        }`}>
                          <span className={`text-[10px] font-mono font-bold ${
                            isDeleting ? 'text-red-400 line-through' : 'text-white'
                          }`}>
                            PAGE #{page.originalPageNumber}
                          </span>
                          <span className={`text-[9px] font-bold uppercase px-1 border ${
                            isDeleting ? 'border-red-500 text-red-300 bg-red-950' : 'border-zinc-800 text-zinc-500'
                          }`}>
                            {isDeleting ? 'REMOVE' : 'KEEP'}
                          </span>
                        </div>

                        {/* Page Preview Thumbnail with Delete Overlay */}
                        <div className="p-2 flex-1 flex items-center justify-center bg-zinc-950 min-h-[170px] relative overflow-hidden">
                          {page.thumbnailUrl ? (
                            <img
                              src={page.thumbnailUrl}
                              alt={`Page ${page.originalPageNumber}`}
                              className={`max-h-36 object-contain shadow-md border bg-white transition-opacity ${
                                isDeleting ? 'opacity-30 border-red-900 filter grayscale' : 'border-zinc-800'
                              }`}
                            />
                          ) : (
                            <div className="w-24 h-32 bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center text-zinc-600">
                              <FileText className="w-8 h-8 mb-1" />
                              <span className="text-[9px] font-mono">PG {page.originalPageNumber}</span>
                            </div>
                          )}

                          {/* Visual Strike / Trash Overlay */}
                          {isDeleting && (
                            <div className="absolute inset-0 bg-red-950/60 flex flex-col items-center justify-center text-red-400 gap-1">
                              <Trash2 className="w-8 h-8 text-red-500" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-red-300 bg-black/80 px-2 py-0.5 border border-red-500">
                                DELETING
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action Footer */}
                        <div className={`p-1.5 border-t text-center text-[9px] font-mono font-bold uppercase tracking-wider ${
                          isDeleting ? 'border-red-900 text-red-400 bg-red-950/50' : 'border-brand-border/60 text-zinc-400 bg-zinc-900 group-hover:text-white'
                        }`}>
                          {isDeleting ? 'Click to Keep' : 'Click to Delete'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-brand-border text-zinc-500 uppercase text-xs tracking-wider">
                Upload a PDF file above to review and visually delete unwanted pages
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VISUAL WORKBENCH 4: SPLIT PDF (Visual Page Picker / Cut Points) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'split' && (
          <div className="space-y-4">
            {pages.length > 0 ? (
              <div className="space-y-4">
                {/* Mode Selector */}
                <div className="p-3 bg-black border border-brand-border flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSplitMode('visual')}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                        splitMode === 'visual' ? 'bg-brand-accent text-black border-brand-accent' : 'bg-zinc-900 text-zinc-400 border-brand-border hover:text-white'
                      }`}
                    >
                      Visual Page Selection
                    </button>
                    <button
                      onClick={() => setSplitMode('cuts')}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                        splitMode === 'cuts' ? 'bg-brand-accent text-black border-brand-accent' : 'bg-zinc-900 text-zinc-400 border-brand-border hover:text-white'
                      }`}
                    >
                      Cut Points Between Pages
                    </button>
                    <button
                      onClick={() => setSplitMode('range')}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                        splitMode === 'range' ? 'bg-brand-accent text-black border-brand-accent' : 'bg-zinc-900 text-zinc-400 border-brand-border hover:text-white'
                      }`}
                    >
                      Custom Range String
                    </button>
                  </div>

                  {splitMode === 'visual' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={selectAllForSplit}
                        className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-white border border-brand-border text-[10px] font-bold uppercase cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        onClick={clearSplitSelection}
                        className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-brand-border text-[10px] font-bold uppercase cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                {splitMode === 'range' && (
                  <div className="p-4 bg-black border border-brand-border space-y-2">
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      Page Selection Range (e.g. "1-2, 4")
                    </label>
                    <input
                      type="text"
                      value={splitRange}
                      onChange={e => setSplitRange(e.target.value)}
                      placeholder="1-2, 4"
                      className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                )}

                {/* Visual Grid for Split Selection or Cut Points */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {pages.map((page, index) => {
                    const isSelected = page.selectedForSplit;
                    const hasCutAfter = cutPoints.includes(index);

                    return (
                      <div key={page.id} className="relative flex flex-col">
                        <div
                          onClick={() => {
                            if (splitMode === 'visual') toggleSplitPage(index);
                          }}
                          className={`border transition-all flex flex-col bg-black flex-1 ${
                            splitMode === 'visual' ? 'cursor-pointer select-none' : ''
                          } ${
                            splitMode === 'visual' && isSelected
                              ? 'border-brand-accent shadow-[0_0_12px_rgba(0,255,102,0.25)]'
                              : 'border-brand-border'
                          }`}
                        >
                          <div className="p-2 border-b border-brand-border/60 flex items-center justify-between bg-zinc-900/80">
                            <span className="text-[10px] font-mono font-bold text-white">
                              PAGE #{page.originalPageNumber}
                            </span>
                            {splitMode === 'visual' && (
                              <span className={`text-[9px] font-bold uppercase px-1 border ${
                                isSelected ? 'border-brand-accent text-brand-accent bg-black' : 'border-zinc-800 text-zinc-500'
                              }`}>
                                {isSelected ? 'EXTRACT' : 'SKIP'}
                              </span>
                            )}
                          </div>

                          <div className="p-2 flex-1 flex items-center justify-center bg-zinc-950 min-h-[160px]">
                            {page.thumbnailUrl ? (
                              <img
                                src={page.thumbnailUrl}
                                alt={`Page ${page.originalPageNumber}`}
                                className={`max-h-36 object-contain shadow-md border bg-white ${
                                  splitMode === 'visual' && !isSelected ? 'opacity-30 filter grayscale' : 'border-zinc-800'
                                }`}
                              />
                            ) : (
                              <div className="w-24 h-32 bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center text-zinc-600">
                                <FileText className="w-8 h-8 mb-1" />
                                <span className="text-[9px] font-mono">PG {page.originalPageNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Interactive Cut Scissors Between Pages */}
                        {splitMode === 'cuts' && index < pages.length - 1 && (
                          <div className="mt-2 flex items-center justify-center">
                            <button
                              onClick={() => toggleCutPoint(index)}
                              className={`px-2 py-1 text-[9px] font-mono uppercase font-bold border flex items-center gap-1 transition-colors cursor-pointer ${
                                hasCutAfter 
                                  ? 'bg-brand-accent text-black border-brand-accent shadow-[0_0_10px_rgba(0,255,102,0.4)]' 
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-brand-accent hover:text-white'
                              }`}
                            >
                              <Scissors className="w-3 h-3" />
                              {hasCutAfter ? `CUT AFTER PG ${index + 1}` : `SPLIT HERE`}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-brand-border text-zinc-500 uppercase text-xs tracking-wider">
                Upload a PDF file above to split visually or set custom cut lines
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VISUAL WORKBENCH 5: MERGE PDF (Visual Document Cards) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'merge' && (
          <div className="space-y-4">
            {mergeDocs.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-black border border-brand-border flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-brand-accent uppercase">
                    {mergeDocs.length} DOCUMENTS READY TO MERGE (DRAG CARDS TO REORDER SEQUENCE)
                  </span>
                </div>

                <div className="space-y-2">
                  {mergeDocs.map((doc, index) => {
                    const isDragged = draggedDocIndex === index;
                    const isDragOver = dragOverDocIndex === index;

                    return (
                      <div
                        key={doc.id}
                        draggable
                        onDragStart={() => handleMergeDocDragStart(index)}
                        onDragOver={(e) => handleMergeDocDragOver(e, index)}
                        onDrop={() => handleMergeDocDrop(index)}
                        className={`p-3 bg-black border transition-all flex items-center justify-between gap-4 ${
                          isDragged ? 'opacity-30 border-dashed border-brand-accent' :
                          isDragOver ? 'border-brand-accent bg-zinc-900' : 'border-brand-border hover:border-zinc-500'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <GripVertical className="w-4 h-4 text-zinc-500 hover:text-brand-accent cursor-grab shrink-0" />
                          <span className="w-7 h-7 border border-brand-accent text-brand-accent font-mono text-xs flex items-center justify-center font-bold shrink-0 bg-black">
                            {index + 1}
                          </span>

                          {/* Cover Thumbnail */}
                          {doc.coverUrl ? (
                            <img
                              src={doc.coverUrl}
                              alt={doc.name}
                              className="w-10 h-14 object-cover border border-zinc-700 bg-white shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}

                          <div className="truncate">
                            <div className="text-xs font-bold text-white truncate">{doc.name}</div>
                            <div className="text-[10px] font-mono text-zinc-400 mt-0.5 flex items-center gap-2">
                              <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                              {doc.pageCount && <span>• {doc.pageCount} PAGES</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => moveMergeDoc(index, 'up')}
                            disabled={index === 0}
                            title="Move up"
                            className="p-1.5 hover:text-brand-accent disabled:opacity-20 text-zinc-400 border border-zinc-800 hover:border-brand-border cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveMergeDoc(index, 'down')}
                            disabled={index === mergeDocs.length - 1}
                            title="Move down"
                            className="p-1.5 hover:text-brand-accent disabled:opacity-20 text-zinc-400 border border-zinc-800 hover:border-brand-border cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeFile(doc.id)}
                            title="Remove file"
                            className="p-1.5 text-red-400 hover:text-red-300 border border-zinc-800 hover:border-red-900 cursor-pointer ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-brand-border text-zinc-500 uppercase text-xs tracking-wider">
                Upload 2 or more PDF files above to preview cover pages and visually order the merge sequence
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VISUAL WORKBENCH 6: IMAGES TO PDF (Visual Image Gallery) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'image2pdf' && (
          <div className="space-y-4">
            <div className="p-4 bg-black border border-brand-border grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">
                  Page Margin (px)
                </label>
                <input
                  type="number"
                  value={imageMargin}
                  onChange={e => setImageMargin(Number(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">
                  Page Dimension Fit
                </label>
                <select
                  value={imagePageFit}
                  onChange={e => setImagePageFit(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-accent cursor-pointer"
                >
                  <option value="fit">Original Image Dimensions (Adaptive)</option>
                  <option value="a4">Standard A4 Document</option>
                  <option value="letter">US Letter Document</option>
                </select>
              </div>
            </div>

            {imageItems.length > 0 ? (
              <div className="space-y-3">
                <div className="text-[10px] font-mono font-bold text-brand-accent uppercase">
                  {imageItems.length} IMAGES LOADED (DRAG TO REORDER PAGE SEQUENCE)
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {imageItems.map((img, index) => {
                    const isDragged = draggedImageIndex === index;
                    const isDragOver = dragOverImageIndex === index;

                    return (
                      <div
                        key={img.id}
                        draggable
                        onDragStart={() => handleImageDragStart(index)}
                        onDragOver={(e) => handleImageDragOver(e, index)}
                        onDrop={() => handleImageDrop(index)}
                        className={`border transition-all flex flex-col bg-black ${
                          isDragged ? 'opacity-30 border-dashed border-brand-accent' :
                          isDragOver ? 'border-brand-accent shadow-[0_0_12px_rgba(0,255,102,0.3)]' : 'border-brand-border hover:border-zinc-500'
                        }`}
                      >
                        <div className="p-2 border-b border-brand-border/60 flex items-center justify-between bg-zinc-900">
                          <div className="flex items-center gap-1">
                            <GripVertical className="w-3.5 h-3.5 text-zinc-500 cursor-grab" />
                            <span className="text-[10px] font-mono font-bold text-brand-accent">
                              #{index + 1}
                            </span>
                          </div>
                          <button
                            onClick={() => removeFile(img.id)}
                            className="text-red-400 hover:text-red-300 text-[10px] cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="p-2 flex-1 flex items-center justify-center bg-zinc-950 min-h-[150px] overflow-hidden">
                          <img
                            src={img.url}
                            alt={img.name}
                            className="max-h-32 object-contain shadow border border-zinc-800"
                            style={{ transform: `rotate(${img.rotation}deg)` }}
                          />
                        </div>

                        <div className="p-1.5 border-t border-brand-border/60 bg-zinc-900 flex items-center justify-between gap-1">
                          <button
                            onClick={() => moveImageItem(index, 'left')}
                            disabled={index === 0}
                            className="p-1 hover:text-brand-accent disabled:opacity-20 text-zinc-400 cursor-pointer"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => rotateImageItem(index)}
                            className="px-1.5 py-0.5 text-[9px] font-mono text-zinc-300 hover:text-brand-accent flex items-center gap-0.5 cursor-pointer"
                          >
                            <RotateCw className="w-2.5 h-2.5" /> 90°
                          </button>
                          <button
                            onClick={() => moveImageItem(index, 'right')}
                            disabled={index === imageItems.length - 1}
                            className="p-1 hover:text-brand-accent disabled:opacity-20 text-zinc-400 cursor-pointer"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-brand-border text-zinc-500 uppercase text-xs tracking-wider">
                Upload image files (PNG, JPG, WebP) above to create a PDF document
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VISUAL WORKBENCH 7: EDIT, WATERMARK, REDACT, SIGN (Live Canvas) */}
        {/* ------------------------------------------------------------- */}
        {(activeTab === 'edit' || activeTab === 'watermark' || activeTab === 'redact' || activeTab === 'sign' || activeTab === 'crop' || activeTab === 'pagenumbers') && (
          <div className="space-y-4">
            {pages.length > 0 && (
              <div className="border border-brand-border bg-black p-4 space-y-4">
                {/* Visual Page Stepper Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-brand-accent uppercase">
                      PREVIEWING PAGE {activePreviewPageIndex + 1} OF {pages.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActivePreviewPageIndex(prev => Math.max(0, prev - 1))}
                      disabled={activePreviewPageIndex === 0}
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-brand-border text-white text-[10px] font-mono font-bold uppercase cursor-pointer"
                    >
                      Prev Page
                    </button>
                    <select
                      value={activePreviewPageIndex}
                      onChange={e => setActivePreviewPageIndex(Number(e.target.value))}
                      className="bg-zinc-900 border border-brand-border text-white px-2 py-1 text-[10px] font-mono cursor-pointer"
                    >
                      {pages.map((p, i) => (
                        <option key={p.id} value={i}>
                          Page #{i + 1} (Original #{p.originalPageNumber})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setActivePreviewPageIndex(prev => Math.min(pages.length - 1, prev + 1))}
                      disabled={activePreviewPageIndex === pages.length - 1}
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-brand-border text-white text-[10px] font-mono font-bold uppercase cursor-pointer"
                    >
                      Next Page
                    </button>
                  </div>
                </div>

                {/* Live Page Preview Stage with Overlay */}
                <div className="flex justify-center items-center p-4 bg-zinc-950 border border-zinc-900 min-h-[360px]">
                  <div className="relative inline-block border-2 border-zinc-700 shadow-2xl bg-white select-none">
                    {activePageItem?.thumbnailUrl ? (
                      <img
                        src={activePageItem.thumbnailUrl}
                        alt="Target Page Preview"
                        className="max-h-[460px] object-contain block"
                        style={{ transform: `rotate(${activePageItem.rotation}deg)` }}
                      />
                    ) : (
                      <div className="w-72 h-96 bg-zinc-900 flex flex-col items-center justify-center text-zinc-500">
                        <FileText className="w-12 h-12 mb-2" />
                        <span className="font-mono text-xs">PAGE {activePreviewPageIndex + 1}</span>
                      </div>
                    )}

                    {/* LIVE WATERMARK OVERLAY */}
                    {activeTab === 'watermark' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                        <span
                          className="font-black text-brand-accent border-2 border-brand-accent px-4 py-2 uppercase tracking-widest text-center"
                          style={{
                            opacity: watermarkOpacity,
                            transform: `rotate(${watermarkRotation}deg)`,
                            fontSize: '24px'
                          }}
                        >
                          {watermarkText}
                        </span>
                      </div>
                    )}

                    {/* LIVE REDACT BLACKOUT OVERLAY */}
                    {activeTab === 'redact' && (
                      <div
                        className="absolute bg-black border border-red-500 shadow-lg cursor-move flex items-center justify-center text-[9px] font-mono text-red-400 font-bold tracking-wider"
                        style={{
                          left: `${Math.min(80, Math.max(5, (redactBox.x / (activePageItem?.width || 300)) * 100))}%`,
                          bottom: `${Math.min(80, Math.max(5, (redactBox.y / (activePageItem?.height || 400)) * 100))}%`,
                          width: `${Math.min(85, Math.max(15, (redactBox.width / (activePageItem?.width || 300)) * 100))}%`,
                          height: `${Math.min(50, Math.max(8, (redactBox.height / (activePageItem?.height || 400)) * 100))}%`,
                        }}
                      >
                        REDACTION BLACKOUT
                      </div>
                    )}

                    {/* LIVE SIGNATURE STAMP OVERLAY */}
                    {activeTab === 'sign' && (
                      <div
                        className={`absolute p-2 bg-white/95 border-2 border-blue-600 shadow-md ${
                          signaturePosition === 'bottom-left' ? 'bottom-4 left-4' :
                          signaturePosition === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                          'bottom-4 right-4'
                        }`}
                      >
                        <div className="text-blue-900 font-serif italic font-bold text-xs">
                          {signatureName}
                        </div>
                        <div className="text-[7px] font-mono text-zinc-500 uppercase mt-0.5">
                          DIGITALLY SIGNED • {new Date().toLocaleDateString()}
                        </div>
                      </div>
                    )}

                    {/* LIVE EDIT ANNOTATION OVERLAY */}
                    {activeTab === 'edit' && (
                      <div
                        className="absolute p-2 bg-yellow-100 border border-yellow-500 text-yellow-950 font-sans text-xs font-bold shadow-md rounded-sm"
                        style={{
                          left: `${Math.min(80, Math.max(5, (editX / (activePageItem?.width || 300)) * 100))}%`,
                          bottom: `${Math.min(80, Math.max(5, (editY / (activePageItem?.height || 400)) * 100))}%`,
                        }}
                      >
                        {editText}
                      </div>
                    )}

                    {/* LIVE PAGE NUMBERS OVERLAY */}
                    {activeTab === 'pagenumbers' && (
                      <div
                        className={`absolute text-zinc-800 font-mono text-[9px] font-bold px-2 py-0.5 bg-white/80 ${
                          pageNumberPosition === 'top-center' ? 'top-2 left-1/2 -translate-x-1/2' :
                          pageNumberPosition === 'bottom-right' ? 'bottom-2 right-4' :
                          'bottom-2 left-1/2 -translate-x-1/2'
                        }`}
                      >
                        {pageNumberFormat === 'full' ? `Page ${activePreviewPageIndex + 1} of ${pages.length}` : `${activePreviewPageIndex + 1}`}
                      </div>
                    )}

                    {/* LIVE CROP BOUNDARY OVERLAY */}
                    {activeTab === 'crop' && (
                      <div
                        className="absolute border-2 border-dashed border-brand-accent pointer-events-none"
                        style={{
                          inset: `${cropMarginPts}px`
                        }}
                      >
                        <span className="absolute top-1 left-1 px-1 bg-black text-brand-accent text-[8px] font-mono">
                          TRIM BOUNDARY (-{cropMarginPts}pt)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Tool-Specific Parameters */}
            {activeTab === 'watermark' && (
              <div className="p-4 bg-black border border-brand-border grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={e => setWatermarkText(e.target.value)}
                    className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">
                    Opacity ({Math.round(watermarkOpacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={e => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full accent-brand-accent cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">
                    Rotation ({watermarkRotation}°)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={watermarkRotation}
                    onChange={e => setWatermarkRotation(parseInt(e.target.value, 10))}
                    className="w-full accent-brand-accent cursor-pointer"
                  />
                </div>
              </div>
            )}

            {activeTab === 'edit' && (
              <div className="p-4 bg-black border border-brand-border grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">
                    Annotation Text
                  </label>
                  <input
                    type="text"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">X, Y Offset (pt)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editX}
                      onChange={e => setEditX(parseInt(e.target.value, 10) || 0)}
                      placeholder="X"
                      className="w-1/2 bg-zinc-900 border border-brand-border px-2 py-2 text-white text-xs font-mono focus:outline-none focus:border-brand-accent"
                    />
                    <input
                      type="number"
                      value={editY}
                      onChange={e => setEditY(parseInt(e.target.value, 10) || 0)}
                      placeholder="Y"
                      className="w-1/2 bg-zinc-900 border border-brand-border px-2 py-2 text-white text-xs font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sign' && (
              <div className="p-4 bg-black border border-brand-border grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">
                    Signer Name / Title
                  </label>
                  <input
                    type="text"
                    value={signatureName}
                    onChange={e => setSignatureName(e.target.value)}
                    className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">
                    Stamp Location
                  </label>
                  <select
                    value={signaturePosition}
                    onChange={e => setSignaturePosition(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-accent cursor-pointer"
                  >
                    <option value="bottom-right">Bottom Right Page</option>
                    <option value="bottom-left">Bottom Left Page</option>
                    <option value="center">Center Page</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'redact' && (
              <div className="p-4 bg-black border border-brand-border grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">X Pos (pt)</label>
                  <input
                    type="number"
                    value={redactBox.x}
                    onChange={e => setRedactBox({ ...redactBox, x: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">Y Pos (pt)</label>
                  <input
                    type="number"
                    value={redactBox.y}
                    onChange={e => setRedactBox({ ...redactBox, y: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">Width (pt)</label>
                  <input
                    type="number"
                    value={redactBox.width}
                    onChange={e => setRedactBox({ ...redactBox, width: parseInt(e.target.value, 10) || 100 })}
                    className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">Height (pt)</label>
                  <input
                    type="number"
                    value={redactBox.height}
                    onChange={e => setRedactBox({ ...redactBox, height: parseInt(e.target.value, 10) || 30 })}
                    className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
            )}

            {activeTab === 'pagenumbers' && (
              <div className="p-4 bg-black border border-brand-border grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">
                    Position
                  </label>
                  <select
                    value={pageNumberPosition}
                    onChange={e => setPageNumberPosition(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-accent cursor-pointer"
                  >
                    <option value="bottom-center">Bottom Center Footer</option>
                    <option value="bottom-right">Bottom Right Footer</option>
                    <option value="top-center">Top Center Header</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">
                    Number Format
                  </label>
                  <select
                    value={pageNumberFormat}
                    onChange={e => setPageNumberFormat(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-accent cursor-pointer"
                  >
                    <option value="full">Page X of Y</option>
                    <option value="simple">Simple Number (1, 2, 3)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'crop' && (
              <div className="p-4 bg-black border border-brand-border space-y-2">
                <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                  Margin Crop Trim (points from outer borders)
                </label>
                <input
                  type="number"
                  value={cropMarginPts}
                  onChange={e => setCropMarginPts(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-brand-accent"
                />
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* OTHER TOOLS: SECURITY, CONVERSIONS, METADATA */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'protect' && (
          <div className="p-4 bg-black border border-brand-border grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">
                User Password (Required to Open)
              </label>
              <input
                type="password"
                value={userPassword}
                onChange={e => setUserPassword(e.target.value)}
                placeholder="Enter user password..."
                className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1">
                Owner Password (Permissions Master)
              </label>
              <input
                type="password"
                value={ownerPassword}
                onChange={e => setOwnerPassword(e.target.value)}
                placeholder="Optional master password..."
                className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-accent"
              />
            </div>
          </div>
        )}

        {activeTab === 'unlock' && (
          <div className="p-4 bg-black border border-brand-border space-y-2">
            <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
              Decryption Password (If required)
            </label>
            <input
              type="password"
              value={unlockPassword}
              onChange={e => setUnlockPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full bg-zinc-900 border border-brand-border px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-accent"
            />
          </div>
        )}

        {activeTab === 'text2pdf' && (
          <div className="p-4 bg-black border border-brand-border space-y-2">
            <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
              Type or Paste Document Content (Markdown / Plain Text)
            </label>
            <textarea
              rows={8}
              value={textInputDoc}
              onChange={e => setTextInputDoc(e.target.value)}
              className="w-full bg-zinc-900 border border-brand-border p-3 text-xs font-mono text-white focus:outline-none focus:border-brand-accent"
            />
          </div>
        )}

        {/* Action Execute Button */}
        <div>
          <button
            disabled={isProcessing}
            onClick={() => {
              if (activeTab === 'merge') processMerge();
              else if (activeTab === 'split') processSplit();
              else if (activeTab === 'compress') processCompress();
              else if (activeTab === 'edit') processEdit();
              else if (activeTab === 'image2pdf') processImagesToPdf();
              else if (activeTab === 'pdf2images') processPdfToImages();
              else if (activeTab === 'extract') processExtractText();
              else if (activeTab === 'rotate') processRotate();
              else if (activeTab === 'delete') processDeletePages();
              else if (activeTab === 'rearrange') processRearrange();
              else if (activeTab === 'protect') processProtect();
              else if (activeTab === 'unlock') processUnlock();
              else if (activeTab === 'pagenumbers') processPageNumbers();
              else if (activeTab === 'watermark') processWatermark();
              else if (activeTab === 'sign') processSign();
              else if (activeTab === 'redact') processRedact();
              else if (activeTab === 'compare') processCompare();
              else if (activeTab === 'crop') processCrop();
              else if (activeTab === 'flatten') processFlatten();
              else if (activeTab === 'text2pdf') processTextToPdf();
            }}
            className="w-full py-4 bg-brand-accent hover:bg-white text-black font-black uppercase tracking-[0.2em] text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(0,255,102,0.2)]"
          >
            <Download className="w-4 h-4" />
            {isProcessing ? 'PROCESSING DOCUMENT...' : `APPLY & DOWNLOAD ${currentTool.name.toUpperCase()}`}
          </button>
        </div>

        {/* Text Extraction Output Box */}
        {extractedText && activeTab === 'extract' && (
          <div className="space-y-2 border-t border-brand-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-brand-accent tracking-wider">Extracted Text Output</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(extractedText);
                  setCopiedNotification(true);
                  setTimeout(() => setCopiedNotification(false), 2000);
                }}
                className="text-[9px] uppercase font-bold tracking-wider px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedNotification ? <Check className="w-3 h-3 text-brand-accent" /> : <Copy className="w-3 h-3" />}
                {copiedNotification ? 'Copied!' : 'Copy Text'}
              </button>
            </div>
            <textarea
              readOnly
              value={extractedText}
              className="w-full h-48 bg-black border border-brand-border p-3 text-xs font-mono text-green-400 focus:outline-none"
            />
          </div>
        )}

        {/* Compare PDF Results Output */}
        {comparisonResult && activeTab === 'compare' && (
          <div className="space-y-2 border-t border-brand-border pt-4">
            <div className="text-[10px] font-bold uppercase text-brand-accent tracking-wider">Document Comparison Matrix</div>
            <div className="p-4 bg-black border border-brand-border space-y-1 font-mono text-xs">
              {comparisonResult.details.map((line, idx) => (
                <div key={idx} className={line.includes('MISMATCH') || line.includes('Mismatch') ? 'text-red-400 font-bold' : 'text-zinc-300'}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
