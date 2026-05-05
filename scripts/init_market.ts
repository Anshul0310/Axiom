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

  try {
    const tx = await program.methods
      .initialize({
        minStake: new anchor.BN(1_000_000_000), // 1 SOL
        platformFeeBps: 200, // 2%
        verificationRateBps: 500, // 5%
        slashPenaltyBps: 1000, // 10%
      })
      .accounts({
        platformConfig: platformConfigPDA,
        admin: provider.wallet.publicKey,
        treasury: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Market initialized successfully. Transaction Hash:", tx);
  } catch (error) {
    console.error("Error initializing market:", error);
  }
}

main().catch(console.error);
