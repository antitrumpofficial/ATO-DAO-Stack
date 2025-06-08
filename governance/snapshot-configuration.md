# Snapshot Configuration – Anti Trump Official (ATO)

This file documents the configuration of the ATO DAO on [Snapshot.org](https://snapshot.org/#/ato.eth), including governance parameters, voting strategy, and off-chain execution rules.

---

## Snapshot Space

- **Space ID**: ato.eth
- **Strategy**: ERC20 Balance of ATO token on BNB Smart Chain
- **Voting Power Symbol**: ATO
- **Voting Power Source**: BEP-20 token balance at snapshot block
- **Network**: Binance Smart Chain (chainId: 56)

---

## Voting Strategy

- **Type**: Single Choice Voting
- **Voting Power Calculation**: 1 ATO = 1 vote
- **Snapshot Block**: Defined at proposal publication time

---

## Governance Parameters

| Parameter              | Value                           |
|------------------------|---------------------------------|
| Minimum Proposal Power | 100,000 ATO                     |
| Quorum Threshold       | 10% of circulating ATO supply   |
| Approval Threshold     | >51% YES votes                  |
| Voting Duration        | 3 to 5 days (based on proposal) |
| Cooldown (Post-Vote)   | 12 hours                        |

---

## Proposal Lifecycle Integration

1. Proposal submitted via: https://dao.antitrumpofficial.com/submit
2. Snapshot generated → Voting window begins
3. Result tallied → Passed proposals sent to AI Hook for verification
4. If passed: executed on-chain via DAO module

---

## Plugin Modules

- **Snapshot-X**: Optional for cross-chain DAO expansion
- **SafeSnap**: (Planned) for on-chain execution control via Gnosis Safe

---

## DAO Admins

- Primary Admin: 0x7eB5D199BaB7BA2b6BbEeF7D07Eea62f2B838548  (DAO Treasury Controller)
- Technical Delegate: 0x616C518dec8BB15E5bFde9EE175c87782490548d  (Deployer Wallet)

---

*Maintained by ATO Governance Council. Last updated: June 2025.*
