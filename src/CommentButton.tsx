import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSwitchChain } from 'wagmi';

interface CommentButtonProps {
  handleMint: (tokenId: string) => void;
  tokenId: string;
  minting: Record<string, boolean>;
  isPending: boolean;
  isConfirming: boolean;
  expectedChainId: number;
  expectedNetworkName: string;
  commentText?: string;
}

const CommentButton = ({
  handleMint,
  tokenId,
  minting,
  isPending,
  isConfirming,
  expectedChainId,
  expectedNetworkName,
  commentText,
}: CommentButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const { isConnected, chain } = useAccount();
  const { switchChain, error: switchChainError } = useSwitchChain();

  useEffect(() => {
    setIsCorrectNetwork(chain?.id === expectedChainId);
  }, [chain, expectedChainId]);

  const getButtonText = () => {
    if (!isConnected) {
      return isHovered ? 'Connect' : 'Comment';
    }

    if (!isCorrectNetwork) {
      return isHovered ? `Switch to ${expectedNetworkName}` : 'Comment';
    }

    if (isPending) {
      return 'Pending...';
    }

    if (isConfirming) {
      return 'Confirming...';
    }

    if (minting[tokenId]) {
      return 'Minting...';
    }

    return 'Comment';
  };

  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => {
        const handleClick = async () => {
          if (!isConnected) {
            // Not connected: Open wallet connect modal
            openConnectModal();
            return;
          }

          if (!isCorrectNetwork) {
            // Wrong chain: Switch to the expected chain
            try {
              await switchChain({ chainId: expectedChainId });
            } catch (err) {
              console.error('Error switching chain:', err);
              alert(`Failed to switch to ${expectedNetworkName}. Please switch manually.`);
            }
            return;
          }

          // Connected and on correct chain: Proceed with minting
          if (!commentText) {
            alert('Please enter a comment before minting.');
            return;
          }

          try {
            await handleMint(tokenId);
          } catch (err) {
            console.error('Error during minting:', err);
            // Error handling is already managed in App.tsx, but we can add additional feedback if needed
          }
        };

        return (
          <button
            className="comment-button"
            onClick={handleClick}
            disabled={isPending || isConfirming || minting[tokenId]}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title={
              !isConnected
                ? 'Connect your wallet to comment'
                : !isCorrectNetwork
                ? `Switch to ${expectedNetworkName} to comment`
                : 'Post your comment'
            }
          >
            {getButtonText()}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default CommentButton;