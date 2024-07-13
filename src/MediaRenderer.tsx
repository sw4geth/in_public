import React, { useState, useEffect, useMemo, useRef } from 'react';
import { pdfjs } from 'react-pdf';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import PDFViewer from './PDFViewer';
import { GLTF } from 'three-stdlib';
import ReactMarkdown from 'react-markdown';

pdfjs.GlobalWorkerOptions.workerSrc = `pdf.worker.mjs`;

type MediaType = 'image' | 'video' | 'audio' | 'text' | 'pdf' | 'gltf' | 'html';

interface MediaRendererProps {
  mediaType: MediaType;
  url: string;
  imageUrl?: string;
}

type GLTFResult = GLTF & {
  nodes: { [key: string]: THREE.Mesh }
  materials: { [key: string]: THREE.Material }
}

const MediaRenderer: React.FC<MediaRendererProps> = ({ mediaType, url, imageUrl }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isHTML, setIsHTML] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!url) {
      setError('No media URL available');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    if (mediaType === 'text' || mediaType === 'html') {
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.text();
        })
        .then(text => {
          setContent(text);
          if (mediaType === 'html') {
            setIsHTML(true);
          } else {
            const lowerCaseText = text.trim().toLowerCase();
            const isHTMLContent = lowerCaseText.startsWith('<!doctype html') || lowerCaseText.startsWith('<html');
            setIsHTML(isHTMLContent);
          }
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching content:', error);
          setError(error.message);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [mediaType, url]);

  useEffect(() => {
    if (isHTML && iframeRef.current) {
      const iframe = iframeRef.current;
      iframe.srcdoc = content;
    }
  }, [isHTML, content]);

  const Model: React.FC<{ url: string }> = ({ url }) => {
    const { scene } = useGLTF(url) as GLTFResult;
    return <primitive object={scene} />;
  };

  const options = useMemo(() => ({
    cMapUrl: 'https://unpkg.com/pdfjs-dist@2.9.359/cmaps/',
    cMapPacked: true,
  }), []);

  if (loading) {
    return <div className="media-container">Loading...</div>;
  }

  if (error) {
    return <div className="media-container">Error: {error}</div>;
  }

  const renderHTMLContent = () => (
    <iframe
      ref={iframeRef}
      style={{ width: '100%', height: '500px', border: 'none' }}
      sandbox="allow-scripts allow-same-origin"
      title="HTML Content"
    />
  );

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
    case 'html':
      return (
        <div className="media-container html-container">
          {renderHTMLContent()}
        </div>
      );
    case 'text':
      return (
        <div className="media-container text-container">
          {isHTML ? renderHTMLContent() : <ReactMarkdown>{content}</ReactMarkdown>}
        </div>
      );
    case 'pdf':
      return <PDFViewer url={url} options={options} />;
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
      // Render as text for unsupported media types
      return (
        <div className="media-container text-container">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      );
  }
};

export default MediaRenderer;
