export const determineMediaType = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'text/plain' || mimeType === 'application/json') return 'text';
  if (mimeType === 'text/html') return 'html';
  if (mimeType === 'model/gltf-binary') return 'gltf';
  return 'unknown';
}

export const getIPFSUrl = (uri: string, IPFS_GATEWAY: string): string => {
  if (uri.startsWith('ipfs://')) {
    return IPFS_GATEWAY + uri.slice(7);
  }
  return uri;
}

export const getColorFromAddress = (address: string): string => {
  const colorCode = address.slice(-6);
  return `#${colorCode}`;
}
