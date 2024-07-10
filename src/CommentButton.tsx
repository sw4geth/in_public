import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSwitchChain } from 'wagmi';

const CommentButton = ({
  handleMint,
  tokenId,
  minting,
  isPending,
  isConfirming,
  expectedChainId,
  expectedNetworkName
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const { isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    setIsCorrectNetwork(chain?.id === expectedChainId);
  }, [chain, expectedChainId]);

  const getButtonText = () => {
    if (!isConnected) return isHovered ? "Connect" : "Comment";
    if (!isCorrectNetwork) return `Switch to ${expectedNetworkName}`;
    if (isPending) return "Waiting for Approval...";
    if (isConfirming) return "Confirming...";
    if (minting[tokenId]) return "Minting...";
    return "Comment";
  };

  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => {
        const handleClick = () => {
          if (!isConnected) {
            openConnectModal();
          } else if (!isCorrectNetwork && switchChain) {
            switchChain({ chainId: expectedChainId });
          } else if (isCorrectNetwork) {
            handleMint(tokenId);
          }
        };

        return (
          <button
            className="comment-button"
            onClick={handleClick}
            disabled={isConfirming || (isConnected && isPending) || (isConnected && minting[tokenId])}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {getButtonText()}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default CommentButton;
