# ATO Smart Contract Modules – Definitive DAO-Approved Version

**Protocol:** Anti Trump Official (ATO)  
**Network:** Binance Smart Chain (BEP-20)  
**Version:** 1.0 – Fully deployed and DAO-governed  
**Architecture:** UUPS Upgradeable + Modular DAO Stack

---

## 1. Overview
This document outlines every smart contract module within the ATO Protocol based on:
- Verified deployed contracts
- Final whitepaper (v1.0)
- DAO-approved architecture and standards

Every module is:
- Upgradeable (UUPS, ERC-1967)
- Governed by DAO_ROLE and AI Hook
- Aligned with snapshot-based voting + on-chain execution

---

## 2. Core Contracts

### `ATO.sol`  
**Type:** BEP-20 Main Token Contract  
**Key Functions:**
- 1% transaction tax: 0.5% reflection, 0.25% auto-burn, 0.25% DAO treasury
- Anti-whale rules: Max 1%/tx and 2.5%/wallet
- Snapshot-based reflection reward engine
- Upgradeable (UUPS), DAO_ROLE required for config changes

### `AIGuardianUpgradeable.sol`  
**Type:** AI Oracle for Governance Pre-Verification  
**Key Functions:**
- Pre-screens all on-chain DAO executions
- Enforces sentiment score thresholds and risk scoring
- Circuit Breaker integration for emergency halts
- Verifies quorum compliance before execution

### `ATOArbitrationCouncil.sol`  
**Type:** DAO Arbitration + Dispute Resolution Layer  
**Key Functions:**
- Handles flagged proposals or suspicious DAO behavior
- Automated arbitration via AI Guardian
- Enables DAO-triggered manual dispute resolution
- Fully deployed and active in security pipeline

---

## 3. Functional Modules

### `ATOStaking.sol`  
**Type:** Flexible Staking Engine  
**Key Features:**
- Flexible + locked staking pools
- NFT-boosted governance weight multipliers
- DAO ROLE required for adding pools or modifying logic

### `ATOReferral.sol`  
**Type:** On-Chain Growth Engine with AI Monitoring  
**Key Features:**
- Referrer-referee structure with mapped rewards
- Abuse detection logic via AI Hook
- DAO-adjustable bonus tiers + leaderboard integration

### `ATOCivicNFT.sol`  
**Type:** Civic Identity + Proof-of-Impact Registry (ERC-721)  
**Key Features:**
- NFTs issued for verified civic actions (donation, proposal, etc.)
- Civic credentials = governance boost multipliers
- KYC-optional metadata model

### `ATONGOFund.sol`  
**Type:** NGO Treasury Distribution Module  
**Key Features:**
- DAO votes determine disbursements to verified NGOs
- AI-scorable risk and urgency index
- Transparent on-chain payout logs

### `ATOTreasury.sol`  
**Type:** Main Multisig DAO Treasury Contract  
**Key Features:**
- Requires proposal + quorum + AI Hook pass to unlock funds
- Guardian-controlled Circuit Breaker authority
- Realtime on-chain log of all transactions

---

## 4. Shared Technical Standards

| Feature                  | Description                                                             |
|--------------------------|-------------------------------------------------------------------------|
| Upgradeability           | All modules: UUPS Proxy (ERC1967), fully upgradeable by DAO             |
| Access Control           | OpenZeppelin `AccessControl`, governed by DAO_ROLE                      |
| Reflection Engine        | Snapshot-based redistribution, non-custodial                            |
| Emergency Protection     | `CircuitBreaker` + `Pausable` via AI Guardian Layer                     |
| Risk & Sentiment Engine  | AI pre-checks all DAO executions before hitting state                   |
| NFT Identity Framework   | ERC-721 civic NFTs with DAO-linked metadata                             |
| Treasury Safeguards      | Multisig logic + AI-scored release thresholds                           |
| Arbitration Compliance   | DAO Arbitration Layer enforces governance rules + logs                  |

---

## 5. Deployment References

Full ABIs and deployed addresses are available under:  
**GitHub:** [https://github.com/antitrumpofficial](https://github.com/antitrumpofficial)  
**DAO Audit Logs:** [https://audit.antitrumpofficial.com](https://audit.antitrumpofficial.com)  
**Voting Portal:** [https://snapshot.org/#/ato.eth](https://snapshot.org/#/ato.eth)

---

## 6. DAO Licensing and Attribution

This document is published under the DAO Attribution License (MIT Enhanced).  
All forks must retain attribution and preserve DAO compatibility.

**Maintained by:** ATO DAO Documentation Council  
**Latest Update:** Synchronized with deployed smart contracts – June 2025
