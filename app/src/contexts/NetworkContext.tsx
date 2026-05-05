"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type SolanaNetwork = "devnet" | "testnet" | "mainnet-beta";

interface NetworkConfig {
  name: string;
  endpoint: string;
  label: string;
  color: string;
  dotColor: string;
  explorerUrl: string;
  warning?: string;
}

export const NETWORK_CONFIGS: Record<SolanaNetwork, NetworkConfig> = {
  devnet: {
    name: "devnet",
    endpoint: "https://api.devnet.solana.com",
    label: "Devnet",
    color: "var(--sol-green)",
    dotColor: "#00F5A0",
    explorerUrl: "https://explorer.solana.com",
    warning: undefined,
  },
  testnet: {
    name: "testnet",
    endpoint: "https://api.testnet.solana.com",
    label: "Testnet",
    color: "var(--sol-gold)",
    dotColor: "#FFD700",
    explorerUrl: "https://explorer.solana.com",
    warning: undefined,
  },
  "mainnet-beta": {
    name: "mainnet-beta",
    endpoint: "https://api.mainnet-beta.solana.com",
    label: "Mainnet",
    color: "var(--sol-red)",
    dotColor: "#FF3B5C",
    explorerUrl: "https://explorer.solana.com",
    warning:
      "⚠️ You are on Mainnet. All transactions use REAL SOL and are irreversible.",
  },
};

interface NetworkContextType {
  network: SolanaNetwork;
  config: NetworkConfig;
  setNetwork: (network: SolanaNetwork) => void;
  isMainnet: boolean;
  explorerTxUrl: (txHash: string) => string;
  explorerAccountUrl: (address: string) => string;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

const STORAGE_KEY = "axiom-network";

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<SolanaNetwork>("devnet");
  const [initialized, setInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SolanaNetwork | null;
    if (stored && NETWORK_CONFIGS[stored]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNetworkState(stored);
    }
    setInitialized(true);
  }, []);

  const setNetwork = useCallback((net: SolanaNetwork) => {
    setNetworkState(net);
    localStorage.setItem(STORAGE_KEY, net);
  }, []);

  const config = NETWORK_CONFIGS[network];

  const explorerTxUrl = useCallback(
    (txHash: string) =>
      `${config.explorerUrl}/tx/${txHash}${network !== "mainnet-beta" ? `?cluster=${network}` : ""}`,
    [config.explorerUrl, network]
  );

  const explorerAccountUrl = useCallback(
    (address: string) =>
      `${config.explorerUrl}/address/${address}${network !== "mainnet-beta" ? `?cluster=${network}` : ""}`,
    [config.explorerUrl, network]
  );

  if (!initialized) return null;

  return (
    <NetworkContext.Provider
      value={{
        network,
        config,
        setNetwork,
        isMainnet: network === "mainnet-beta",
        explorerTxUrl,
        explorerAccountUrl,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}
