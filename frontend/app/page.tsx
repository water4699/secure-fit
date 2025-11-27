"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { ethers } from 'ethers';
import { createPublicClient, http } from 'viem';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ABI, getContractAddress } from '../config/contracts';
import { useWalletClient } from 'wagmi';

type PracticeEntry = {
  timestamp: bigint;
  codingMinutes: string;
  problems: string;
  successes: string;
  failures: string;
};

type DecryptedEntry = {
  codingMinutes?: number;
  problems?: number;
  successes?: number;
  failures?: number;
};

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const signerPromise = useEthersSigner();
  const { instance, status: zamaStatus, error: zamaError } = useZamaInstance({
    enabled: isConnected,
    initialMockChains: { 31337: "http://localhost:8545" }
  });
  const isZamaLoading = zamaStatus === "loading";
  const client = useMemo(() => {
    if (chainId === 31337) {
      return createPublicClient({ 
        chain: { id: 31337, name: 'Localhost', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['http://localhost:8545'] } } },
        transport: http('http://localhost:8545')
      });
    }
    return createPublicClient({ 
      chain: { id: 11155111, name: 'Sepolia', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://sepolia.infura.io/v3/b18fb7e6ca7045ac83c41157ab93f990'] } } },
      transport: http('https://sepolia.infura.io/v3/b18fb7e6ca7045ac83c41157ab93f990')
    });
  }, [chainId]);

  const [form, setForm] = useState({ minutes: '', problems: '', successes: '', failures: '' });
  const [entries, setEntries] = useState<PracticeEntry[]>([]);
  const [decryptedEntries, setDecryptedEntries] = useState<Map<number, DecryptedEntry>>(new Map());
  const [statistics, setStatistics] = useState<{ totalMinutes?: number | string; totalProblems?: number | string; totalSuccesses?: number | string; totalFailures?: number | string; totalAttempts?: number | string; numerator?: number | string; passRate?: number }>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [decrypting, setDecrypting] = useState(false);

  const zero = '0x0000000000000000000000000000000000000000000000000000000000000000';

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const loadEntries = async () => {
    if (!address) return;
    try {
      let contractAddress;
      try {
        contractAddress = getContractAddress(chainId);
      } catch {
        setMessage('Contract not deployed. Please deploy the contract first.');
        return;
      }
      const entryCount = await client.readContract({
        address: contractAddress as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'getEntryCount',
        args: [address],
      }) as bigint;

      const entryPromises = [];
      for (let i = 0; i < Number(entryCount); i++) {
        entryPromises.push(
          client.readContract({
        address: contractAddress as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'getEntry',
            args: [address, BigInt(i)],
          })
        );
      }

      const results = await Promise.all(entryPromises);
      const loadedEntries: PracticeEntry[] = results.map((result) => ({
        timestamp: result[0],
        codingMinutes: result[1],
        problems: result[2],
        successes: result[3],
        failures: result[4],
      }));

      setEntries(loadedEntries);
    } catch {
      console.error('Failed to load entries');
    }
  };

  const loadStatistics = async () => {
    if (!address) return;
    try {
      let contractAddress;
      try {
        contractAddress = getContractAddress(chainId);
      } catch {
        setMessage('Contract not deployed. Please deploy the contract first.');
        return;
      }
      const [totalMinutes, totalProblems, totalSuccesses, totalFailures, totalAttempts, numerator] = await Promise.all([
        client.readContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'getTotalMinutes',
          args: [address],
        }),
        client.readContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'getTotalProblems',
          args: [address],
        }),
        client.readContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'getTotalSuccesses',
          args: [address],
        }),
        client.readContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'getTotalFailures',
          args: [address],
        }),
        client.readContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'getTotalAttempts',
          args: [address],
        }),
        client.readContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'getPassRateNumerator',
          args: [address],
        }),
      ]);

      setStatistics({
        totalMinutes: totalMinutes as string,
        totalProblems: totalProblems as string,
        totalSuccesses: totalSuccesses as string,
        totalFailures: totalFailures as string,
        totalAttempts: totalAttempts as string,
        numerator: numerator as string,
      });
    } catch {
      console.error('Failed to load statistics');
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      void loadEntries();
      void loadStatistics();
    }
  }, [isConnected, address, chainId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!signerPromise) return setMessage('No wallet');

    // Check if encryption service is available
    if (isZamaLoading) return setMessage('Encryption service is loading...');
    if (!instance) {
      return setMessage(zamaError?.message || 'Encryption service not ready');
    }

    setLoading(true);
    try {
      const signer = await signerPromise;
      const contractAddress = getContractAddress(chainId);
      const minutes = BigInt(form.minutes);
      const problems = BigInt(form.problems);
      const successes = BigInt(form.successes);
      const failures = BigInt(form.failures);

      const buf = instance
        .createEncryptedInput(contractAddress, await signer.getAddress())
        .add32(Number(minutes))
        .add32(Number(problems))
        .add32(Number(successes))
        .add32(Number(failures));

      const enc = await buf.encrypt();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
      const tx = await contract.addEntry(
        enc.handles[0],
        enc.handles[1],
        enc.handles[2],
        enc.handles[3],
        enc.inputProof
      );
      await tx.wait();
      setMessage('Entry saved successfully!');
      setForm({ minutes: '', problems: '', successes: '', failures: '' });
      await loadEntries();
      await loadStatistics();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save entry';
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const decryptEntry = async (index: number, entry: PracticeEntry) => {
    setMessage('');
    if (!signerPromise) return setMessage('No wallet');
    if (isZamaLoading) return setMessage('Encryption service is loading...');
    if (!instance) {
      return setMessage(zamaError?.message || 'Encryption service not ready');
    }
    setDecrypting(true);
    // Clear the decrypted data for this entry before starting decryption
    setDecryptedEntries(new Map(decryptedEntries.set(index, {})));
    try {
      const signer = await signerPromise;
      let contractAddress;
      try {
        contractAddress = getContractAddress(chainId);
      } catch {
        setMessage('Contract not deployed. Please deploy the contract first.');
        setDecrypting(false);
        return;
      }
      const pairs = [entry.codingMinutes, entry.problems, entry.successes, entry.failures]
        .filter((h): h is string => !!h && h.toLowerCase() !== zero)
        .map((h) => ({ handle: h, contractAddress }));

      if (pairs.length === 0) {
        setMessage('No data to decrypt');
        setDecrypting(false);
        return;
      }

      const keypair = instance.generateKeypair();
      const start = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contracts = [contractAddress];
      const eip712 = instance.createEIP712(keypair.publicKey, contracts, start, durationDays);
      const sig = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );
      const res = await instance.userDecrypt(
        pairs,
        keypair.privateKey,
        keypair.publicKey,
        sig.replace('0x', ''),
        contracts,
        await signer.getAddress(),
        start,
        durationDays,
      );

      const decrypted: DecryptedEntry = {
        codingMinutes: entry.codingMinutes && res[entry.codingMinutes] !== undefined ? Number(res[entry.codingMinutes]) : undefined,
        problems: entry.problems && res[entry.problems] !== undefined ? Number(res[entry.problems]) : undefined,
        successes: entry.successes && res[entry.successes] !== undefined ? Number(res[entry.successes]) : undefined,
        failures: entry.failures && res[entry.failures] !== undefined ? Number(res[entry.failures]) : undefined,
      };

      setDecryptedEntries(new Map(decryptedEntries.set(index, decrypted)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to decrypt';
      setMessage(message);
    } finally {
      setDecrypting(false);
    }
  };

  const decryptStatistics = async () => {
    setMessage('');
    if (!signerPromise) return setMessage('No wallet');
    if (isZamaLoading) return setMessage('Encryption service is loading...');
    if (!instance) {
      if (zamaError === 'Encryption service temporarily disabled') {
        return setMessage('⚠️ Encryption service is currently disabled. Statistics decryption is not available.');
      }
      return setMessage(zamaError || 'Encryption service not ready');
    }
    setDecrypting(true);
    try {
      const signer = await signerPromise;
      let contractAddress;
      try {
        contractAddress = getContractAddress(chainId);
      } catch {
        setMessage('Contract not deployed. Please deploy the contract first.');
        setDecrypting(false);
        return;
      }
      const pairs = [
        statistics.totalMinutes,
        statistics.totalProblems,
        statistics.totalSuccesses,
        statistics.totalFailures,
        statistics.totalAttempts,
        statistics.numerator,
      ]
        .filter((h): h is string => typeof h === 'string' && !!h && h.toLowerCase() !== zero)
        .map((h) => ({ handle: h, contractAddress }));

      if (pairs.length === 0) {
        setMessage('No statistics to decrypt');
        setDecrypting(false);
        return;
      }

      const keypair = instance.generateKeypair();
      const start = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contracts = [contractAddress];
      const eip712 = instance.createEIP712(keypair.publicKey, contracts, start, durationDays);
      const sig = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );
      const res = await instance.userDecrypt(
        pairs,
        keypair.privateKey,
        keypair.publicKey,
        sig.replace('0x', ''),
        contracts,
        await signer.getAddress(),
        start,
        durationDays,
      );

      const decryptedStats = {
        totalMinutes: statistics.totalMinutes && res[statistics.totalMinutes] !== undefined ? Number(res[statistics.totalMinutes]) : undefined,
        totalProblems: statistics.totalProblems && res[statistics.totalProblems] !== undefined ? Number(res[statistics.totalProblems]) : undefined,
        totalSuccesses: statistics.totalSuccesses && res[statistics.totalSuccesses] !== undefined ? Number(res[statistics.totalSuccesses]) : undefined,
        totalFailures: statistics.totalFailures && res[statistics.totalFailures] !== undefined ? Number(res[statistics.totalFailures]) : undefined,
        totalAttempts: statistics.totalAttempts && res[statistics.totalAttempts] !== undefined ? Number(res[statistics.totalAttempts]) : undefined,
        numerator: statistics.numerator && res[statistics.numerator] !== undefined ? Number(res[statistics.numerator]) : undefined,
      };

      const passRate = decryptedStats.totalAttempts && decryptedStats.totalAttempts > 0 && decryptedStats.numerator
        ? Math.floor((decryptedStats.numerator / decryptedStats.totalAttempts) / 100)
        : undefined;

      setStatistics({ ...statistics, ...decryptedStats, passRate });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to decrypt statistics';
      setMessage(message);
    } finally {
      setDecrypting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🔗</div>
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-white/80 text-lg">
            Please connect your wallet to track your coding practice with encryption.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 px-4 py-8">
      {/* Warning message for encryption status */}
      {zamaStatus === 'error' && zamaError && (
        <div className="bg-yellow-500/20 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-yellow-500/30">
          <div className="text-center">
            <div className="text-3xl mb-2">⚠️</div>
            <h3 className="text-xl font-bold text-yellow-200 mb-2">Encryption Service Issue</h3>
            <p className="text-yellow-100">
              {zamaError.message || 'There was an issue initializing the encryption service.'}
              {chainId === 31337 && ' Make sure your local Hardhat node is running with FHEVM support.'}
            </p>
          </div>
        </div>
      )}

      {/* Add Entry Form */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">📝</div>
          <h2 className="text-2xl font-bold text-white mb-2">Add Practice Entry</h2>
          <p className="text-white/80">
            {zamaStatus === 'ready' ? 'Your data will be encrypted and stored securely' :
             zamaStatus === 'loading' ? 'Initializing encryption service...' :
             'Connecting to encryption service...'}
          </p>
        </div>

        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-white font-medium mb-2">⏱️ Coding Minutes</label>
            <input
              required
              name="minutes"
              type="number"
              placeholder="120"
              value={form.minutes}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-2">📚 Problems Solved</label>
            <input
              required
              name="problems"
              type="number"
              placeholder="10"
              value={form.problems}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-2">✅ Successes</label>
            <input
              required
              name="successes"
              type="number"
              placeholder="8"
              value={form.successes}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-2">❌ Failures</label>
            <input
              required
              name="failures"
              type="number"
              placeholder="2"
              value={form.failures}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {loading ? 'Saving...' : '💾 Save Entry'}
            </button>
          </div>
        </form>

        {message && (
          <div className={`mt-4 p-4 rounded-lg ${message.includes('successfully') ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
            {message}
          </div>
        )}
      </div>

      {/* Statistics */}
      {Object.keys(statistics).length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-white mb-2">Your Statistics</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-white/70 text-sm mb-1">Total Minutes</div>
              <div className="text-2xl font-bold text-white">
                {typeof statistics.totalMinutes === 'number' ? statistics.totalMinutes : '🔒'}
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-white/70 text-sm mb-1">Total Problems</div>
              <div className="text-2xl font-bold text-white">
                {typeof statistics.totalProblems === 'number' ? statistics.totalProblems : '🔒'}
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-white/70 text-sm mb-1">Pass Rate</div>
              <div className="text-2xl font-bold text-white">
                {typeof statistics.passRate === 'number' ? `${statistics.passRate}%` : '🔒'}
              </div>
            </div>
          </div>

          <button
            onClick={decryptStatistics}
            disabled={decrypting}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {decrypting ? 'Decrypting...' : '🔓 Decrypt Statistics'}
          </button>
        </div>
      )}

      {/* Entries List */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-white mb-2">Practice Entries</h2>
          <p className="text-white/80">{entries.length} entries found</p>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">No entries yet. Add your first practice entry above!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, index) => {
              const decrypted = decryptedEntries.get(index);
              const date = new Date(Number(entry.timestamp) * 1000);

              return (
                <div key={index} className="bg-white/10 rounded-lg p-6 border border-white/20">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-white font-semibold">Entry #{index + 1}</div>
                      <div className="text-white/70 text-sm">{date.toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() => decryptEntry(index, entry)}
                      disabled={decrypting}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      🔓 Decrypt
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-white/70 text-sm mb-1">Minutes</div>
                      <div className="text-lg font-semibold text-white">
                        {decrypted?.codingMinutes !== undefined ? decrypted.codingMinutes : '🔒'}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/70 text-sm mb-1">Problems</div>
                      <div className="text-lg font-semibold text-white">
                        {decrypted?.problems !== undefined ? decrypted.problems : '🔒'}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/70 text-sm mb-1">Successes</div>
                      <div className="text-lg font-semibold text-white">
                        {decrypted?.successes !== undefined ? decrypted.successes : '🔒'}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/70 text-sm mb-1">Failures</div>
                      <div className="text-lg font-semibold text-white">
                        {decrypted?.failures !== undefined ? decrypted.failures : '🔒'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

