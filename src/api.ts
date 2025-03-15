import { getIPFSUrl } from './utils';

// Determine the API endpoint based on the hostname
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const ZORA_API_ENDPOINT = isLocalhost
  ? 'https://api.zora.co/universal/graphql'
  : '/api/zora-proxy';

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
        const response = await fetch(API_ENDPOINT || ZORA_API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, variables }),
        });

        const result = await response.json();
        console.log(`Full API Response for tokenId ${tokenId}:`, JSON.stringify(result, null, 2));

        if (result.errors) {
          console.error(`GraphQL errors for tokenId ${tokenId}:`, JSON.stringify(result.errors, null, 2));
          return { comments: [], pageInfo: { hasNextPage: false, endCursor: null } };
        }

        const commentsData = result.data?.collectionOrToken?.comments;
        console.log(`Comments data structure for tokenId ${tokenId}:`, commentsData);

        if (!commentsData || !commentsData.edges) {
          console.warn(`No valid comments data for tokenId ${tokenId}`);
          return { comments: [], pageInfo: { hasNextPage: false, endCursor: null } };
        }

        const edges = commentsData.edges || [];
        console.log(`Edges for tokenId ${tokenId}:`, edges);

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

        console.log(`Processed comments for tokenId ${tokenId}:`, comments);

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

  console.log(`Final tokens array from fetchComments:`, tokens);
  return { tokens, pageInfo: globalPageInfo };
};