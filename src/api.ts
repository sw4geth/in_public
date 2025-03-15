import { getIPFSUrl } from './utils';

// Determine the API endpoint based on the environment
export const getApiEndpoint = () => {
  // Check if we're running in a browser environment
  if (typeof window !== 'undefined') {
    // In browser: use relative path in production, direct URL in development
    return window.location.hostname === 'localhost' 
      ? 'https://api.zora.co/universal/graphql'
      : '/api/zora-proxy';
  }
  // In SSR or non-browser environment, default to direct API
  return 'https://api.zora.co/universal/graphql';
};

export const fetchComments = async (
  API_ENDPOINT: string,
  IPFS_GATEWAY: string,
  collectionAddress: string,
  chainId: number,
  first: number,
  after: string | null,
  tokenIds: string[]
) => {
  const tokens: Array<{ tokenId: string; comments: any[] }> = [];
  let globalPageInfo = { hasNextPage: false, endCursor: null };
  
  // Use the provided API_ENDPOINT or fall back to our determined endpoint
  const endpoint = API_ENDPOINT || getApiEndpoint();
  console.log(`Using API endpoint: ${endpoint}`);

  const fetchCommentsForToken = async (tokenId: string) => {
    let allComments: any[] = [];
    let pageInfo = { hasNextPage: true, endCursor: null };
    let currentAfter = after;

    const query = `
      query GetTokenComments($collectionAddress: String!, $chainId: Int!, $tokenId: String!, $first: Int, $after: String) {
        collectionOrToken(
          chainId: $chainId
          collectionAddress: $collectionAddress
          tokenId: $tokenId
        ) {
          ... on GraphQLZora1155Token {
            comments(first: $first, after: $after) {
              edges {
                node {
                  comment
                  userAddress
                  userProfile {
                    handle
                    avatar {
                      downloadableUri
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }
    `;

    while (pageInfo.hasNextPage) {
      const variables = {
        collectionAddress,
        chainId,
        tokenId,
        first,
        after: currentAfter,
      };

      try {
        console.log(`Fetching comments for tokenId ${tokenId} from ${endpoint}`);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
          console.error(`HTTP error ${response.status} for tokenId ${tokenId}`);
          return { comments: [], pageInfo: { hasNextPage: false, endCursor: null } };
        }

        const result = await response.json();
        console.log(`API Response status for tokenId ${tokenId}:`, response.status);

        if (result.errors) {
          console.error(`GraphQL errors for tokenId ${tokenId}:`, result.errors);
          return { comments: [], pageInfo: { hasNextPage: false, endCursor: null } };
        }

        const commentsData = result.data?.collectionOrToken?.comments;

        if (!commentsData || !commentsData.edges) {
          console.warn(`No valid comments data for tokenId ${tokenId}`);
          return { comments: [], pageInfo: { hasNextPage: false, endCursor: null } };
        }

        const edges = commentsData.edges || [];
        const comments = edges.map((edge: any) => {
          const node = edge.node || {};
          return {
            comment: node.comment || '',
            userAddress: node.userAddress || '',
            handle: node.userProfile?.handle || '',
            avatar: node.userProfile?.avatar?.downloadableUri
              ? getIPFSUrl(node.userProfile.avatar.downloadableUri, IPFS_GATEWAY)
              : null,
          };
        });

        allComments = [...allComments, ...comments];
        pageInfo = commentsData.pageInfo || { hasNextPage: false, endCursor: null };
        currentAfter = pageInfo.endCursor;
      } catch (error) {
        console.error(`Error fetching comments for tokenId ${tokenId}:`, error);
        return { comments: [], pageInfo: { hasNextPage: false, endCursor: null } };
      }
    }

    return { comments: allComments, pageInfo };
  };

  for (const tokenId of tokenIds) {
    const { comments, pageInfo } = await fetchCommentsForToken(tokenId);
    tokens.push({ tokenId: tokenId.toString(), comments });
    globalPageInfo = pageInfo;
  }

  return { tokens, pageInfo: globalPageInfo };
};