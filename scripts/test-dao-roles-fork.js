const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0xA04973912507064d0E7130b78eb527b68ca04E8A"; 
  const DAO_ADDRESS = "0x7eB5D199BaB7BA2b6BbEeF7D07Eea62f2B838548";
  const NON_DAO_ADDRESS = "0x000000000000000000000000000000000000dEaD"; 

  const ABI = [
    "function grantRole(bytes32, address)",
    "function revokeRole(bytes32, address)",
    "function upgradeTo(address)",
    "function hasRole(bytes32, address) view returns (bool)"
  ];
  const DAO_ROLE = ethers.id("DAO_ROLE");

  await ethers.provider.send("hardhat_impersonateAccount", [DAO_ADDRESS]);
  await ethers.provider.send("hardhat_impersonateAccount", [NON_DAO_ADDRESS]);

  const daoSigner = await ethers.getSigner(DAO_ADDRESS);
  const nonDaoSigner = await ethers.getSigner(NON_DAO_ADDRESS);

  const contract = new ethers.Contract(contractAddress, ABI, daoSigner);

  try {
    let tx = await contract.connect(daoSigner).grantRole(DAO_ROLE, NON_DAO_ADDRESS);
    await tx.wait();
    console.log("✅ grantRole by DAO_ADDRESS: Success (expected)");
  } catch (e) {
    console.log("❌ grantRole by DAO_ADDRESS: Failed (unexpected)", e.message);
  }

  try {
    let tx = await contract.connect(nonDaoSigner).grantRole(DAO_ROLE, NON_DAO_ADDRESS);
    await tx.wait();
    console.log("❌ grantRole by NON_DAO_ADDRESS: Success (unexpected!)");
  } catch (e) {
    console.log("✅ grantRole by NON_DAO_ADDRESS: Reverted as expected");
  }

  try {
    let tx = await contract.connect(daoSigner).upgradeTo(contractAddress);
    await tx.wait();
    console.log("✅ upgradeTo by DAO_ADDRESS: Success (expected)");
  } catch (e) {
    console.log("❌ upgradeTo by DAO_ADDRESS: Failed (unexpected)", e.message);
  }

  try {
    let tx = await contract.connect(nonDaoSigner).upgradeTo(contractAddress);
    await tx.wait();
    console.log("❌ upgradeTo by NON_DAO_ADDRESS: Success (unexpected!)");
  } catch (e) {
    console.log("✅ upgradeTo by NON_DAO_ADDRESS: Reverted as expected");
  }

  await ethers.provider.send("hardhat_stopImpersonatingAccount", [DAO_ADDRESS]);
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [NON_DAO_ADDRESS]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
