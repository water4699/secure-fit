import { GenericStringStorage } from "./GenericStringStorage";

const PUBLIC_KEY_STORAGE_KEY = "fhevm-public-key-storage";

export interface PublicKeyData {
  publicKey: Uint8Array;
  publicParams: Uint8Array;
}

export async function publicKeyStorageGet(aclAddress: `0x${string}`): Promise<PublicKeyData> {
  const storage = new GenericStringStorage(PUBLIC_KEY_STORAGE_KEY);
  const key = aclAddress.toLowerCase();
  const stored = await storage.get(key);

  if (!stored) {
    throw new Error(`No public key found for ACL ${aclAddress}. Please refresh the page or reconnect your wallet.`);
  }

  try {
    const parsed = JSON.parse(stored);
    if (!parsed.publicKey || !parsed.publicParams) {
      throw new Error("Invalid stored public key data");
    }

    return {
      publicKey: new Uint8Array(Object.values(parsed.publicKey)),
      publicParams: new Uint8Array(Object.values(parsed.publicParams)),
    };
  } catch (e) {
    throw new Error(`Failed to parse stored public key for ACL ${aclAddress}: ${e}`);
  }
}

export async function publicKeyStorageSet(
  aclAddress: `0x${string}`,
  publicKey: Uint8Array,
  publicParams: Uint8Array
): Promise<void> {
  const storage = new GenericStringStorage(PUBLIC_KEY_STORAGE_KEY);
  const key = aclAddress.toLowerCase();
  const value = JSON.stringify({
    publicKey: Array.from(publicKey),
    publicParams: Array.from(publicParams),
  });
  await storage.set(key, value);
}
