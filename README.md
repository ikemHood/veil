# Veil

Private global dollar banking for cross-border payments, built for the Stellar Hacks ZK hackathon.

Veil solves a core problem with blockchain banking: public ledgers make every payment, balance change, and financial relationship visible by default. That transparency is useful for settlement, but it is a major drawback for real cross-border banking. People need low-cost global payments without exposing their income, savings, suppliers, customers, or family support flows to the internet.

Veil brings privacy back to global dollar accounts using zero-knowledge proofs on Stellar. Users can fund a wallet, shield deposits into a private pool, send privately, and withdraw back to a public Stellar address when needed. The app also uses human-readable usernames, with email-style transfer flows planned, so people do not have to manage raw addresses for everyday payments.

Hackathon submission: [Stellar Hacks ZK on DoraHacks](https://dorahacks.io/hackathon/stellar-hacks-zk/buidl)

## What Veil Enables

- Private cross-border dollar payments on Stellar testnet.
- Shielded deposits, private transfers, and withdrawals.
- Username-based recipient resolution for simpler transfers.
- Google sign-in, PIN setup, and usernames for a familiar onboarding path.
- Local encrypted note storage for private spend data.
- Backend note delivery so recipients can recover received private notes after login.
- Linked cstellar contracts, circuits, SDK, and artifacts through a Git submodule.

## Why Privacy Matters

Public blockchain payments expose more than one transaction. They expose balances, business relationships, salary flows, remittance patterns, and operational history. For people using crypto as banking infrastructure, this is not acceptable.

Veil keeps settlement on Stellar while moving sensitive payment details behind a ZK privacy layer. The chain verifies that a private spend is valid without learning the user’s balance or full payment history.

## How It Works

1. A user signs in and gets a Stellar testnet wallet.
2. The wallet is funded on testnet when the user chooses to deposit.
3. The deposit is wrapped into a confidential note.
4. Private transfers consume existing notes and create new encrypted notes for recipients.
5. Recipients import delivered notes into their encrypted vault after login.
6. Withdrawals unwrap a selected private note amount to a public Stellar address.

## Demo Flow

The current demo runs on Stellar testnet. A user signs in with Google, sets a PIN, and claims a username that other users can send to. Deposits start as public testnet funds, but once Veil detects the deposit, it shields the funds into the private pool so the user can transact from a confidential balance.

From there, a user can send privately to another Veil username or withdraw back to a public Stellar wallet address. The public chain still records that privacy operations occurred, including commitments and nullifiers, but it does not expose the private transfer amount, sender balance, or full payment history.

The ZK and contract implementation lives in cstellar:

- Contracts: [`external/cstellar/contracts`](external/cstellar/contracts)
- Circuits: [`external/cstellar/circuits`](external/cstellar/circuits)
- Artifacts: [`external/cstellar/artifacts`](external/cstellar/artifacts)
- SDK source: [`external/cstellar/sdk`](external/cstellar/sdk)

Upstream cstellar repo: [ikemHood/cstellar](https://github.com/ikemHood/cstellar)

## Future Direction: Private Yield

Veil can become more than a private wallet. A future implementation will turn the shielded pool into a DeFi contract where private deposits can supply liquidity for lending and borrowing. Users who keep funds deposited would earn APY while their account activity stays private. Borrowers could deposit collateral, borrow from the pool, and pay fees or interest back to private depositors.

The goal is a private global dollar account that supports:

- everyday transfers,
- private savings,
- private yield,
- and programmable liquidity on Stellar.

## Repository Structure

```txt
app/                 Mobile-first Veil frontend
backend/             Hono API, auth, profile, and note delivery
external/cstellar/   Git submodule for contracts, circuits, artifacts, and SDK
```

## Local Setup

Clone with submodules:

```bash
git clone --recurse-submodules https://github.com/ikemHood/veil.git
cd veil
```

Install frontend dependencies:

```bash
cd app
npm install
npm run dev
```

Install backend dependencies:

```bash
cd ../backend
npm install
npm run db:migrate
npm run dev
```

The frontend defaults to `http://127.0.0.1:3000` and the backend defaults to `http://localhost:5000`.

## Environment

Use the example files as templates:

- [`app/.env.example`](app/.env.example)
- [`backend/.env.example`](backend/.env.example)

Required services:

- Postgres
- Redis
- Google OAuth credentials
- Stellar testnet RPC and Horizon endpoints
- Deployed cstellar wrapper, verifier, and asset contracts

## Notes

This is a hackathon demo. For testnet purposes, Veil uses Stellar testnet XLM to represent USDC-like dollar value. It also uses browser-local encrypted storage for user note secrets. Production custody, account recovery, relayers, audits, rate limits, and hosted key management would need more hardening before real money use.
