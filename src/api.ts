import { determineMediaType, getIPFSUrl } from './utils';

export const fetchTokenData = async (API_ENDPOINT: string, IPFS_GATEWAY: string) => {
  const query = `
    query getData {
      tokens(
        where: {collectionAddresses: "0x9e2e41d622ddf5c561d57407c6fdfb4f92bf9e1e"}
        networks: {network: ZORA, chain: ZORA_SEPOLIA}
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
        networks: {network: ZORA, chain: ZORA_SEPOLIA}
        where: {collectionAddress: "0x9e2e41d622ddf5c561d57407c6fdfb4f92bf9e1e"}
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
