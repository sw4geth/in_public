import { determineMediaType, getIPFSUrl } from './utils';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to determine if we're in production or development
const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production' || 
         window.location.hostname !== 'localhost';
};

// Get the appropriate API endpoint based on environment
const getApiEndpoint = (originalEndpoint: string): string => {
  if (isProduction()) {
    // In production, use our Vercel serverless function
    // This avoids CORS issues by proxying through the same origin
    return '/api/zora-proxy';
  } else {
    // In development, we can use the direct endpoint
    // as CORS is typically not an issue in local dev
    return originalEndpoint;
  }
};

export const createFetchTokenDataQuery = (collectionAddress: string, chainId: number, limit: number, after: string | null, tokenId: string | null) => `
  query GetTokenData($after: String, $collectionAddress: String!, $chainId: Int!, $tokenId: String) {
    collectionOrToken(
      chainId: $chainId
      collectionAddress: $collectionAddress
      ${tokenId ? `tokenId: $tokenId` : ''}
    ) {
      ... on GraphQLZora1155Token {
        id
        totalTokenMints
        tokenId: id
        name
        address
        chainId
        chainName
        createdAt
        creatorAddress
        description
        media {
          mimeType
          originalUri
          downloadableUri
        }
        mediaContent {
          mimeType
          originalUri
        }
        tokenStandard
        tokenUri
        comments(first: ${limit}, after: $after) {
          edges {
            node {
              userAddress
              userProfile {
                ... on GraphQLAccountProfile {
                  username
                  avatar {
                    originalUri
                  }
                }
              }
              comment
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }
`;

export const fetchTokenData = async (API_ENDPOINT: string, IPFS_GATEWAY: string, collectionAddress: string, chainId: number, limit: number, after: string | null, tokenId: string | null = null, retries = 3, initialDelay = 1000) => {
  const query = createFetchTokenDataQuery(collectionAddress, chainId, limit, after, tokenId);
  // Get the appropriate endpoint based on environment
  const endpoint = getApiEndpoint(API_ENDPOINT);

  const executeRequest = async (delay: number): Promise<any> => {
    await wait(delay);

    try {
      console.log(`Making request to: ${endpoint}`);
      const results = await fetch(endpoint, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables: { after, collectionAddress, chainId, tokenId } })
      });

      if (results.status === 429) {
        const retryAfter = results.headers.get('Retry-After');
        const retryDelay = retryAfter ? parseInt(retryAfter) * 1000 : delay * 2;

        if (retries > 0) {
          console.log(`Rate limited. Retrying in ${retryDelay}ms...`);
          return executeRequest(retryDelay);
        } else {
          throw new Error('Rate limit exceeded. Max retries reached.');
        }
      }

      if (!results.ok) {
        const text = await results.text();
        console.error(`HTTP error! status: ${results.status}, response: ${text}`);
        throw new Error(`HTTP error! status: ${results.status}`);
      }

      const allData = await results.json();
      console.log('API Response:', allData);

      if (allData.errors) {
        console.error('GraphQL Errors:', allData.errors);
        throw new Error(allData.errors[0].message);
      }

      if (!allData.data || !allData.data.collectionOrToken) {
        console.error('Unexpected API response structure:', allData);
        throw new Error('Unexpected API response structure');
      }

      return allData;
    } catch (error) {
      console.error('Fetch error details:', error instanceof Error ? error.message : String(error));
      if (retries > 0) {
        console.log(`Error occurred. Retrying in ${delay}ms...`);
        return executeRequest(delay * 2);
      } else {
        throw error;
      }
    }
  };

  try {
    const allData = await executeRequest(initialDelay);

    const tokenData = allData.data.collectionOrToken;
    if (!tokenData) throw new Error('No token data returned');

    const metadata = {
      content: {
        mime: tokenData.media?.mimeType,
        uri: tokenData.media?.originalUri || tokenData.mediaContent?.originalUri
      },
      image: tokenData.media?.downloadableUri || null,
      name: tokenData.name || 'Unnamed Token'
    };
    const mediaType = determineMediaType(metadata.content?.mime || '');
    const mediaURL = getIPFSUrl(metadata.content?.uri || '', IPFS_GATEWAY);
    const imageURL = mediaType === 'audio' ? getIPFSUrl(metadata.image || '', IPFS_GATEWAY) : null;

    const comments = tokenData.comments?.edges.map(edge => ({
      fromAddress: edge.node.userAddress,
      comment: edge.node.comment,
      quantity: 1,
      blockNumber: null,
      blockTimestamp: null,
      transactionHash: null,
      username: edge.node.userProfile?.username || edge.node.userAddress,
      avatar: edge.node.userProfile?.avatar?.originalUri ? getIPFSUrl(edge.node.userProfile.avatar.originalUri, IPFS_GATEWAY) : null
    })) || [];

    const token = {
      tokenId: tokenData.tokenId,
      mediaType,
      mediaURL,
      comments,
      imageURL,
      metadata,
      originatorAddress: tokenData.creatorAddress || null,
      toAddress: tokenData.creatorAddress || null
    };

    return {
      tokens: [token],
      pageInfo: tokenData.comments?.pageInfo || { endCursor: null, hasNextPage: false }
    };
  } catch (error) {
    console.error('Final error in fetchTokenData:', error);
    throw error;
  }
};