# Deployment Guide

## Quick Start

### 1. Local Development Setup

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Start local Hardhat node (Terminal 1)
npx hardhat node

# Compile contracts (Terminal 2)
npm run compile

# Deploy to localhost (Terminal 2)
npm run deploy:localhost

# Update contract address in frontend/config/contracts.ts
# Set CONTRACT_ADDRESSES[31337] to the deployed address

# Start frontend (Terminal 3)
cd frontend
npm run dev
```

### 2. Sepolia Testnet Deployment

```bash
# Set environment variables or use hardhat vars
npx hardhat vars set INFURA_API_KEY
npx hardhat vars set ETHERSCAN_API_KEY

# Deploy to Sepolia
npm run deploy:sepolia

# Update contract address in frontend/config/contracts.ts
# Set CONTRACT_ADDRESSES[11155111] to the deployed address

# Verify contract (optional)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Contract Address Configuration

After deployment, update `frontend/config/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES: Record<number, string> = {
  31337: '0x...',      // Localhost address
  11155111: '0x...',  // Sepolia address
};
```

## Testing

### Local Tests

```bash
npm run test
```

### Sepolia Tests

```bash
# First deploy to Sepolia
npm run deploy:sepolia

# Then run tests
npm run test:sepolia
```

## Frontend Configuration

### WalletConnect Project ID

For production, you may want to set a real WalletConnect project ID in `frontend/app/providers.tsx`:

```typescript
const config = getDefaultConfig({
  appName: "Coding Practice Log",
  projectId: "your-walletconnect-project-id", // Get from https://cloud.walletconnect.com
  chains: [localhost, sepolia],
  ssr: true,
});
```

For local development, the default project ID should work.

## Troubleshooting

### Contract Not Found

- Ensure the contract is deployed: `npm run deploy:localhost` or `npm run deploy:sepolia`
- Check that the address in `frontend/config/contracts.ts` matches the deployed address
- Verify the network ID matches (31337 for localhost, 11155111 for Sepolia)

### Wallet Connection Issues

- Ensure MetaMask or another compatible wallet is installed
- For localhost, add the network manually in MetaMask:
  - Network Name: Localhost 8545
  - RPC URL: http://localhost:8545
  - Chain ID: 31337
  - Currency Symbol: ETH

### Encryption/Decryption Errors

- Ensure the Zama Relayer SDK is properly initialized
- Check browser console for detailed error messages
- Verify the contract address is correct
- For localhost, ensure the FHEVM node is running

