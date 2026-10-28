import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker using Vite asset URL or fallback CDN
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (e) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
}

export interface RenderedPdfPage {
  pageNumber: number; // 1-indexed
  dataUrl: string;
  width: number;
  height: number;
}

export interface PdfDocumentSummary {
  numPages: number;
  pages: RenderedPdfPage[];
  pageDimensions: Array<{ width: number; height: number }>;
}

/**
 * Render all or first N pages of a PDF File to thumbnail images (data URLs)
 */
export async function renderPdfThumbnails(
  file: File, 
  maxPages: number = 50,
  scale: number = 0.6
): Promise<PdfDocumentSummary> {
  const arrayBuffer = await file.arrayBuffer();
  // Using uint8array copy
  const typedArray = new Uint8Array(arrayBuffer);
  
  const loadingTask = pdfjsLib.getDocument({
    data: typedArray,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pagesToRender = Math.min(numPages, maxPages);
  
  const pages: RenderedPdfPage[] = [];
  const pageDimensions: Array<{ width: number; height: number }> = [];

  for (let i = 1; i <= pagesToRender; i++) {
    try {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });
      pageDimensions.push({ width: viewport.width, height: viewport.height });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (context) {
        await page.render({
          canvasContext: context,
          canvas: canvas,
          viewport: viewport,
        }).promise;

        pages.push({
          pageNumber: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.85),
          width: viewport.width,
          height: viewport.height,
        });
      }
    } catch (pageErr) {
      console.warn(`Failed to render page ${i}:`, pageErr);
      // Fallback empty preview
      pages.push({
        pageNumber: i,
        dataUrl: '',
        width: 200,
        height: 280,
      });
    }
  }

  return {
    numPages,
    pages,
    pageDimensions,
  };
}

/**
 * Render a single high-resolution page preview
 */
export async function renderSinglePdfPage(
  file: File,
  pageNumber: number,
  scale: number = 1.2
): Promise<string | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });
    const pdfDoc = await loadingTask.promise;
    if (pageNumber < 1 || pageNumber > pdfDoc.numPages) return null;

    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (context) {
      await page.render({
        canvasContext: context,
        canvas: canvas,
        viewport,
      }).promise;
      return canvas.toDataURL('image/jpeg', 0.9);
    }
    return null;
  } catch (err) {
    console.error('Error rendering single page:', err);
    return null;
  }
}
