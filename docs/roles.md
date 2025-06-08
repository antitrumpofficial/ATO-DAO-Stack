# 🛡️ ATO DAO Governance Stack – Access Roles Documentation

## Role Definitions

The ATO DAO architecture defines 4 core roles to securely manage the DAO's modular governance, treasury, risk, and arbitration systems.

---

### 🔐 `DEFAULT_ADMIN_ROLE`
- Grants and revokes other roles (DAO_ROLE, GUARDIAN_ROLE, COUNCIL_ROLE)
- Authorizes smart contract upgrades (UUPS)
- Can update critical external AI module addresses (guardian, referral monitor, etc.)

---

### 🏛️ `DAO_ROLE`
- Core operational role for DAO-controlled logic
- Executes approved DAO proposals
- Manages staking reward rates, referral reward policies
- Approves and disburses NGO fund requests
- Mints civic NFTs
- Approves treasury transfers
- Manages AI Hook updates (risk engine, abuse detector, proposal verifier)

---

### 🛡️ `GUARDIAN_ROLE`
- Emergency control over DAO operations
- Can activate circuit breaker in critical scenarios
- Verifies and blocks suspicious token or treasury transfers

---

### ⚖️ `COUNCIL_ROLE`
- Executes decentralized dispute resolution
- Reviews and resolves disputes raised by DAO participants
- Issues binding decisions on abuse, manipulation, or fraud cases

---

## Role Assignment Across Modules

| Module / Role         | DEFAULT_ADMIN_ROLE | DAO_ROLE | GUARDIAN_ROLE | COUNCIL_ROLE |
|-----------------------|--------------------|----------|----------------|---------------|
| Token Core Contract   | ✅                 | ✅       | ✅             | ❌            |
| Staking Module        | ✅                 | ✅       | ❌             | ❌            |
| Referral Module       | ✅                 | ✅       | ❌             | ❌            |
| NFT Civic Proof       | ✅                 | ✅       | ❌             | ❌            |
| NGO Funding Module    | ✅                 | ✅       | ❌             | ❌            |
| Treasury Module       | ✅                 | ✅       | ✅             | ❌            |
| Arbitration Council   | ✅                 | ✅       | ❌             | ✅            |

---

## Security Notes
- All smart contracts use OpenZeppelin's `AccessControlUpgradeable`.
- Roles can only be assigned via DAO proposal or admin contract functions.
- `DEFAULT_ADMIN_ROLE` should be delegated to a multisig-controlled governance address after deployment.

---

✅ This roles.md file is fully aligned with ATO's governance philosophy, DAO modularity, and AI-integrated architecture.

