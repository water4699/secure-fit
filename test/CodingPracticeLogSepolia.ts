import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { CodingPracticeLog } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("CodingPracticeLogSepolia", function () {
  let signers: Signers;
  let contract: CodingPracticeLog;
  let contractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const CodingPracticeLogDeployment = await deployments.get("CodingPracticeLog");
      contractAddress = CodingPracticeLogDeployment.address;
      contract = await ethers.getContractAt("CodingPracticeLog", CodingPracticeLogDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("should add a practice entry on Sepolia", async function () {
    steps = 15;

    this.timeout(4 * 40000);

    const minutes = 120;
    const problems = 10;
    const successes = 8;
    const failures = 2;

    progress("Encrypting practice data...");
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(minutes)
      .add32(problems)
      .add32(successes)
      .add32(failures)
      .encrypt();

    progress(
      `Call addEntry() CodingPracticeLog=${contractAddress} signer=${signers.alice.address}...`,
    );
    let tx = await contract
      .connect(signers.alice)
      .addEntry(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.handles[3],
        encryptedInput.inputProof
      );
    await tx.wait();

    progress(`Call getEntryCount()...`);
    const entryCount = await contract.getEntryCount(signers.alice.address);
    expect(entryCount).to.eq(1);

    progress(`Call getEntry()...`);
    const entry = await contract.getEntry(signers.alice.address, 0);
    expect(entry.timestamp).to.be.gt(0);

    progress(`Decrypting entry data...`);
    const decryptedMinutes = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      entry.codingMinutes,
      contractAddress,
      signers.alice,
    );
    const decryptedProblems = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      entry.problems,
      contractAddress,
      signers.alice,
    );
    const decryptedSuccesses = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      entry.successes,
      contractAddress,
      signers.alice,
    );
    const decryptedFailures = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      entry.failures,
      contractAddress,
      signers.alice,
    );

    progress(`Decrypted: minutes=${decryptedMinutes}, problems=${decryptedProblems}, successes=${decryptedSuccesses}, failures=${decryptedFailures}`);

    expect(decryptedMinutes).to.eq(minutes);
    expect(decryptedProblems).to.eq(problems);
    expect(decryptedSuccesses).to.eq(successes);
    expect(decryptedFailures).to.eq(failures);

    progress(`Checking statistics...`);
    const totalMinutes = await contract.getTotalMinutes(signers.alice.address);
    const decryptedTotalMinutes = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalMinutes,
      contractAddress,
      signers.alice,
    );
    progress(`Total minutes: ${decryptedTotalMinutes}`);

    expect(decryptedTotalMinutes).to.eq(minutes);
  });
});

