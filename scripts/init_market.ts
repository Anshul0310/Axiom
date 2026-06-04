import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Axiom } from "../target/types/axiom";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Axiom as Program<Axiom>;

  const [platformConfigPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  console.log("Platform Config PDA:", platformConfigPDA.toBase58());
  console.log("Admin (your wallet):", provider.wallet.publicKey.toBase58());

  try {
    const tx = await program.methods
      .initialize({
        minStake: new anchor.BN(1_000_000_000), // 1 SOL
        platformFeeBps: 200, // 2%
        verificationRateBps: 2000, // 20%
        slashPenaltyBps: 5000, // 50%
      })
      .accounts({
        platformConfig: platformConfigPDA,
        admin: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Platform initialized successfully!");
    console.log("Transaction Hash:", tx);
    console.log("\nYou can now:");
    console.log("  1. Register nodes via the Dashboard");
    console.log("  2. Post inference jobs via the Playground");
  } catch (error) {
    if (String(error).includes("already in use")) {
      console.log("ℹ️  Platform is already initialized.");
    } else {
      console.error("❌ Error initializing platform:", error);
    }
  }
}

main().catch(console.error);
