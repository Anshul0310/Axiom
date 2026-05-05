# ◆ Axiom Node Runner

> GPU Node Operator Daemon for the Axiom Decentralized AI Inference Marketplace

This CLI tool is what GPU operators run on their machines to earn SOL by executing AI inference jobs.

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│                   Axiom Node Runner                       │
│                                                          │
│  1. Poll Solana for open jobs ◀──── Every 5 seconds      │
│  2. Run inference locally     ──── GPU/CPU computation   │
│  3. Commit result hash        ────▶ On-chain TX          │
│  4. Reveal actual result      ────▶ On-chain TX          │
│  5. Settle payment            ────▶ SOL → your wallet    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- **Node.js 18+**
- **Solana CLI** with a keypair at `~/.config/solana/id.json`
- Your node must be **registered** on-chain via the [Axiom Dashboard](http://localhost:3000/dashboard)

### Install & Run

```bash
cd node-runner
npm install
npx tsx index.ts
```

### CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--cluster, -c` | Solana cluster (devnet/testnet/mainnet-beta) | `devnet` |
| `--keypair, -k` | Path to Solana keypair JSON | `~/.config/solana/id.json` |
| `--interval, -i` | Poll interval in seconds | `5` |
| `--dry-run, -d` | Monitor only, don't submit TXs | `false` |
| `--max-jobs, -m` | Max concurrent jobs | `1` |
| `--help, -h` | Show help | — |

### Examples

```bash
# Monitor devnet without transacting
npx tsx index.ts --cluster devnet --dry-run

# Run on devnet, poll every 3 seconds
npx tsx index.ts -c devnet -i 3

# Production mode on mainnet
npx tsx index.ts -c mainnet-beta -i 10
```

## Node Registration

Before the runner can accept jobs, you must register your node on-chain:

1. Open the Axiom web app at `http://localhost:3000/dashboard`
2. Connect your Solana wallet (Phantom, Backpack, etc.)
3. Go to the **"Register Node"** tab
4. Set your stake amount (minimum 1.0 SOL)
5. Select the AI models your GPU supports
6. Click **"Register Node & Stake"**

## Inference Engine

Currently, the runner uses **simulated inference** for demo purposes. In production, you would replace the `runInference()` function with a call to:

- **[Ollama](https://ollama.ai)** — Local LLM runner
- **[llama.cpp](https://github.com/ggerganov/llama.cpp)** — C++ LLM inference
- **[vLLM](https://docs.vllm.ai)** — High-throughput serving
- **[Stable Diffusion WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui)** — Image generation

## Economics

| Parameter | Value |
|-----------|-------|
| Platform fee | 2% of bounty |
| Your earnings | 98% of bounty |
| Typical bounty | 0.001 - 0.005 SOL |
| Slash penalty | 50% of stake (if cheating detected) |

## Security

The runner implements the **commit-reveal protocol**:

1. **Commit**: Send `SHA256(job_id + output + secret)` — nobody can see your result
2. **Reveal**: Send actual output + secret — contract verifies hash match
3. **Settle**: If verification passes, bounty is transferred to your wallet

This prevents other nodes from copying your inference output.
