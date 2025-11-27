import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedCodingPracticeLog = await deploy("CodingPracticeLog", {
    from: deployer,
    log: true,
  });

  console.log(`CodingPracticeLog contract: `, deployedCodingPracticeLog.address);
};
export default func;
func.id = "deploy_codingPracticeLog"; // id required to prevent reexecution
func.tags = ["CodingPracticeLog"];

