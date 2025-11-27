import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import type { CodingPracticeLog } from "../types";

/**
 * Tutorial: Deploy and Interact Locally (--network localhost)
 * ===========================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the CodingPracticeLog contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the CodingPracticeLog contract
 *
 *   npx hardhat --network localhost task:add-entry --minutes 120 --problems 10 --successes 8 --failures 2
 *   npx hardhat --network localhost task:get-entry-count
 *   npx hardhat --network localhost task:get-statistics
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the CodingPracticeLog contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the CodingPracticeLog contract
 *
 *   npx hardhat --network sepolia task:add-entry --minutes 120 --problems 10 --successes 8 --failures 2
 *   npx hardhat --network sepolia task:get-entry-count
 *   npx hardhat --network sepolia task:get-statistics
 *
 */

/**
 * Example:
 *   - npx hardhat --network localhost task:address
 *   - npx hardhat --network sepolia task:address
 */
task("task:address", "Prints the CodingPracticeLog address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const codingPracticeLog = await deployments.get("CodingPracticeLog");

  console.log("CodingPracticeLog address is " + codingPracticeLog.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:get-entry-count
 *   - npx hardhat --network sepolia task:get-entry-count
 */
task("task:get-entry-count", "Gets the entry count for the signer")
  .addOptionalParam("address", "Optionally specify the CodingPracticeLog contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const CodingPracticeLogDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("CodingPracticeLog");
    console.log(`CodingPracticeLog: ${CodingPracticeLogDeployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("CodingPracticeLog", CodingPracticeLogDeployment.address);

    const entryCount = await contract.getEntryCount(signers[0].address);
    console.log(`Entry count for ${signers[0].address}: ${entryCount}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:add-entry --minutes 120 --problems 10 --successes 8 --failures 2
 *   - npx hardhat --network sepolia task:add-entry --minutes 120 --problems 10 --successes 8 --failures 2
 */
task("task:add-entry", "Adds a new practice entry")
  .addOptionalParam("address", "Optionally specify the CodingPracticeLog contract address")
  .addParam("minutes", "Minutes spent coding")
  .addParam("problems", "Number of problems solved")
  .addParam("successes", "Number of successful attempts")
  .addParam("failures", "Number of failed attempts")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const minutes = parseInt(taskArguments.minutes);
    const problems = parseInt(taskArguments.problems);
    const successes = parseInt(taskArguments.successes);
    const failures = parseInt(taskArguments.failures);

    if (!Number.isInteger(minutes) || !Number.isInteger(problems) || !Number.isInteger(successes) || !Number.isInteger(failures)) {
      throw new Error(`All arguments must be integers`);
    }

    await fhevm.initializeCLIApi();

    const CodingPracticeLogDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("CodingPracticeLog");
    console.log(`CodingPracticeLog: ${CodingPracticeLogDeployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("CodingPracticeLog", CodingPracticeLogDeployment.address) as CodingPracticeLog;

    // Encrypt all values
    const encryptedInput = await fhevm
      .createEncryptedInput(CodingPracticeLogDeployment.address, signers[0].address)
      .add32(minutes)
      .add32(problems)
      .add32(successes)
      .add32(failures)
      .encrypt();

    const tx = await contract
      .connect(signers[0])
      .addEntry(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.handles[3],
        encryptedInput.inputProof
      );
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`CodingPracticeLog addEntry(${minutes}, ${problems}, ${successes}, ${failures}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:get-statistics
 *   - npx hardhat --network sepolia task:get-statistics
 */
task("task:get-statistics", "Gets the encrypted statistics for the signer")
  .addOptionalParam("address", "Optionally specify the CodingPracticeLog contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const CodingPracticeLogDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("CodingPracticeLog");
    console.log(`CodingPracticeLog: ${CodingPracticeLogDeployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("CodingPracticeLog", CodingPracticeLogDeployment.address);

    const totalMinutes = await contract.getTotalMinutes(signers[0].address);
    const totalProblems = await contract.getTotalProblems(signers[0].address);
    const totalSuccesses = await contract.getTotalSuccesses(signers[0].address);
    const totalFailures = await contract.getTotalFailures(signers[0].address);
    const totalAttempts = await contract.getTotalAttempts(signers[0].address);
    const passRateNumerator = await contract.getPassRateNumerator(signers[0].address);

    if (totalMinutes === ethers.ZeroHash) {
      console.log("No statistics available yet");
      return;
    }

    const decryptedTotalMinutes = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalMinutes,
      CodingPracticeLogDeployment.address,
      signers[0],
    );
    const decryptedTotalProblems = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalProblems,
      CodingPracticeLogDeployment.address,
      signers[0],
    );
    const decryptedTotalSuccesses = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalSuccesses,
      CodingPracticeLogDeployment.address,
      signers[0],
    );
    const decryptedTotalFailures = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalFailures,
      CodingPracticeLogDeployment.address,
      signers[0],
    );
    const decryptedTotalAttempts = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalAttempts,
      CodingPracticeLogDeployment.address,
      signers[0],
    );
    const decryptedPassRateNumerator = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      passRateNumerator,
      CodingPracticeLogDeployment.address,
      signers[0],
    );

    console.log(`Statistics for ${signers[0].address}:`);
    console.log(`  Total Minutes: ${decryptedTotalMinutes}`);
    console.log(`  Total Problems: ${decryptedTotalProblems}`);
    console.log(`  Total Successes: ${decryptedTotalSuccesses}`);
    console.log(`  Total Failures: ${decryptedTotalFailures}`);
    console.log(`  Total Attempts: ${decryptedTotalAttempts}`);
    console.log(`  Pass Rate Numerator: ${decryptedPassRateNumerator}`);
    if (decryptedTotalAttempts > 0) {
      const passRate = Math.floor(Number(decryptedPassRateNumerator) / Number(decryptedTotalAttempts) / 100);
      console.log(`  Pass Rate: ${passRate}%`);
    }
  });

