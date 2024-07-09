import React, { useState, useEffect, useMemo } from 'react';
import { pdfjs } from 'react-pdf';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import PDFViewer from './PDFViewer.tsx';  // Import the PDFViewer component
import { GLTF } from 'three-stdlib';

pdfjs.GlobalWorkerOptions.workerSrc = `pdf.worker.mjs`;

type MediaType = 'image' | 'video' | 'audio' | 'text' | 'pdf' | 'gltf';

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
  const [textContent, setTextContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const Model: React.FC<{ url: string }> = ({ url }) => {
    const { scene } = useGLTF(url) as GLTFResult;
    return <primitive object={scene} />;
  };

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
      return <PDFViewer url={url} options={options} />;  // Use the PDFViewer component
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
