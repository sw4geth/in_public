import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  zora,
  mainnet,
  optimism,
  polygon,
  sepolia,
  zoraSepolia
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'RainbowKit demo',
  projectId: '5d3599ea3a811fa7185a1b0ef5661da1',
  chains: [
    mainnet,
    zora,
    polygon,
    optimism,
    arbitrum,
    base,
    sepolia,
    zoraSepolia
  ],
});
