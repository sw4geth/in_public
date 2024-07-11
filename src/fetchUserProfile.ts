export const fetchUserProfiles = async (addresses, CORS_PROXY) => {
  try {
    const uniqueAddresses = [...new Set(addresses)];
    const fetchPromises = uniqueAddresses.map(address =>
      fetch(`${CORS_PROXY}https://zora.co/api/profiles/${address}`)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch profile for ${address}`);
          return response.json();
        })
        .then(data => ({ address, data }))
        .catch(error => {
          console.error(`Error fetching profile for ${address}:`, error);
          return { address, data: null };
        })
    );

    const results = await Promise.all(fetchPromises);

    const profiles = {};
    for (const { address, data } of results) {
      if (data) {
        profiles[address] = {
          username: data.username || data.displayName || null,
          avatar: data.avatar || null
        };
      } else {
        profiles[address] = null;
      }
    }

    return profiles;
  } catch (error) {
    console.error('Error fetching user profiles:', error);
    return {};
  }
};


export const fetchUserProfile = async (address, userProfiles, setUserProfiles, USE_USERNAMES, CORS_PROXY) => {
  if (!USE_USERNAMES) return null;

  console.log(`Checking cache for address: ${address}`);
  if (userProfiles[address]) {
    console.log(`Profile found in cache for address: ${address}`, userProfiles[address]);
    return userProfiles[address];
  }

  try {
    console.log(`Fetching profile for address: ${address}`);
    const profiles = await fetchUserProfiles([address], CORS_PROXY);
    if (profiles[address]) {
      setUserProfiles(prev => ({ ...prev, [address]: profiles[address] }));
      console.log(`Profile fetched and saved for address: ${address}`, profiles[address]);
      return profiles[address];
    }
    console.log(`No profile found for address: ${address}`);
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};
