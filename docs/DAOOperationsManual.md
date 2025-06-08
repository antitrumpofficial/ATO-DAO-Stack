# 🏛️ ATO DAO Operations Manual

## 📆 Activation Date
**Official DAO Activation**: October 1, 2025  
All governance functions (voting, treasury disbursement, NGO approvals) begin from this date.

---

## 🗳️ Governance System
- **Voting Layer**: Snapshot.org (off-chain voting)
- **Execution Layer**: On-chain contracts using DAO_ROLE
- **Proposal Creation**: Only DAO_ROLE holders can initiate proposals
- **Proposal Types**:
  - Treasury Withdrawals
  - NGO Grant Disbursement
  - Reflection Tax Adjustments
  - Smart Contract Upgrade

---

## 📉 Quorum & Thresholds
| Type of Proposal     | Quorum (%) | Approval (%) |
|----------------------|------------|---------------|
| Treasury Actions     | 10%        | >60%          |
| NGO Disbursements    | 5%         | >51%          |
| Parameter Updates    | 15%        | >66%          |

Quorum values are based on total active Civic NFT DAO voters.

---

## 🔐 MultiSig Treasury
- ATO Treasury is managed via Gnosis Safe-compatible Multisig contract.
- Signers: DAO Appointed (minimum 3 of 5)
- Emergency Pause: Circuit Breaker enabled by AI Guardian Module

---

## 🧠 AI Guardian Integration
- Pre-checks proposals for:
  - Spam / duplicate risk
  - Risk scoring via DAO oracle
  - Rejection before Snapshot listing (if flagged)

---

## 🧾 DAO Voter Identity Layer
- Powered by CivicNFT contract
- Each voter must mint 1 NFT to qualify for DAO vote
- Reputation system pending v2 (2026+)

---

## 📚 DAO Documentation Index
- SmartContractModules.md
- snapshot-configuration.md
- vote-results-history.json
- quorum-metrics.json
- DAOOperationsManual.md
