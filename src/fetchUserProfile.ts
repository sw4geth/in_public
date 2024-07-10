export const fetchUserProfile = async (address: string, userProfiles: any, setUserProfiles: any, USE_USERNAMES: boolean, CORS_PROXY: string) => {
  if (!USE_USERNAMES) return null;
  if (userProfiles[address]) return userProfiles[address];
  try {
    const response = await fetch(`${CORS_PROXY}https://zora.co/api/profiles/${address}`);
    if (!response.ok) throw new Error('Failed to fetch user profile');
    const data = await response.json();
    const profile = {
      username: data.username || data.displayName || null,
      avatar: data.avatar || null
    };
    setUserProfiles(prev => ({ ...prev, [address]: profile }));
    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};
