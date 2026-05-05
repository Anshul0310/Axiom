<div align="center">
  <img src="app/public/globe.svg" width="100" height="100" alt="Axiom Logo">
  <h1>Axiom — Decentralized AI Inference on Solana</h1>
  <p><strong>Like Uber for AI — but for GPUs. Built for the Solana Frontier Colosseum Hackathon.</strong></p>
</div>

---

## 🌌 Overview

**Axiom** is a fully decentralized, permissionless AI inference marketplace built on Solana. It connects users who need AI computing power with Node Operators who have idle GPUs. 

Instead of relying on centralized cloud providers, Axiom allows anyone to rent out their hardware or access affordable AI inference, all while **Solana handles the payments, trust, and verification automatically.**

## ⚡ Features

- **Decentralized Marketplace**: Direct peer-to-peer job matching between Requesters and GPU Node Runners.
- **Trustless Settlement via Solana**: Uses a cryptographic **Commit-Reveal-Settle** flow enforced by our Anchor smart contract to guarantee honest computation.
- **Node Runner CLI**: A lightweight automated daemon for GPU operators to listen for jobs, process AI tasks using local models, and submit proofs on-chain.
- **IPFS Integration**: Decentralized storage for large model inputs, prompts, and outputs, keeping on-chain state minimal and cheap.
- **Beautiful Frontend Dashboard**: A sleek Next.js platform to monitor the network, manage nodes, and post inference tasks instantly.

## 🏗️ Architecture

Axiom consists of three main components:

1. **Axiom Smart Contract (Rust/Anchor)**
   - Manages the entire lifecycle of an AI job.
   - Handles escrowing of SOL, node registration, and bounty payouts.
   - Enforces the commit-reveal security mechanism.

2. **Axiom Web App (Next.js/React)**
   - The user-facing portal (`/app`).
   - Requesters can use the Playground to submit inference tasks.
   - Node Operators can monitor their earnings and network statistics on the Dashboard.

3. **Node Runner Client (TypeScript)**
   - The daemon (`/node-runner`) that runs on the GPU provider's machine.
   - Polls the Solana network for new tasks, processes them locally (e.g., via Ollama/Llama), and submits results back to the blockchain.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Rust & Solana CLI (for local contract deployment)
- Phantom or Solflare Wallet

### 1. Smart Contract Setup
```bash
# Navigate to the root directory
anchor build
anchor deploy
```

### 2. Frontend Web App
```bash
cd app
npm install
npm run dev
```
Visit `http://localhost:3000` to interact with the Axiom dApp.

### 3. Node Runner Client
```bash
cd node-runner
npm install
npm run start
```
*Note: Make sure your wallet is funded with Devnet SOL to register as a node.*

## 🛡️ Security: Commit-Reveal-Settle

To prevent nodes from cheating or simply copying results:
1. **Post**: User posts a job with a bounty in escrow.
2. **Commit**: A node claims the job and computes the result, but only submits a cryptographic hash of the answer first.
3. **Reveal**: Once the commit is locked in, the node reveals the actual text/output. The smart contract verifies the hash matches.
4. **Settle**: The node receives the SOL bounty.

## 🏆 Hackathon
This project was built from the ground up for the **Solana Frontier Colosseum** hackathon. 

---
