/**
 * IPFS Integration for Axiom
 *
 * Supports Pinata as a pinning service for uploading prompts and inference results.
 * Falls back to local SHA-256 hashing when no Pinata API key is configured.
 *
 * To enable real IPFS:
 *   1. Create a free Pinata account at https://pinata.cloud
 *   2. Generate an API key
 *   3. Set NEXT_PUBLIC_PINATA_JWT in your .env.local
 */

const PINATA_API_URL = "https://api.pinata.cloud";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";
const PUBLIC_GATEWAY = "https://ipfs.io/ipfs";

// Check if Pinata is configured
function getPinataJwt(): string | null {
  if (typeof window !== "undefined") {
    return (window as unknown as Record<string, unknown>).__PINATA_JWT as string || null;
  }
  return process.env.NEXT_PUBLIC_PINATA_JWT || null;
}

/**
 * Upload text content to IPFS via Pinata.
 * Falls back to local hash if Pinata is not configured.
 *
 * @returns Object with CID string and the 32-byte hash for on-chain storage
 */
export async function uploadToIPFS(
  content: string,
  metadata?: { name?: string; keyvalues?: Record<string, string> }
): Promise<{ cid: string; hashBytes: number[]; isLocal: boolean }> {
  const jwt = getPinataJwt();

  if (jwt) {
    try {
      const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          pinataContent: { content, timestamp: new Date().toISOString() },
          pinataMetadata: {
            name: metadata?.name || `axiom-${Date.now()}`,
            keyvalues: metadata?.keyvalues || {},
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Pinata upload failed: ${response.status}`);
      }

      const data = await response.json();
      const cid = data.IpfsHash;
      const hashBytes = await cidToBytes(cid);

      return { cid, hashBytes, isLocal: false };
    } catch (error) {
      console.warn("Pinata upload failed, falling back to local hash:", error);
    }
  }

  // Fallback: generate local SHA-256 hash
  const hashBytes = await localHash(content);
  const cid = `local:${bytesToHex(hashBytes).slice(0, 46)}`;

  return { cid, hashBytes, isLocal: true };
}

/**
 * Fetch content from IPFS by CID.
 * Tries Pinata gateway first, then public gateway, then returns null.
 */
export async function fetchFromIPFS(cid: string): Promise<string | null> {
  // Local hashes can't be fetched
  if (cid.startsWith("local:")) {
    return null;
  }

  const gateways = [PINATA_GATEWAY, PUBLIC_GATEWAY];

  for (const gateway of gateways) {
    try {
      const response = await fetch(`${gateway}/${cid}`, {
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (response.ok) {
        const data = await response.json();
        return data.content || JSON.stringify(data);
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Check if IPFS (Pinata) is configured and available.
 */
export function isIPFSConfigured(): boolean {
  return !!getPinataJwt();
}

/**
 * Get the IPFS gateway URL for a CID.
 */
export function getIPFSUrl(cid: string): string {
  if (cid.startsWith("local:")) {
    return "#"; // Local hashes don't have a URL
  }
  return `${PUBLIC_GATEWAY}/${cid}`;
}

// ─── Internal Utilities ────────────────────────────────────────────────────

/**
 * Convert a CID string to a 32-byte array for on-chain storage.
 * Uses SHA-256 of the CID string to guarantee exactly 32 bytes.
 */
async function cidToBytes(cid: string): Promise<number[]> {
  const encoder = new TextEncoder();
  const data = encoder.encode(cid);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
  return Array.from(new Uint8Array(hashBuffer));
}

/**
 * Generate a local SHA-256 hash of content.
 */
async function localHash(content: string): Promise<number[]> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
  return Array.from(new Uint8Array(hashBuffer));
}

/**
 * Convert byte array to hex string.
 */
function bytesToHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}
