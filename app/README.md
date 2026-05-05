# ◆ Axiom — Decentralized AI Inference on Solana

> **Uber for AI inference.** GPU owners earn SOL running AI models. Developers get cheap, verifiable inference. Solana handles trust automatically.

[![Solana](https://img.shields.io/badge/Solana-Devnet-00D4FF?style=flat-square&logo=solana)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.32-7C3AED?style=flat-square)](https://www.anchor-lang.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)](https://nextjs.org)

---

## 🎯 What is Axiom?

Axiom is a **decentralized AI inference marketplace** where:

- **GPU Node Operators** stake SOL, register their supported models, and earn bounties by running AI inference
- **Requestors** post inference jobs with SOL micro-bounties, specifying which model to use
- **Solana Smart Contracts** handle escrow, commit-reveal verification, and automatic settlement

Instead of paying a centralized provider $0.01/request, you post a bounty on-chain. GPU nodes race to complete your job. The smart contract verifies honesty through a commit-reveal scheme with staking/slashing, making cheating economically irrational.

## 🏗️ Architecture

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│  Requestor  │──────▶│  Axiom Program   │◀──────│  GPU Node   │
│  (dApp/Dev) │       │  (Solana)        │       │  Operator   │
└─────────────┘       └──────────────────┘       └─────────────┘
      │                       │                        │
      │ 1. post_job()         │                        │
      │ (bounty escrowed)     │                        │
      │                       │  2. commit_result()    │
      │                       │  (SHA256 hash lock)    │
      │                       │                        │
      │                       │  3. reveal_result()    │
      │                       │  (verify hash match)   │
      │                       │                        │
      │  4. settle_job()      │                        │
      │  (bounty → node,      │                        │
      │   2% → treasury)      │                        │
      └───────────────────────┴────────────────────────┘
```

### Job Lifecycle
1. **Post** → Requestor creates job with model ID, input CID, SOL bounty, and deadline
2. **Commit** → Node runs inference off-chain, submits `SHA256(output + salt)` on-chain
3. **Reveal** → Node reveals actual output + salt; contract verifies hash match
4. **Verify** → ~20% of jobs randomly selected for verification (slot-based VRF)
5. **Settle** → Bounty transferred to node (minus 2% platform fee)

## 📁 Project Structure

```
Solana_Frontier_Colosseum/
├── programs/Axiom/src/          # Solana smart contract (Anchor)
│   ├── lib.rs                   # 7 program instructions
│   ├── state.rs                 # Job, NodeRegistry, PlatformConfig
│   ├── errors.rs                # AxiomError enum
│   └── instructions/            # Instruction handlers
│       ├── initialize.rs
│       ├── register_node.rs
│       ├── post_job.rs
│       ├── commit_result.rs
│       ├── reveal_result.rs
│       ├── settle_job.rs
│       └── cancel_job.rs
├── app/                         # Next.js 16 frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx         # Landing page
│       │   ├── playground/      # Inference playground (chat UI)
│       │   ├── dashboard/       # Node management dashboard
│       │   ├── explorer/        # Real-time job explorer
│       │   └── docs/            # Documentation & architecture
│       ├── components/          # Reusable UI components
│       ├── contexts/            # Network context (devnet/testnet/mainnet)
│       └── program/             # On-chain program client
└── Anchor.toml
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Solana CLI
- Anchor CLI 0.32+
- Phantom Wallet (browser extension)

### Run the Frontend

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Build the Smart Contract

```bash
# From project root
anchor build
anchor deploy --provider.cluster devnet
```

## 🌐 Network Support

Axiom supports **Devnet**, **Testnet**, and **Mainnet-Beta**:

| Network | Use Case | SOL |
|---------|----------|-----|
| Devnet | Development & testing | Free (airdrop) |
| Testnet | Staging validation | Free (airdrop) |
| Mainnet | Production — real transactions | Real SOL |

Switch networks using the dropdown in the navbar.

## 🔒 Security Model

- **Commit-Reveal**: Prevents front-running and result copying
- **Stake & Slash**: Nodes stake SOL; cheating = 50% stake slashed
- **Verification Sampling**: 20% of jobs randomly re-verified (VRF)
- **Reputation**: 0-10000 score affects job priority access

## 💰 Economics

| Parameter | Value |
|-----------|-------|
| Platform Fee | 2% of bounty |
| Min Node Stake | 1.0 SOL |
| Slash Penalty | 50% of stake |
| Verification Rate | 20% |

## 🗺️ Roadmap

- **Q2 2026** — Foundation: Smart contract, frontend, simulated demo
- **Q3 2026** — Real inference: Docker GPU workers, IPFS, model registry
- **Q4 2026** — Scale: ZK proofs, cross-chain, governance token
- **2027** — Ecosystem: Fine-tuned model marketplace, enterprise API

## 📄 License

MIT

---

**Built for the Solana Frontier Colosseum Hackathon** 🏆
