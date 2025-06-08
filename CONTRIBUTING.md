# Contributing to Anti Trump Official (ATO)

Thank you for your interest in contributing to the **ATO Protocol**, the world's first AI-native, DAO-governed, NGO-integrated token infrastructure. We welcome high-quality, security-first, DAO-aligned contributions.

---

## 📌 Key Architecture Overview
- **Language**: Solidity `^0.8.30`
- **Upgradeability**: UUPS Proxy Pattern (ERC1967Proxy)
- **Governance**: Snapshot + DAO Roles via `AccessControl`
- **Security Stack**: ReentrancyGuard, Circuit Breaker, AI Oracle Prechecks
- **Modules**: Token, Staking, Referral, Civic NFT, NGO Fund, Treasury, AI Guardian

---

## 🚀 How to Contribute

### 1. Fork the Repository
Create your own fork of the repo and clone it locally:
```bash
git clone https://github.com/YOUR_USERNAME/ato-contracts.git
```

### 2. Create a Branch
Use a clear branch name structure:
```bash
git checkout -b feat/<feature-name>
```

### 3. Write Clean, Upgrade-Safe Solidity
Follow the project's Solidity style:
- Use `pragma solidity ^0.8.30;`
- Use `initializer` and `UUPSUpgradeable` in contracts
- Modularize logic with interfaces (e.g. `IAIHook`, `IAIGuardian`)
- Prefer `external` over `public` for view/pure functions

### 4. Write Tests (If Applicable)
All functional logic must be covered by tests:
- Use Hardhat or Foundry test framework
- Add edge case and revert checks
- Ensure DAO roles and permissions are validated

---

## 🔒 Security Requirements
Before submitting a PR:
- Ensure no external call is left unguarded
- Use `nonReentrant` where needed
- Confirm DAO-only functions are `onlyRole(DAO_ROLE)`
- Validate external contract calls with interface guards

---

## ✅ PR Requirements
- One feature or fix per pull request
- Include relevant contract(s), interface(s), and test(s)
- Document your changes in the PR description
- Run `npx hardhat compile` with **no warnings or errors**
- If applicable, update the relevant section in `README.md`

---

## 🧠 Governance Notes
- All contract upgrades must be DAO-controlled
- No role change, mint, transferFrom, or upgrade logic can be executed without DAO_ROLE
- Do **not** include hardcoded deployer access unless specified in the architecture

---

## 🧪 Tools & Environments
- [Remix IDE](https://remix.ethereum.org) – for audit-friendly deploys
- [Hardhat](https://hardhat.org) – for tests and local dev
- [Slither](https://github.com/crytic/slither) – for static analysis

---

## 🙏 Final Note
All contributors must follow the vision of ATO: **All for All — Not All for One**. Only submit code that reflects fairness, decentralization, and transparency.

Together, we build the most secure, verifiable, and civically meaningful token protocol in the world.

---

*DAO Review Committee reserves the right to reject or delay any PR that does not comply with governance guidelines or endanger architectural integrity.*
