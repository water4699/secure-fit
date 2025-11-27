"use client";

import { ethers } from "ethers";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/bundle";
import { createFhevmInstance } from "../src/fhevm/internal/fhevm";
import { useChainId, useWalletClient } from 'wagmi';

export type FhevmGoState = "idle" | "loading" | "ready" | "error";

export function useZamaInstance(parameters: {
  enabled?: boolean;
  initialMockChains?: Readonly<Record<number, string>>;
} = {}): {
  instance: FhevmInstance | undefined;
  refresh: () => void;
  error: Error | undefined;
  status: FhevmGoState;
} {
  const { enabled = true, initialMockChains } = parameters;

  const [instance, _setInstance] = useState<FhevmInstance | undefined>(undefined);
  const [status, _setStatus] = useState<FhevmGoState>("idle");
  const [error, _setError] = useState<Error | undefined>(undefined);
  const [_isRunning, _setIsRunning] = useState<boolean>(enabled);
  const [_providerChanged, _setProviderChanged] = useState<number>(0);
  const _abortControllerRef = useRef<AbortController | null>(null);
  const _chainIdRef = useRef<number | undefined>(undefined);
  const _mockChainsRef = useRef<Record<number, string> | undefined>(initialMockChains);

  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  // Get EIP1193 provider
  const eip1193Provider = useCallback(() => {
    if (chainId === 31337) {
      return "http://localhost:8545";
    }
    if (walletClient?.transport) {
      const transport = walletClient.transport as any;
      if (transport.value && typeof transport.value.request === "function") {
        return transport.value;
      }
      if (typeof transport.request === "function") {
        return transport;
      }
    }
    if (typeof window !== "undefined" && (window as any).ethereum) {
      return (window as any).ethereum;
    }
    return undefined;
  }, [chainId, walletClient]);

  const refresh = useCallback(() => {
    if (_abortControllerRef.current) {
      _abortControllerRef.current.abort();
      _abortControllerRef.current = null;
    }

    _chainIdRef.current = undefined;
    _setInstance(undefined);
    _setError(undefined);
    _setStatus("idle");

    if (eip1193Provider() !== undefined) {
      _setProviderChanged((prev) => prev + 1);
    }
  }, [eip1193Provider]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    _setIsRunning(enabled);
  }, [enabled]);

  useEffect(() => {
    if (_isRunning === false) {
      if (_abortControllerRef.current) {
        _abortControllerRef.current.abort();
        _abortControllerRef.current = null;
      }
      _setInstance(undefined);
      _setError(undefined);
      _setStatus("idle");
      return;
    }

    if (_isRunning === true) {
      if (eip1193Provider() === undefined) {
        _setInstance(undefined);
        _setError(undefined);
        _setStatus("idle");
        return;
      }

      if (!_abortControllerRef.current) {
        _abortControllerRef.current = new AbortController();
      }

      if (_abortControllerRef.current.signal.aborted) {
        return;
      }

      _setStatus("loading");
      _setError(undefined);

      const thisSignal = _abortControllerRef.current.signal;
      const thisProvider = eip1193Provider();
      const thisRpcUrlsByChainId = _mockChainsRef.current;

      const createInstance = async () => {
        try {
          const inst = await createFhevmInstance({
            provider: thisProvider,
            mockChains: thisRpcUrlsByChainId,
            signal: thisSignal,
            onStatusChange: (status) => {
              if (status === "creating") {
                _setStatus("loading");
              }
            },
          });

          if (thisSignal.aborted) return;

          if (thisProvider !== eip1193Provider()) {
            return;
          }

          _setInstance(inst);
          _setError(undefined);
          _setStatus("ready");
        } catch (e: any) {
          if (thisSignal.aborted) {
            return;
          }

          if (thisProvider !== eip1193Provider()) {
            return;
          }

          const errorMessage = e?.message || String(e);
          if (errorMessage.includes("Failed to fetch") || errorMessage.includes("fetch")) {
            _setInstance(undefined);
            _setError(undefined);
            _setStatus("idle");
            return;
          }

          console.error(`[useZamaInstance] Error creating FHEVM instance:`, e);
          const enhancedError = new Error(errorMessage);
          enhancedError.name = e.name || "FHEVMInitializationError";
          if (e.stack) {
            enhancedError.stack = e.stack;
          }

          _setInstance(undefined);
          _setError(enhancedError);
          _setStatus("error");
        }
      };

      createInstance();
    }
  }, [_isRunning, _providerChanged, eip1193Provider]);

  return { instance, refresh, error, status };
}

