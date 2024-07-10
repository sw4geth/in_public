
import { fetchTokenData } from './api';
import { fetchUserProfile } from './fetchUserProfile';

export const getData = async (
  API_ENDPOINT: string,
  IPFS_GATEWAY: string,
  COLLECTION_ADDRESS: string,
  NETWORK: string,
  CHAIN: string,
  USE_USERNAMES: boolean,
  CORS_PROXY: string,
  userProfiles: any,
  setUserProfiles: any,
  setTokens: any,
  setError: any
) => {
  try {
    const tokenData = await fetchTokenData(API_ENDPOINT, IPFS_GATEWAY, COLLECTION_ADDRESS, NETWORK, CHAIN);
    setTokens(tokenData);

    // Fetch user profiles for all unique addresses in comments
    const uniqueAddresses = new Set(tokenData.flatMap(token =>
      token.comments.map(comment => comment.fromAddress)
    ));

    for (const address of uniqueAddresses) {
      await fetchUserProfile(address, userProfiles, setUserProfiles, USE_USERNAMES, CORS_PROXY);
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    setError(error.message);
  }
};
