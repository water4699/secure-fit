import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { CodingPracticeLog, CodingPracticeLog__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("CodingPracticeLog")) as CodingPracticeLog__factory;
  const contract = (await factory.deploy()) as CodingPracticeLog;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("CodingPracticeLog", function () {
  let signers: Signers;
  let contract: CodingPracticeLog;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("should have zero entries after deployment", async function () {
    const entryCount = await contract.getEntryCount(signers.alice.address);
    expect(entryCount).to.eq(0);
  });

  it("should add a practice entry and update statistics", async function () {
    const minutes = 120;
    const problems = 10;
    const successes = 8;
    const failures = 2;

    // Encrypt all values
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(minutes)
      .add32(problems)
      .add32(successes)
      .add32(failures)
      .encrypt();

    // Add entry
    const tx = await contract
      .connect(signers.alice)
      .addEntry(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.handles[3],
        encryptedInput.inputProof
      );
    await tx.wait();

    // Check entry count
    const entryCount = await contract.getEntryCount(signers.alice.address);
    expect(entryCount).to.eq(1);

    // Get entry
    const entry = await contract.getEntry(signers.alice.address, 0);
    expect(entry.timestamp).to.be.gt(0);

    // Decrypt entry values
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

    expect(decryptedMinutes).to.eq(minutes);
    expect(decryptedProblems).to.eq(problems);
    expect(decryptedSuccesses).to.eq(successes);
    expect(decryptedFailures).to.eq(failures);

    // Check statistics
    const totalMinutes = await contract.getTotalMinutes(signers.alice.address);
    const totalProblems = await contract.getTotalProblems(signers.alice.address);
    const totalSuccesses = await contract.getTotalSuccesses(signers.alice.address);
    const totalFailures = await contract.getTotalFailures(signers.alice.address);
    const totalAttempts = await contract.getTotalAttempts(signers.alice.address);
    const passRateNumerator = await contract.getPassRateNumerator(signers.alice.address);

    const decryptedTotalMinutes = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalMinutes,
      contractAddress,
      signers.alice,
    );
    const decryptedTotalProblems = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalProblems,
      contractAddress,
      signers.alice,
    );
    const decryptedTotalSuccesses = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalSuccesses,
      contractAddress,
      signers.alice,
    );
    const decryptedTotalFailures = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalFailures,
      contractAddress,
      signers.alice,
    );
    const decryptedTotalAttempts = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalAttempts,
      contractAddress,
      signers.alice,
    );
    const decryptedPassRateNumerator = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      passRateNumerator,
      contractAddress,
      signers.alice,
    );

    expect(decryptedTotalMinutes).to.eq(minutes);
    expect(decryptedTotalProblems).to.eq(problems);
    expect(decryptedTotalSuccesses).to.eq(successes);
    expect(decryptedTotalFailures).to.eq(failures);
    expect(decryptedTotalAttempts).to.eq(successes + failures);
    expect(decryptedPassRateNumerator).to.eq(successes * 100);
  });

  it("should accumulate statistics across multiple entries", async function () {
    // First entry
    const entry1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(60)
      .add32(5)
      .add32(4)
      .add32(1)
      .encrypt();

    await contract
      .connect(signers.alice)
      .addEntry(
        entry1.handles[0],
        entry1.handles[1],
        entry1.handles[2],
        entry1.handles[3],
        entry1.inputProof
      );

    // Second entry
    const entry2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(90)
      .add32(8)
      .add32(7)
      .add32(1)
      .encrypt();

    await contract
      .connect(signers.alice)
      .addEntry(
        entry2.handles[0],
        entry2.handles[1],
        entry2.handles[2],
        entry2.handles[3],
        entry2.inputProof
      );

    // Check entry count
    const entryCount = await contract.getEntryCount(signers.alice.address);
    expect(entryCount).to.eq(2);

    // Check accumulated statistics
    const totalMinutes = await contract.getTotalMinutes(signers.alice.address);
    const totalProblems = await contract.getTotalProblems(signers.alice.address);
    const totalSuccesses = await contract.getTotalSuccesses(signers.alice.address);
    const totalFailures = await contract.getTotalFailures(signers.alice.address);
    const totalAttempts = await contract.getTotalAttempts(signers.alice.address);
    const passRateNumerator = await contract.getPassRateNumerator(signers.alice.address);

    const decryptedTotalMinutes = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalMinutes,
      contractAddress,
      signers.alice,
    );
    const decryptedTotalProblems = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalProblems,
      contractAddress,
      signers.alice,
    );
    const decryptedTotalSuccesses = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalSuccesses,
      contractAddress,
      signers.alice,
    );
    const decryptedTotalFailures = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalFailures,
      contractAddress,
      signers.alice,
    );
    const decryptedTotalAttempts = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalAttempts,
      contractAddress,
      signers.alice,
    );
    const decryptedPassRateNumerator = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      passRateNumerator,
      contractAddress,
      signers.alice,
    );

    expect(decryptedTotalMinutes).to.eq(150); // 60 + 90
    expect(decryptedTotalProblems).to.eq(13); // 5 + 8
    expect(decryptedTotalSuccesses).to.eq(11); // 4 + 7
    expect(decryptedTotalFailures).to.eq(2); // 1 + 1
    expect(decryptedTotalAttempts).to.eq(13); // 11 + 2
    expect(decryptedPassRateNumerator).to.eq(1100); // (4 + 7) * 100
  });
});

