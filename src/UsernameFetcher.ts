import axios from 'axios';

export const ZORA_USERNAME_API_URL = 'https://cors-anywhere.herokuapp.com/https://zora.co/api/users';

export type UsernameResponseType = {
  address: string;
  bio?: string;
  name?: string;
  username?: string;
  verified?: boolean;
  website?: string;
};

const usernameCache: Record<string, string | null> = {};

export async function getZoraUsername(address: string): Promise<string | null> {
  if (usernameCache[address] !== undefined) {
    return usernameCache[address];
  }

  try {
    const response = await axios.post<UsernameResponseType[]>(
      ZORA_USERNAME_API_URL,
      { addresses: [address] },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 5000,
      }
    );

    const userData = response.data[0];
    const username = userData?.username || null;
    usernameCache[address] = username;
    return username;
  } catch (error) {
    console.error('Error fetching Zora username:', error);
    usernameCache[address] = null;
    return null;
  }
}
