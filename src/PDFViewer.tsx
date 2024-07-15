import React, { useState, useRef, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { Maximize, Minimize, Download } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  options: any;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, options }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        const aspectRatio = 1.414; // Assuming A4 paper size
        const maxWidth = isFullscreen
          ? Math.min(containerWidth - 40, (containerHeight - 80) * aspectRatio)
          : containerWidth - 40;
        setPageWidth(Math.max(maxWidth, 280)); // Ensure minimum width for readability
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setPageNumber(prevPageNumber => {
        const newPageNumber = prevPageNumber + offset;
        return Math.max(1, Math.min(newPageNumber, numPages || 1));
      });
      setIsTransitioning(false);
    }, 300);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const diffX = touch.clientX - startX;
      const diffY = touch.clientY - startY;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 50) {
          changePage(-1);
        } else if (diffX < -50) {
          changePage(1);
        }
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', () => {
      document.removeEventListener('touchmove', handleTouchMove);
    }, { once: true });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'document.pdf'; // You can customize the download filename here
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`pdf-viewer ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
      <div className="pdf-document" onTouchStart={handleTouchStart}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          options={options}
        >
          <div className={`pdf-page ${isTransitioning ? 'transitioning' : ''}`}>
            <Page
              key={`page_${pageNumber}`}
              pageNumber={pageNumber}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </div>
        </Document>
      </div>
      <div className="pdf-controls">

        <button
          onClick={() => changePage(-1)}
          disabled={pageNumber <= 1}
          className="pdf-button"
        >
          Previous
        </button>

        <span className="pdf-page-info">
          Page {pageNumber} of {numPages || '--'}
        </span>

        <button
          onClick={() => changePage(1)}
          disabled={pageNumber >= (numPages || 0)}
          className="pdf-button"
        >
          Next
        </button>
        <button onClick={handleDownload} className="pdf-download-button">
        <Download size={24} />
        </button>
        <button onClick={toggleFullscreen} className="pdf-fullscreen-button">
          {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
        </button>

      </div>
    </div>
  );
};

export default PDFViewer;
