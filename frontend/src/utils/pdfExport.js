import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * High-precision A4 PDF Exporter for Ghalla Mandi ERP Receipts & Invoices.
 * 
 * Captures the rendered DOM receipt node using html2canvas at 2x resolution,
 * calculates A4 dimensions (210mm x 297mm), and generates a crisp vector/bitmap
 * PDF document using jsPDF with multi-page support.
 * 
 * @param {HTMLElement} element - The DOM element containing the rendered receipt.
 * @param {string} filename - The output PDF file name (e.g., 'Invoice_INV-2026-0005.pdf').
 * @returns {Promise<void>}
 */
export const exportReceiptToPDF = async (element, filename = 'receipt.pdf') => {
  if (!element) {
    throw new Error('Receipt element reference not found in DOM.');
  }

  // 1. Ensure all custom fonts and web typography are fully loaded
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Font loading fallback
    }
  }

  // 2. Wait a tick for any pending React re-renders or DOM repaints
  await new Promise(resolve => setTimeout(resolve, 80));

  // 3. Capture high-resolution canvas snapshot of the visible receipt element
  const canvas = await html2canvas(element, {
    scale: 2, // 2x scale for crystal-clear 300+ DPI print quality
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth || 794,
    onclone: (clonedDoc) => {
      // Ensure the cloned node is fully visible and unconstrained in cloned DOM
      const targetId = element.id;
      const clonedElement = targetId ? clonedDoc.getElementById(targetId) : null;
      if (clonedElement) {
        clonedElement.style.position = 'static';
        clonedElement.style.display = 'block';
        clonedElement.style.visibility = 'visible';
        clonedElement.style.opacity = '1';
        clonedElement.style.overflow = 'visible';
        clonedElement.style.height = 'auto';
        clonedElement.style.maxHeight = 'none';
        clonedElement.style.width = '794px';
        clonedElement.style.maxWidth = '794px';
        clonedElement.style.boxShadow = 'none';
        clonedElement.style.borderRadius = '0px';
        clonedElement.style.border = 'none';
        clonedElement.style.backgroundColor = '#ffffff';
        clonedElement.style.color = '#0f172a';
      }
    }
  });

  // Verify canvas generated valid content
  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    throw new Error('Generated canvas is empty or invalid.');
  }

  // 4. Convert canvas to high-quality JPEG data URL
  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  // 5. Initialize standard A4 Portrait jsPDF document
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Standard A4 dimensions in mm
  const a4Width = 210;
  const a4Height = 297;
  const margin = 10; // 10mm margins on all sides
  const printableWidth = a4Width - (margin * 2); // 190mm
  const printableHeight = a4Height - (margin * 2); // 277mm

  // Compute total rendered height of the receipt in mm
  const imgHeight = (canvas.height * printableWidth) / canvas.width;

  // 6. Handle Single Page vs Multi-page pagination
  if (imgHeight <= printableHeight) {
    // Single page receipt - fits naturally
    pdf.addImage(imgData, 'JPEG', margin, margin, printableWidth, imgHeight, undefined, 'FAST');
  } else {
    // Multi-page receipt (long orders/procurement with 15+ items)
    let heightLeft = imgHeight;
    let page = 0;

    while (heightLeft > 0) {
      if (page > 0) {
        pdf.addPage('a4', 'portrait');
      }

      // Calculate vertical offset for current slice
      const verticalOffset = margin - (page * printableHeight);
      pdf.addImage(imgData, 'JPEG', margin, verticalOffset, printableWidth, imgHeight, undefined, 'FAST');

      heightLeft -= printableHeight;
      page++;
    }
  }

  // 7. Save file to disk
  pdf.save(filename);
};
