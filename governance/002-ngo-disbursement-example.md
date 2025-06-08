# DAO Proposal Example – NGO Fund Disbursement

**Proposal Title**: Disbursement of $50,000 in ATO tokens to CleanWater.org (Africa Division)

**Proposal ID**: ATO-DAO-2025-004  
**Submitted by**: 0xD03aAbCF80cE402D81E5d84467E663e2A56A6c19  
**Proposal Date**: 2025-06-02  
**Target Contracts**: ATONGOFund.sol, ATOTreasury.sol

---

## 1. Executive Summary

This proposal requests a disbursement of 150,000 ATO tokens (~$50,000) from the DAO Treasury to the verified NGO wallet of CleanWater.org – Africa Division, to support a 12-month decentralized clean water infrastructure campaign across 5 countries.

---

## 2. Motivation & Background

- CleanWater.org is a globally recognized, KYC-verified NGO onboarded via DAO vote #2025-002.
- Africa Division submitted an on-chain funding request via `submitRequest()` with purpose: "Solar-powered water purification systems in underserved villages."
- The DAO is requested to support this high-impact, UN-aligned mission aligned with ATO’s civic and humanitarian vision.

---

## 3. Proposal Specification

- Call `approveRequest(id)` and then `disburseFunds(id)` on ATONGOFund.sol for Request ID #14
- Ensure AI Guardian has scored this request as **Low Risk**
- Final disbursement destination: `0x429cA4Dc6f07dA9bBD77485fF51e1AF17E47a0B9`

---

## 4. Risk & AI Evaluation

- Proposal passed through AI Guardian Layer with Low Risk (Score: 2/10)
- No known financial, governance, or legal risk
- NGO profile is verified with audit trail and impact reports on IPFS

---

## 5. Budget & Treasury Impact

- Requested Amount: 150,000 ATO (≈ $50,000)
- Fund Source: ATOTreasury (proxy: 0x24AeE1...)
- Treasury before: 11,200,000 ATO
- Treasury after: 11,050,000 ATO
- Disbursement tracked via `FundsDisbursed` event

---

## 6. Voting Parameters

- Quorum: 10% of total supply
- Approval Threshold: > 51% YES votes
- Voting Period: 4 days
- Snapshot Block: 41273453

---

## 7. Supporting References

- NGO Audit Link: [IPFS CID: Qm...]
- Governance Approval Log: [Snapshot Vote 2025-002]
- NGO Profile: https://cleanwater.org/africa

---

*This proposal complies with all ATO governance rules and is validated by AI Hook and DAO roles prior to execution.*
