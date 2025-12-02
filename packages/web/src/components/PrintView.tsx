import { useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface PrintViewProps {
  content: string;
  title: string;
  onClose: () => void;
}

export function PrintView({ content, title, onClose }: PrintViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Convert markdown to HTML
    const html = marked.parse(content) as string;
    const sanitizedHtml = DOMPurify.sanitize(html);

    // Create print-optimized document
    const printDocument = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4;
      margin: 2.5cm;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      max-width: 100%;
      padding: 0;
    }
    
    h1 {
      font-size: 24pt;
      font-weight: bold;
      margin: 24pt 0 12pt 0;
      page-break-after: avoid;
      color: #1a1a1a;
    }
    
    h2 {
      font-size: 18pt;
      font-weight: bold;
      margin: 20pt 0 10pt 0;
      page-break-after: avoid;
      color: #1a1a1a;
    }
    
    h3 {
      font-size: 14pt;
      font-weight: bold;
      margin: 16pt 0 8pt 0;
      page-break-after: avoid;
      color: #1a1a1a;
    }
    
    h4, h5, h6 {
      font-size: 12pt;
      font-weight: bold;
      margin: 12pt 0 6pt 0;
      page-break-after: avoid;
      color: #1a1a1a;
    }
    
    p {
      margin: 0 0 12pt 0;
      text-align: justify;
      orphans: 3;
      widows: 3;
    }
    
    ul, ol {
      margin: 0 0 12pt 0;
      padding-left: 24pt;
    }
    
    li {
      margin: 4pt 0;
    }
    
    li > ul, li > ol {
      margin: 4pt 0;
    }
    
    code {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 10pt;
      background-color: #f5f5f5;
      padding: 1pt 4pt;
      border-radius: 2pt;
    }
    
    pre {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 9pt;
      background-color: #f5f5f5;
      padding: 12pt;
      border-radius: 4pt;
      margin: 12pt 0;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
      page-break-inside: avoid;
    }
    
    pre code {
      background: none;
      padding: 0;
      font-size: inherit;
    }
    
    blockquote {
      border-left: 3pt solid #ccc;
      padding-left: 12pt;
      margin: 12pt 0;
      color: #555;
      font-style: italic;
      page-break-inside: avoid;
    }
    
    a {
      color: #0066cc;
      text-decoration: underline;
    }
    
    a::after {
      content: " (" attr(href) ")";
      font-size: 9pt;
      color: #666;
    }
    
    a[href^="#"]::after,
    a[href^="javascript"]::after {
      content: "";
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
      page-break-inside: avoid;
    }
    
    th, td {
      border: 1pt solid #ddd;
      padding: 8pt;
      text-align: left;
    }
    
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    
    tr:nth-child(even) {
      background-color: #fafafa;
    }
    
    img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
    }
    
    hr {
      border: none;
      border-top: 1pt solid #ddd;
      margin: 24pt 0;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    /* Task lists */
    input[type="checkbox"] {
      margin-right: 6pt;
    }
    
    /* Footer for printed pages */
    @media print {
      @page {
        @bottom-center {
          content: counter(page);
        }
      }
    }
  </style>
</head>
<body>
  ${sanitizedHtml}
</body>
</html>`;

    // Write to iframe
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printDocument);
      doc.close();
    }
  }, [content, title]);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  const handleExportPdf = async () => {
    // Use html2pdf.js if available
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const iframe = iframeRef.current;
      if (!iframe?.contentDocument?.body) return;

      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: title.replace(/\.(md|mdx|markdown)$/i, '') + '.pdf',
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      };

      await html2pdf().set(opt).from(iframe.contentDocument.body).save();
    } catch (error) {
      console.error('Failed to export PDF:', error);
      // Fallback to print dialog
      handlePrint();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: '90%', maxWidth: '900px', height: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
            Print / Export PDF
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-sidebar-hover"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-4" style={{ height: 'calc(100% - 120px)' }}>
          <iframe
            ref={iframeRef}
            className="w-full h-full border border-tab-border rounded"
            style={{ background: 'white' }}
            title="Print Preview"
          />
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button onClick={handlePrint} className="btn btn-secondary">
            Print...
          </button>
          <button onClick={handleExportPdf} className="btn btn-primary">
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

