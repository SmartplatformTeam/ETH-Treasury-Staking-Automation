export type NetworkName = "MAINNET" | "HOLESKY" | "HOODI";

export type NetworkConfig = {
  network: NetworkName;
  chainId: number;
  depositContract: string;
  label: string;
};

export const networkConfigs: Record<NetworkName, NetworkConfig> = {
  MAINNET: {
    network: "MAINNET",
    chainId: 1,
    depositContract: "0x00000000219ab540356cBB839Cbe05303d7705Fa",
    label: "Ethereum Mainnet"
  },
  HOLESKY: {
    network: "HOLESKY",
    chainId: 17000,
    depositContract: "0x4242424242424242424242424242424242424242",
    label: "Holesky Testnet"
  },
  HOODI: {
    network: "HOODI",
    chainId: 560048,
    depositContract: "0x4242424242424242424242424242424242424242",
    label: "Hoodi Testnet"
  }
};

export function getNetworkConfig(network: NetworkName): NetworkConfig {
  const cfg = networkConfigs[network];
  if (!cfg) {
    throw new Error(`Unknown network '${network}'`);
  }
  return cfg;
}

/** 32 ETH in wei, as decimal string (Safe Tx Service convention). */
export const ETH_32_WEI = "32000000000000000000";

/** 32 ETH in gwei, as decimal string. */
export const ETH_32_GWEI = "32000000000";
