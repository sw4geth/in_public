const DEFAULT_AVATAR = './zorb.svg';

export const fetchUserProfiles = async (addresses, CORS_PROXY) => {
  try {
    const uniqueAddresses = [...new Set(addresses)];
    const fetchPromises = uniqueAddresses.map(async address => {
      try {
        const profileResponse = await fetch(`${CORS_PROXY}https://zora.co/api/profiles/${address}`);
        if (!profileResponse.ok) throw new Error(`Failed to fetch profile for ${address}`);
        const profileData = await profileResponse.json();

        let avatar = profileData.avatar;
        if (avatar && avatar.startsWith('/api/avatar/')) {
          // If the avatar URL starts with 'api/avatar/', use the default avatar
          console.log(`Using default avatar for ${address} `);
          avatar = DEFAULT_AVATAR;
        } else if (!avatar) {
          // If no avatar is provided, use the default avatar
          avatar = DEFAULT_AVATAR;
        }
        // In all other cases, use the provided avatar URL

        return {
          address,
          data: {
            username: profileData.username || profileData.displayName || null,
            avatar: avatar
          }
        };
      } catch (error) {
        console.error(`Error fetching profile for ${address}:`, error);
        return {
          address,
          data: {
            username: null,
            avatar: DEFAULT_AVATAR
          }
        };
      }
    });

    const results = await Promise.all(fetchPromises);
    const profiles = {};
    for (const { address, data } of results) {
      profiles[address] = data;
    }
    return profiles;
  } catch (error) {
    console.error('Error fetching user profiles:', error);
    return {};
  }
};
