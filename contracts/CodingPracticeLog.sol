// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title CodingPracticeLog - Encrypted Coding Practice Log
/// @notice A contract for storing encrypted daily coding practice data
/// @dev Uses FHE to encrypt and compute statistics on practice data
contract CodingPracticeLog is SepoliaConfig {
    /// @notice Structure to store a practice entry
    struct PracticeEntry {
        uint256 timestamp;
        euint32 codingMinutes;      // Minutes spent coding
        euint32 problems;      // Number of problems solved
        euint32 successes;    // Number of successful attempts
        euint32 failures;      // Number of failed attempts
    }

    /// @notice Mapping from user address to their practice entries
    mapping(address => PracticeEntry[]) private userEntries;

    /// @notice Mapping from user address to encrypted total statistics
    mapping(address => euint32) private totalMinutes;
    mapping(address => euint32) private totalProblems;
    mapping(address => euint32) private totalSuccesses;
    mapping(address => euint32) private totalFailures;
    mapping(address => euint32) private totalAttempts;
    mapping(address => euint32) private passRateNumerator; // successes * 100 for pass rate calculation

    /// @notice Events
    event EntryAdded(address indexed user, uint256 indexed entryIndex, uint256 timestamp);
    event StatisticsUpdated(address indexed user);

    /// @notice Add a new practice entry
    /// @param encryptedMinutes Encrypted minutes spent coding
    /// @param encryptedProblems Encrypted number of problems solved
    /// @param encryptedSuccesses Encrypted number of successful attempts
    /// @param encryptedFailures Encrypted number of failed attempts
    /// @param inputProof The input proof for all encrypted values
    function addEntry(
        externalEuint32 encryptedMinutes,
        externalEuint32 encryptedProblems,
        externalEuint32 encryptedSuccesses,
        externalEuint32 encryptedFailures,
        bytes calldata inputProof
    ) external {
        // Convert external ciphertexts to internal encrypted types
        euint32 codingMinutes = FHE.fromExternal(encryptedMinutes, inputProof);
        euint32 problems = FHE.fromExternal(encryptedProblems, inputProof);
        euint32 successes = FHE.fromExternal(encryptedSuccesses, inputProof);
        euint32 failures = FHE.fromExternal(encryptedFailures, inputProof);

        // Create new entry
        PracticeEntry memory newEntry = PracticeEntry({
            timestamp: block.timestamp,
            codingMinutes: codingMinutes,
            problems: problems,
            successes: successes,
            failures: failures
        });

        // Store entry
        userEntries[msg.sender].push(newEntry);

        // Update statistics
        totalMinutes[msg.sender] = FHE.add(totalMinutes[msg.sender], codingMinutes);
        totalProblems[msg.sender] = FHE.add(totalProblems[msg.sender], problems);
        totalSuccesses[msg.sender] = FHE.add(totalSuccesses[msg.sender], successes);
        totalFailures[msg.sender] = FHE.add(totalFailures[msg.sender], failures);
        
        // Calculate total attempts (successes + failures)
        euint32 attempts = FHE.add(successes, failures);
        totalAttempts[msg.sender] = FHE.add(totalAttempts[msg.sender], attempts);

        // Calculate pass rate numerator (successes * 100)
        euint32 successMultiplied = FHE.mul(successes, FHE.asEuint32(100));
        passRateNumerator[msg.sender] = FHE.add(passRateNumerator[msg.sender], successMultiplied);

        // Set ACL permissions for all encrypted values
        FHE.allowThis(codingMinutes);
        FHE.allow(codingMinutes, msg.sender);
        FHE.allowThis(problems);
        FHE.allow(problems, msg.sender);
        FHE.allowThis(successes);
        FHE.allow(successes, msg.sender);
        FHE.allowThis(failures);
        FHE.allow(failures, msg.sender);
        FHE.allowThis(totalMinutes[msg.sender]);
        FHE.allow(totalMinutes[msg.sender], msg.sender);
        FHE.allowThis(totalProblems[msg.sender]);
        FHE.allow(totalProblems[msg.sender], msg.sender);
        FHE.allowThis(totalSuccesses[msg.sender]);
        FHE.allow(totalSuccesses[msg.sender], msg.sender);
        FHE.allowThis(totalFailures[msg.sender]);
        FHE.allow(totalFailures[msg.sender], msg.sender);
        FHE.allowThis(totalAttempts[msg.sender]);
        FHE.allow(totalAttempts[msg.sender], msg.sender);
        FHE.allowThis(passRateNumerator[msg.sender]);
        FHE.allow(passRateNumerator[msg.sender], msg.sender);

        emit EntryAdded(msg.sender, userEntries[msg.sender].length - 1, block.timestamp);
        emit StatisticsUpdated(msg.sender);
    }

    /// @notice Get the number of entries for a user
    /// @param user The user address
    /// @return The number of entries
    function getEntryCount(address user) external view returns (uint256) {
        return userEntries[user].length;
    }

    /// @notice Get a specific entry for a user
    /// @param user The user address
    /// @param index The entry index
    /// @return timestamp The timestamp of the entry
    /// @return codingMinutes Encrypted minutes
    /// @return problems Encrypted problems count
    /// @return successes Encrypted successes count
    /// @return failures Encrypted failures count
    function getEntry(
        address user,
        uint256 index
    ) external view returns (
        uint256 timestamp,
            euint32 codingMinutes,
        euint32 problems,
        euint32 successes,
        euint32 failures
    ) {
        require(index < userEntries[user].length, "Entry index out of bounds");
        PracticeEntry memory entry = userEntries[user][index];
        return (
            entry.timestamp,
            entry.codingMinutes,
            entry.problems,
            entry.successes,
            entry.failures
        );
    }

    /// @notice Get encrypted total minutes for a user
    /// @param user The user address
    /// @return Encrypted total minutes
    function getTotalMinutes(address user) external view returns (euint32) {
        return totalMinutes[user];
    }

    /// @notice Get encrypted total problems for a user
    /// @param user The user address
    /// @return Encrypted total problems
    function getTotalProblems(address user) external view returns (euint32) {
        return totalProblems[user];
    }

    /// @notice Get encrypted total successes for a user
    /// @param user The user address
    /// @return Encrypted total successes
    function getTotalSuccesses(address user) external view returns (euint32) {
        return totalSuccesses[user];
    }

    /// @notice Get encrypted total failures for a user
    /// @param user The user address
    /// @return Encrypted total failures
    function getTotalFailures(address user) external view returns (euint32) {
        return totalFailures[user];
    }

    /// @notice Get encrypted total attempts for a user
    /// @param user The user address
    /// @return Encrypted total attempts
    function getTotalAttempts(address user) external view returns (euint32) {
        return totalAttempts[user];
    }

    /// @notice Get encrypted pass rate numerator (successes * 100) for a user
    /// @param user The user address
    /// @return Encrypted pass rate numerator
    function getPassRateNumerator(address user) external view returns (euint32) {
        return passRateNumerator[user];
    }
}

