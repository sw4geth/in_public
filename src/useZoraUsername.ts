import { useState, useEffect } from 'react';
import { getZoraUsername } from './UsernameFetcher';

export function useZoraUsername(address: string) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getZoraUsername(address).then((result) => {
      if (isMounted) {
        setUsername(result);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [address]);

  return { username, loading };
}
