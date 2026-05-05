"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useNetwork, NETWORK_CONFIGS, SolanaNetwork } from "@/contexts/NetworkContext";
import styles from "./Navbar.module.css";

const NETWORKS: { id: SolanaNetwork; label: string; icon: string; color: string }[] = [
  { id: "devnet", label: "Devnet", icon: "🟢", color: "#00F5A0" },
  { id: "testnet", label: "Testnet", icon: "🟡", color: "#FFD700" },
  { id: "mainnet-beta", label: "Mainnet", icon: "🔴", color: "#FF3B5C" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false);
  const [showMainnetWarning, setShowMainnetWarning] = useState(false);
  const [pendingNetwork, setPendingNetwork] = useState<SolanaNetwork | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { network, setNetwork } = useNetwork();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNetworkDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isActive = (path: string) => pathname === path;

  const handleWalletClick = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const handleNetworkSelect = (net: SolanaNetwork) => {
    if (net === "mainnet-beta" && network !== "mainnet-beta") {
      setPendingNetwork(net);
      setShowMainnetWarning(true);
      setNetworkDropdownOpen(false);
      return;
    }
    setNetwork(net);
    setNetworkDropdownOpen(false);
  };

  const confirmMainnet = () => {
    if (pendingNetwork) {
      setNetwork(pendingNetwork);
    }
    setShowMainnetWarning(false);
    setPendingNetwork(null);
  };

  const cancelMainnet = () => {
    setShowMainnetWarning(false);
    setPendingNetwork(null);
  };

  const truncateAddress = (address: string) =>
    `${address.slice(0, 4)}...${address.slice(-4)}`;

  const currentNet = NETWORKS.find((n) => n.id === network)!;

  return (
    <>
      <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`} id="main-nav">
        <div className={`container ${styles.navInner}`}>
          <Link href="/" className={styles.logo} id="nav-logo">
            <span className={styles.logoIcon}>◆</span>
            <span className={styles.logoText}>Axiom</span>
          </Link>

          {/* Desktop links */}
          <div className={styles.navLinks}>
            <Link href="/playground" className={`${styles.navLink} ${isActive("/playground") ? styles.navLinkActive : ""}`}>
              ⚡ Playground
            </Link>
            <Link href="/dashboard" className={`${styles.navLink} ${isActive("/dashboard") ? styles.navLinkActive : ""}`}>
              🖥️ Nodes
            </Link>
            <Link href="/explorer" className={`${styles.navLink} ${isActive("/explorer") ? styles.navLinkActive : ""}`}>
              🔍 Explorer
            </Link>
            <Link href="/docs" className={`${styles.navLink} ${isActive("/docs") ? styles.navLinkActive : ""}`}>
              📄 Docs
            </Link>
          </div>

          <div className={styles.navActions}>
            {/* Network Dropdown */}
            <div className={styles.networkDropdownWrapper} ref={dropdownRef}>
              <button
                className={styles.networkBadge}
                onClick={() => setNetworkDropdownOpen(!networkDropdownOpen)}
                id="network-selector"
              >
                <span
                  className={styles.networkDot}
                  style={{ background: currentNet.color }}
                />
                {currentNet.label}
                <span className={styles.networkChevron}>
                  {networkDropdownOpen ? "▲" : "▼"}
                </span>
              </button>

              {networkDropdownOpen && (
                <div className={styles.networkDropdown}>
                  <div className={styles.networkDropdownHeader}>Select Network</div>
                  {NETWORKS.map((net) => (
                    <button
                      key={net.id}
                      className={`${styles.networkOption} ${net.id === network ? styles.networkOptionActive : ""}`}
                      onClick={() => handleNetworkSelect(net.id)}
                      id={`network-${net.id}`}
                    >
                      <span className={styles.networkOptionDot} style={{ background: net.color }} />
                      <div className={styles.networkOptionInfo}>
                        <span className={styles.networkOptionLabel}>{net.label}</span>
                        <span className={styles.networkOptionUrl}>
                          {NETWORK_CONFIGS[net.id].endpoint.replace("https://", "")}
                        </span>
                      </div>
                      {net.id === network && <span className={styles.networkCheck}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className={`${styles.walletBtn} ${connected ? styles.walletConnected : ""}`}
              onClick={handleWalletClick}
              id="connect-wallet-btn"
            >
              {connected && publicKey ? (
                <>
                  <span className={styles.walletDot} />
                  {truncateAddress(publicKey.toBase58())}
                </>
              ) : (
                "Connect Wallet"
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              className={`${styles.hamburger} ${mobileOpen ? styles.hamburgerOpen : ""}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              id="mobile-menu-btn"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className={styles.mobileMenu}>
            <Link href="/playground" className={`${styles.mobileLink} ${isActive("/playground") ? styles.mobileLinkActive : ""}`}>
              ⚡ Playground
            </Link>
            <Link href="/dashboard" className={`${styles.mobileLink} ${isActive("/dashboard") ? styles.mobileLinkActive : ""}`}>
              🖥️ Nodes
            </Link>
            <Link href="/explorer" className={`${styles.mobileLink} ${isActive("/explorer") ? styles.mobileLinkActive : ""}`}>
              🔍 Explorer
            </Link>
            <Link href="/docs" className={`${styles.mobileLink} ${isActive("/docs") ? styles.mobileLinkActive : ""}`}>
              📄 Docs
            </Link>
            <button
              className={styles.mobileWalletBtn}
              onClick={handleWalletClick}
            >
              {connected && publicKey
                ? `Disconnect (${truncateAddress(publicKey.toBase58())})`
                : "Connect Wallet"}
            </button>
          </div>
        )}
      </nav>

      {/* Mainnet Warning Modal */}
      {showMainnetWarning && (
        <div className={styles.modalOverlay} onClick={cancelMainnet}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>⚠️</div>
            <h3 className={styles.modalTitle}>Switch to Mainnet?</h3>
            <p className={styles.modalText}>
              You are about to switch to <strong>Solana Mainnet-Beta</strong>.
              All transactions will use <strong>real SOL</strong> and are
              <strong> irreversible</strong>.
            </p>
            <ul className={styles.modalList}>
              <li>Posting jobs will escrow real SOL</li>
              <li>Node registration requires real SOL stake</li>
              <li>Settlements transfer real SOL between wallets</li>
            </ul>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={cancelMainnet}>
                Cancel
              </button>
              <button className={styles.modalConfirm} onClick={confirmMainnet}>
                🔴 Switch to Mainnet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mainnet Banner */}
      {network === "mainnet-beta" && (
        <div className={styles.mainnetBanner}>
          <span>⚠️</span>
          <span>
            <strong>MAINNET</strong> — All transactions use real SOL and are irreversible
          </span>
          <button
            className={styles.bannerDismiss}
            onClick={() => setNetwork("devnet")}
          >
            Switch to Devnet
          </button>
        </div>
      )}
    </>
  );
}
