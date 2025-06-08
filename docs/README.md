# 🌐 ATO DAO Stack – Modular Governance, Treasury, AI & Civic Layer

> **All for All – Not All for One**  
> This repository contains the complete modular DAO smart contract system powering the [Anti Trump Official (ATO)](https://antitrumpofficial.com) civic infrastructure protocol on BSC.

---

## 🔧 Modules Overview

| Contract Name             | Description                                                      |
|---------------------------|------------------------------------------------------------------|
| `ATOStaking.sol`          | Flexible staking module (DAO-controlled APR + Emergency Exit)    |
| `ATOReferral.sol`         | On-chain referral system with AI abuse detection                 |
| `ATOCivicNFT.sol`         | NFT proof-of-impact engine for civic participation               |
| `ATONGOFund.sol`          | NGO onboarding and fund request execution by DAO                 |
| `ATOTreasury.sol`         | Treasury transfer module with multisig-style approval + AI guard |
| `ATOArbitrationCouncil.sol` | Dispute resolution & arbitration system with AI scoring         |
| `interfaces/`             | External AI/Hook interfaces (abuse monitor, risk engine, etc.)   |

---

## 🛠️ Installation & Local Testing

```bash
git clone https://github.com/antitrumpofficial/ATO-DAO-Stack.git
cd ATO-DAO-Stack
npm install
