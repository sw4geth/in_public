import React, { useState, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';

pdfjs.GlobalWorkerOptions.workerSrc = `pdf.worker.mjs`;

const MediaRenderer = ({ mediaType, url, imageUrl }) => {
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageWidth, setPageWidth] = useState(400);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!url) {
      setError('No media URL available');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    if (mediaType === 'text') {
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.text();
        })
        .then(text => {
          setTextContent(text);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching text content:', error);
          setError(error.message);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [mediaType, url]);

  useEffect(() => {
    const handleResize = () => {
      const maxWidth = Math.min(400, window.innerWidth - 40);
      setPageWidth(maxWidth);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const Model = ({ url }) => {
    const { scene } = useGLTF(url);
    return <primitive object={scene} />;
  };

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset) {
    setIsTransitioning(true);
    setTimeout(() => {
      setPageNumber(prevPageNumber => {
        const newPageNumber = prevPageNumber + offset;
        return Math.max(1, Math.min(newPageNumber, numPages));
      });
      setIsTransitioning(false);
    }, 300);
  }

  const options = useMemo(() => ({
    cMapUrl: 'https://unpkg.com/pdfjs-dist@2.9.359/cmaps/',
    cMapPacked: true,
  }), []);

  if (loading || error) {
    return <div className="media-container" />;
  }

  switch(mediaType) {
    case 'image':
      return (
        <div className="media-container image-container">
          <img src={url} alt="NFT" />
        </div>
      );
    case 'video':
      return (
        <div className="media-container video-container">
          <video controls>
            <source src={url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    case 'audio':
      return (
        <div className="media-container audio-container">
          <div className="audio-image-container">
            {imageUrl && <img src={imageUrl} alt="Audio cover" className="audio-image" />}
          </div>
          <div className="audio-player-container">
            <audio controls className="audio-player">
              <source src={url} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      );
    case 'text':
      return <div className="media-container text-container">{textContent}</div>;
    case 'pdf':
      return (
        <div className="media-container pdf-container">
          <div className="pdf-document">
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
          <div className="pdf-navigation">
            <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="pdf-button">
              {'<'}
            </button>
            <span className="pdf-page-info">
              Page {pageNumber} of {numPages || '--'}
            </span>
            <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className="pdf-button">
              {'>'}
            </button>
          </div>
        </div>
      );
    case 'gltf':
      return (
        <div className="media-container gltf-container">
          <Canvas>
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <Model url={url} />
            <OrbitControls />
          </Canvas>
        </div>
      );
    default:
      return <div className="media-container" />;
  }
};

export default MediaRenderer;
