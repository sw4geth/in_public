import { determineMediaType, getIPFSUrl } from './utils';

export const createFetchTokenDataQuery = (collectionAddress: string, network: string, chain: string) => `
  query getData {
    tokens(
      where: {collectionAddresses: "${collectionAddress}"}
      networks: {network: ${network}, chain: ${chain}}
      sort: {sortKey: MINTED, sortDirection: ASC}
    ) {
      nodes {
        token {
          metadata
          tokenId
          mintInfo {
            mintContext {
              blockNumber
              blockTimestamp
              transactionHash
            }
          }
        }
      }
    }
    mintComments(
      networks: {network: ${network}, chain: ${chain}}
      where: {collectionAddress: "${collectionAddress}"}
    ) {
      comments {
        tokenId
        fromAddress
        comment
        transactionInfo {
          blockNumber
          blockTimestamp
          transactionHash
        }
      }
    }
  }`;

export const fetchTokenData = async (API_ENDPOINT: string, IPFS_GATEWAY: string, collectionAddress: string, network: string, chain: string) => {
  const query = createFetchTokenDataQuery(collectionAddress, network, chain);

  const results = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });

  const allData = await results.json();

  if (allData.errors) {
    throw new Error(allData.errors[0].message);
  }

  return allData.data.tokens.nodes.map(node => {
    const token = node.token;
    const metadata = token.metadata;
    const mediaType = determineMediaType(metadata.content.mime);
    const mediaURL = getIPFSUrl(metadata.content.uri, IPFS_GATEWAY);
    const imageURL = mediaType === 'audio' ? getIPFSUrl(metadata.image, IPFS_GATEWAY) : null;

    const comments = allData.data.mintComments.comments
      .filter(comment => comment.tokenId === token.tokenId)
      .map(comment => ({
        fromAddress: comment.fromAddress,
        comment: comment.comment,
        blockNumber: comment.transactionInfo.blockNumber
      }));

    return {
      tokenId: token.tokenId,
      mediaType,
      mediaURL,
      comments,
      imageURL,
      metadata,
      blockNumber: token.mintInfo.mintContext.blockNumber
    };
  });
}
