"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AxiomClient } from "@/program/client";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import styles from "./PlaygroundPreview.module.css";

const MODELS = [
  { id: "llama-2-7b", name: "LLaMA 2 7B", type: "Text", cost: "0.001 SOL", lamports: 0.001 * LAMPORTS_PER_SOL },
  { id: "stable-diff", name: "Stable Diffusion", type: "Image", cost: "0.005 SOL", lamports: 0.005 * LAMPORTS_PER_SOL },
  { id: "distilbert", name: "DistilBERT", type: "Classification", cost: "0.0005 SOL", lamports: 0.0005 * LAMPORTS_PER_SOL },
];

const DEMO_STEPS = ["Uploading prompt...", "Posting on-chain...", "Waiting for node...", "Settled ✓"];

export default function PlaygroundPreview() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState("");
  const [txHash, setTxHash] = useState("");

  const { connection } = useConnection();
  const wallet = useWallet();

  const handleRun = async () => {
    if (!prompt.trim() || running) return;
    
    if (!wallet.connected) {
      alert("Please connect your wallet first!");
      return;
    }

    setRunning(true);
    setStep(0);
    setResult("");
    setTxHash("");

    try {
      // Step 1: Upload prompt to "IPFS" (or mock it if the function is not yet fully implemented)
      setStep(0); 
      // For this hackathon version, we simulate the IPFS CID to avoid external dependencies failing
      const mockCid = "Qm" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate upload delay

      // Step 2: Post job to Solana
      setStep(1);
      if (!wallet.signTransaction || !wallet.signAllTransactions || !wallet.publicKey) {
          throw new Error("Wallet not fully connected");
      }
      
      const client = AxiomClient.create(connection, wallet as unknown as import("@coral-xyz/anchor").Provider["wallet"]);
      
      const jobId = Math.floor(Math.random() * 1000000); // Random job ID for demo
      
      const tx = await client.postJob({
        jobId,
        modelId: selectedModel.id,
        inputCid: mockCid, // In production, this would be the actual IPFS CID
        bountyLamports: selectedModel.lamports,
        deadlineSeconds: 3600, // 1 hour deadline
      });
      
      setTxHash(tx);

      // Step 3: Wait for a node to pick it up (simulate this part as we don't have a background node running here)
      setStep(2);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Step 4: Finished
      setStep(3);
      setResult(
        "Transaction submitted to Solana! Job ID: " + jobId + "\nTransaction Hash: " + tx + "\n\n(Note: The node response is simulated as there is no backend node currently running to process this specific job request.)"
      );

    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert("Error running inference: " + errorMessage);
      setResult("Failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className={`section ${styles.section}`} id="playground-preview">
      <div className="container">
        <div className={styles.header}>
          <span className={styles.tag}>PLAYGROUND</span>
          <h2 className={styles.title}>Try It Yourself</h2>
          <p className={styles.subtitle}>
            Submit an inference job and watch it flow through the protocol in real-time.
          </p>
        </div>

        <div className={styles.playground}>
          {/* Left: Input */}
          <div className={`glass-card ${styles.inputPanel}`}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Input</span>
            </div>

            <div className={styles.modelSelect}>
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  className={`${styles.modelBtn} ${selectedModel.id === m.id ? styles.modelActive : ""}`}
                  onClick={() => setSelectedModel(m)}
                >
                  <span className={styles.modelName}>{m.name}</span>
                  <span className={styles.modelCost}>{m.cost}</span>
                </button>
              ))}
            </div>

            <textarea
              className={`input ${styles.promptInput}`}
              placeholder="Enter your prompt here... e.g., 'Summarize this legal document...'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              id="playground-prompt"
            />

            <button
              className={`btn btn-primary ${styles.runBtn}`}
              onClick={handleRun}
              disabled={running || !prompt.trim()}
              id="playground-run"
            >
              {running ? "Processing..." : "⚡ Run Inference"}
            </button>
          </div>

          {/* Right: Output & Status */}
          <div className={styles.outputPanel}>
            {/* Status tracker */}
            <div className={`glass-card ${styles.statusTracker}`}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Job Lifecycle</span>
                {running && <span className={styles.liveIndicator}><span className={styles.liveDot} /> Live</span>}
              </div>
              <div className={styles.steps}>
                {DEMO_STEPS.map((s, i) => (
                  <div key={s} className={`${styles.statusStep} ${step >= i ? styles.stepActive : ""}`}>
                    <div className={`${styles.stepCircle} ${step >= i ? styles.circleActive : ""}`}>
                      {step >= i ? "✓" : i + 1}
                    </div>
                    <span className={styles.stepLabel}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Result */}
            <div className={`glass-card ${styles.resultCard}`}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Output</span>
                {result && <span className="badge badge-settled">Settled</span>}
              </div>
              <div className={styles.resultBody}>
                {result ? (
                  <>
                    <p className={styles.resultText}>{result}</p>
                    <div className={styles.proofLink}>
                      <span className={styles.proofLabel}>Proof:</span>
                      <code className={styles.proofTx}>{txHash ? `${txHash.slice(0, 4)}...${txHash.slice(-4)}` : "7xKp...3mNq"}</code>
                      <span className={styles.proofExplorer}>↗ Explorer</span>
                    </div>
                  </>
                ) : (
                  <p className={styles.resultPlaceholder}>
                    {running ? "Waiting for result..." : "Run inference to see output here"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
