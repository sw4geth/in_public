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
    return "🚧";
  };

  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => {
        const handleClick = () => {
          console.log("Comment functionality temporarily disabled");
          alert("Commenting functionality is temporarily disabled for maintenance. Please check back later.");
        };

        return (
          <button
            className="comment-button"
            onClick={handleClick}
            disabled={true}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title="Commenting functionality temporarily disabled for maintenance"
          >
            {getButtonText()}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default CommentButton;
