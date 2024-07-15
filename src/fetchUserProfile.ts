const DEFAULT_AVATAR_TEMPLATE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="gzr-{ADDRESS}" gradientTransform="translate(66.4578 24.3575) scale(75.2908)" gradientUnits="userSpaceOnUse" r="1" cx="0" cy="0%">
      <stop offset="15.62%" stop-color="hsl({HUE}, 70%, 85%)" />
      <stop offset="39.58%" stop-color="hsl({HUE}, 75%, 63%)" />
      <stop offset="72.92%" stop-color="hsl({HUE}, 79%, 41%)" />
      <stop offset="90.63%" stop-color="hsl({HUE}, 81%, 32%)" />
      <stop offset="100%" stop-color="hsl({HUE}, 81%, 32%)" />
    </radialGradient>
  </defs>
  <g>
    <path d="M100 50C100 22.3858 77.6142 0 50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100C77.6142 100 100 77.6142 100 50Z" fill="url(#gzr-{ADDRESS})" />
    <path stroke="rgba(0,0,0,0.075)" fill="transparent" stroke-width="1" d="M50,0.5c27.3,0,49.5,22.2,49.5,49.5S77.3,99.5,50,99.5S0.5,77.3,0.5,50S22.7,0.5,50,0.5z" />
  </g>
</svg>
`;

const generateColor = (address) => {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 360; // Use the hash to generate a hue value between 0 and 359
};

const createDefaultAvatar = (address) => {
  const hue = generateColor(address);
  return DEFAULT_AVATAR_TEMPLATE
    .replace(/{ADDRESS}/g, address.slice(2, 10))
    .replace(/{HUE}/g, hue);
};

const fetchAndEncodeAvatar = async (address, CORS_PROXY) => {
  try {
    const response = await fetch(`${CORS_PROXY}https://zora.co/api/avatar/${address}`);
    if (!response.ok) throw new Error(`Failed to fetch avatar for ${address}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error fetching avatar for ${address}:`, error);
    return null;
  }
};

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
          // If the avatar URL starts with '/api/avatar/', fetch and encode it
          console.log(`Fetching and encoding avatar for ${address}`);
          avatar = await fetchAndEncodeAvatar(address, CORS_PROXY);
        }

        if (!avatar) {
          // If no avatar is provided or fetching failed, use the default avatar
          avatar = `data:image/svg+xml;base64,${btoa(createDefaultAvatar(address))}`;
        }

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
            avatar: `data:image/svg+xml;base64,${btoa(createDefaultAvatar(address))}`
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
