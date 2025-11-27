# Coding Practice Log - Encrypted Practice Tracker

A fully homomorphic encryption (FHE) based application for tracking daily coding practice without revealing sensitive details.

## Features

- **Encrypted Data Storage**: All practice data (minutes, problems, successes, failures) is encrypted using FHE
- **Privacy-Preserving Statistics**: Calculate pass rates and cumulative statistics without decrypting individual entries
- **User-Friendly Interface**: Modern UI with Rainbow wallet integration
- **Local & Testnet Support**: Deploy and test on local Hardhat network or Sepolia testnet

## Business Logic

The application allows users to:
- Record daily coding practice sessions with encrypted data:
  - Minutes spent coding
  - Number of problems solved
  - Success/failure counts
- View encrypted statistics:
  - Total minutes
  - Total problems
  - Pass rate (calculated as successes * 100 / total attempts)
- Decrypt entries and statistics on-demand using the Zama Relayer SDK

## Prerequisites

- Node.js >= 20
- npm >= 7.0.0
- A Sepolia wallet with ETH for testnet deployment (optional)
- Infura API key (for Sepolia deployment)

## Installation

### 1. Install Root Dependencies

```bash
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory (optional, can use hardhat vars):

```bash
# Wallet configuration
MNEMONIC="your twelve word mnemonic phrase here"

# RPC provider
INFURA_API_KEY="your_infura_api_key"

# Optional: Contract verification
ETHERSCAN_API_KEY="your_etherscan_api_key"
```

Or use hardhat vars:

```bash
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npx hardhat vars set ETHERSCAN_API_KEY
```

## Usage

### Local Development

#### 1. Start Local FHEVM Node

```bash
# Terminal 1: Start local Hardhat node with FHEVM support
npx hardhat node
```

#### 2. Compile Contracts

```bash
# Terminal 2: Compile smart contracts
npm run compile
```

#### 3. Run Tests

```bash
# Run all tests
npm run test

# Run specific test file
npx hardhat test test/CodingPracticeLog.ts
```

#### 4. Deploy Contracts Locally

```bash
# Deploy to local node
npm run deploy:localhost
```

After deployment, update `frontend/config/contracts.ts` with the deployed address:

```typescript
export const CONTRACT_ADDRESSES: Record<number, string> = {
  31337: '0x...', // Your deployed contract address
  11155111: '',
};
```

#### 5. Start Frontend Development Server

```bash
# Terminal 3: Navigate to frontend and start dev server
cd frontend
npm run dev
```

Open `http://localhost:3000` (or `http://localhost:3001` if port 3000 is in use) in your browser.

### Testnet Deployment (Sepolia)

#### 1. Deploy Smart Contract

```bash
# Deploy CodingPracticeLog contract to Sepolia
npm run deploy:sepolia
```

Output will show:
```
Deploying CodingPracticeLog...
CodingPracticeLog contract: 0x1234567890abcdef1234567890abcdef12345678
```

#### 2. Update Frontend Configuration

Edit `frontend/config/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES: Record<number, string> = {
  31337: '',
  11155111: '0x1234567890abcdef1234567890abcdef12345678', // Your deployed address
};
```

#### 3. Verify Contract on Etherscan (Optional)

```bash
# Verify deployed contract
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Contract Tasks

The following Hardhat tasks are available for interacting with the contract:

### Get Contract Address

```bash
npx hardhat --network localhost task:address
npx hardhat --network sepolia task:address
```

### Get Entry Count

```bash
npx hardhat --network localhost task:get-entry-count
npx hardhat --network sepolia task:get-entry-count
```

### Add Practice Entry

```bash
npx hardhat --network localhost task:add-entry --minutes 120 --problems 10 --successes 8 --failures 2
npx hardhat --network sepolia task:add-entry --minutes 120 --problems 10 --successes 8 --failures 2
```

### Get Statistics

```bash
npx hardhat --network localhost task:get-statistics
npx hardhat --network sepolia task:get-statistics
```

## Frontend Features

- **Rainbow Wallet Integration**: Connect wallet using RainbowKit in the top right corner
- **Add Practice Entries**: Submit encrypted practice data
- **View Entries**: See all practice entries (encrypted)
- **Decrypt Entries**: Decrypt individual entries on-demand
- **View Statistics**: See encrypted statistics
- **Decrypt Statistics**: Decrypt and view pass rate calculations

## Logo and Favicon

To add your custom logo and favicon:

1. Create a logo image (recommended: 512x512px PNG) and save as `frontend/public/logo.png`
2. Create a favicon (recommended: 32x32px ICO or PNG) and save as `frontend/public/favicon.ico`
3. The logo will automatically appear in the navigation bar and browser tab

## Project Structure

```
secure-fit/
├── contracts/
│   └── CodingPracticeLog.sol      # Main smart contract
├── deploy/
│   └── deploy.ts                    # Deployment script
├── frontend/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Main application page
│   │   ├── providers.tsx            # RainbowKit & Wagmi providers
│   │   └── globals.css              # Global styles
│   ├── config/
│   │   └── contracts.ts             # Contract addresses and ABI
│   ├── hooks/
│   │   ├── useEthersSigner.ts      # Ethers signer hook
│   │   └── useZamaInstance.ts      # Zama FHE instance hook
│   └── public/
│       ├── logo.png                 # Application logo
│       └── favicon.ico              # Browser favicon
├── test/
│   ├── CodingPracticeLog.ts        # Local test suite
│   └── CodingPracticeLogSepolia.ts # Sepolia test suite
├── tasks/
│   ├── accounts.ts                  # Account management task
│   └── CodingPracticeLog.ts        # Contract interaction tasks
├── hardhat.config.ts               # Hardhat configuration
└── package.json                     # Root dependencies
```

## Testing

### Local Tests

Tests run against a mock FHEVM environment:

```bash
npm run test
```

### Sepolia Tests

Tests run against the deployed Sepolia contract:

```bash
npm run test:sepolia
```

**Note**: Make sure to deploy the contract to Sepolia first using `npm run deploy:sepolia`.

## Security Notes

- All data is encrypted using Fully Homomorphic Encryption (FHE)
- Only the user who created the data can decrypt it
- Statistics are calculated on encrypted data without revealing individual values
- The contract uses ACL (Access Control List) to manage encryption permissions

## Troubleshooting

This project has been thoroughly checked and fixed based on the secure-study troubleshooting guide:

### ✅ Issues Resolved

1. **Contract Compilation**: Fixed Solidity reserved word conflict (`minutes` → `codingMinutes`)
2. **ABI Compatibility**: Verified ABI matches between contracts and frontend
3. **TypeScript Errors**: Fixed all ESLint warnings and errors
   - Removed unused variables (`e` in catch blocks)
   - Replaced `any` types with proper type annotations
   - Added proper error handling with `instanceof Error` checks
   - Marked async operations with `void` operator
4. **Vercel Deployment**: Added `vercel.json` with proper COOP/COEP headers
5. **Code Quality**: All code is in English, no unused files or configurations

### ✅ Verified Working

- ✅ Local Hardhat network deployment and testing
- ✅ Sepolia testnet contract deployment
- ✅ Frontend wallet connection (RainbowKit)
- ✅ Contract read/write operations
- ✅ ESLint passing with no errors
- ✅ TypeScript compilation successful

### ⚠️ Known Limitations

- Sepolia FHE decryption tests fail due to Zama Relayer instability (normal for testnet)
- Local development fully functional for MVP demonstration

## License

MIT

## Acknowledgments

Built using:
- [Zama FHEVM](https://github.com/zama-ai/fhevm)
- [Hardhat](https://hardhat.org/)
- [RainbowKit](https://www.rainbowkit.com/)
- [Wagmi](https://wagmi.sh/)
- [Next.js](https://nextjs.org/)

