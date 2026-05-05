use anchor_lang::prelude::*;

#[error_code]
pub enum AxiomError {
    // ─── Job Errors ────────────────────────────────────────────────────────────
    #[msg("Job is not in the Open state")]
    JobNotOpen,

    #[msg("Job has expired past its deadline")]
    JobExpired,

    #[msg("Job is not in the Committed state")]
    JobNotCommitted,

    #[msg("Job is not in the Revealed state")]
    JobNotRevealed,

    #[msg("Job deadline has not passed yet")]
    DeadlineNotPassed,

    #[msg("A node has already committed to this job")]
    AlreadyCommitted,

    #[msg("Invalid bounty amount — must be greater than zero")]
    InvalidBounty,

    #[msg("Deadline must be in the future")]
    InvalidDeadline,

    // ─── Node Errors ───────────────────────────────────────────────────────────
    #[msg("Insufficient stake — must meet minimum requirement")]
    InsufficientStake,

    #[msg("Node is not active")]
    NodeNotActive,

    #[msg("Node does not support the requested model")]
    UnsupportedModel,

    #[msg("Unauthorized — only the assigned node can perform this action")]
    UnauthorizedNode,

    #[msg("Node is already registered")]
    AlreadyRegistered,

    // ─── Commit/Reveal Errors ──────────────────────────────────────────────────
    #[msg("Invalid commit hash — does not match the revealed data")]
    InvalidCommitHash,

    #[msg("Reveal data is empty or invalid")]
    InvalidRevealData,

    // ─── Verification Errors ───────────────────────────────────────────────────
    #[msg("Verification failed — output mismatch detected")]
    VerificationFailed,

    #[msg("This job is not selected for verification")]
    NotVerificationTarget,

    // ─── Authorization Errors ──────────────────────────────────────────────────
    #[msg("Unauthorized — only the admin can perform this action")]
    UnauthorizedAdmin,

    #[msg("Unauthorized — only the job client can perform this action")]
    UnauthorizedClient,

    // ─── Arithmetic Errors ─────────────────────────────────────────────────────
    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
}
