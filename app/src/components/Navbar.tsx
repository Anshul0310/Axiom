"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  NETWORK_CONFIGS,
  SolanaNetwork,
  useNetwork,
} from "@/contexts/NetworkContext";
import styles from "./Navbar.module.css";

const NETWORKS: { id: SolanaNetwork; label: string; color: string }[] = [
  { id: "devnet", label: "Devnet", color: "#00F5A0" },
  { id: "testnet", label: "Testnet", color: "#FFD700" },
  { id: "mainnet-beta", label: "Mainnet", color: "#FF3B5C" },
];

const NAV_LINKS = [
  { href: "/playground", label: "Playground", glyph: "PG" },
  { href: "/dashboard", label: "Nodes", glyph: "ND" },
  { href: "/explorer", label: "Explorer", glyph: "EX" },
];

const smoothEase = [0.16, 1, 0.3, 1] as const;

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
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

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
      <motion.nav
        className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}
        id="main-nav"
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: smoothEase }}
      >
        <div className={`container ${styles.navInner}`}>
          <Link href="/" className={styles.logo} id="nav-logo">
            <span className={styles.logoIcon} aria-hidden="true" />
            <span className={styles.logoText}>Axiom</span>
          </Link>

          <div className={styles.navLinks}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${isActive(link.href) ? styles.navLinkActive : ""}`}
              >
                <span className={styles.navGlyph}>{link.glyph}</span>
                <span>{link.label}</span>
                {isActive(link.href) && (
                  <motion.span
                    className={styles.activePill}
                    layoutId="nav-active-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </Link>
            ))}
          </div>

          <div className={styles.navActions}>
            <div className={styles.networkDropdownWrapper} ref={dropdownRef}>
              <button
                className={styles.networkBadge}
                onClick={() => setNetworkDropdownOpen(!networkDropdownOpen)}
                id="network-selector"
                aria-expanded={networkDropdownOpen}
              >
                <span
                  className={styles.networkDot}
                  style={{ background: currentNet.color }}
                />
                {currentNet.label}
                <span className={styles.networkChevron}>
                  {networkDropdownOpen ? "^" : "v"}
                </span>
              </button>

              <AnimatePresence>
                {networkDropdownOpen && (
                  <motion.div
                    className={styles.networkDropdown}
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: smoothEase }}
                  >
                    <div className={styles.networkDropdownHeader}>Select Network</div>
                    {NETWORKS.map((net) => (
                      <button
                        key={net.id}
                        className={`${styles.networkOption} ${net.id === network ? styles.networkOptionActive : ""}`}
                        onClick={() => handleNetworkSelect(net.id)}
                        id={`network-${net.id}`}
                      >
                        <span
                          className={styles.networkOptionDot}
                          style={{ background: net.color }}
                        />
                        <div className={styles.networkOptionInfo}>
                          <span className={styles.networkOptionLabel}>{net.label}</span>
                          <span className={styles.networkOptionUrl}>
                            {NETWORK_CONFIGS[net.id].endpoint.replace("https://", "")}
                          </span>
                        </div>
                        {net.id === network && (
                          <span className={styles.networkCheck}>Active</span>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
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

            <button
              className={`${styles.hamburger} ${mobileOpen ? styles.hamburgerOpen : ""}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              id="mobile-menu-btn"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className={styles.mobileMenu}
              initial={{ opacity: 0, y: -12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.22, ease: smoothEase }}
            >
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.mobileLink} ${isActive(link.href) ? styles.mobileLinkActive : ""}`}
                >
                  <span className={styles.navGlyph}>{link.glyph}</span>
                  {link.label}
                </Link>
              ))}
              <button className={styles.mobileWalletBtn} onClick={handleWalletClick}>
                {connected && publicKey
                  ? `Disconnect (${truncateAddress(publicKey.toBase58())})`
                  : "Connect Wallet"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <AnimatePresence>
        {showMainnetWarning && (
          <motion.div
            className={styles.modalOverlay}
            onClick={cancelMainnet}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.22, ease: smoothEase }}
            >
              <div className={styles.modalIcon}>!</div>
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
                  Switch to Mainnet
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {network === "mainnet-beta" && (
          <motion.div
            className={styles.mainnetBanner}
            initial={{ y: -18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
          >
            <span className={styles.bannerMark}>!</span>
            <span>
              <strong>MAINNET</strong> - All transactions use real SOL and are irreversible
            </span>
            <button
              className={styles.bannerDismiss}
              onClick={() => setNetwork("devnet")}
            >
              Switch to Devnet
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
