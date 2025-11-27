// Simple in-memory storage for FHEVM public keys
// In production, you might want to use localStorage or a more robust storage solution

const storage = new Map<string, { publicKey: Uint8Array; publicParams: Uint8Array }>();

export async function publicKeyStorageGet(aclAddress: `0x${string}`): Promise<{
  publicKey: Uint8Array;
  publicParams: Uint8Array;
}> {
  const key = aclAddress.toLowerCase();
  const stored = storage.get(key);

  if (stored) {
    return stored;
  }

  // Generate default keypair if not found
  // In production, you should generate or retrieve the actual keypair
  const publicKey = new Uint8Array(32).fill(0);
  const publicParams = new Uint8Array(2048).fill(0);

  return { publicKey, publicParams };
}

export async function publicKeyStorageSet(
  aclAddress: `0x${string}`,
  publicKey: Uint8Array,
  publicParams: Uint8Array
): Promise<void> {
  const key = aclAddress.toLowerCase();
  storage.set(key, { publicKey, publicParams });
}
