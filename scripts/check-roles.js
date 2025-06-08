const { ethers } = require("hardhat");

async function main() {
  const ADDRESSES = {
   •ATO Token Contract: "0xA04973912507064d0E7130b78eb527b68ca04E8A",
   •Referral Engine Contract: "0xDE055393D97d8b207faA2805319a0366A3631e3D",
   •Staking Contract: "0x4A5A98E56629cfC451eCe4503089DE9856A8841d",
   •Civic NFT Registry Contract: "0x0d1aDf09d519ADA5F7894ea11Ac86Cc57A3f0817",
   •AI Guardian Contract: "0x8126833b3128355A65Bc6416cb08AD4926949eef",
   •NGO Fund Contract: "0x6Dc86480BdAC456F00585e95eFe138E4Bb527895",
   •DAO Treasury Contract: "0xdf380eb404C33abF3c5793543cb9Efdd35c9Ec6d",
   •Arbitration Council: "0x5bb43A0417b2363e79fFaCE25894d1EF1159D6e6" 

  };

 
  const DAO_ROLE = ethers.id("DAO_ROLE"); 
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const DAO_ADDRESS = "0x7eB5D199BaB7BA2b6BbEeF7D07Eea62f2B838548";

  const ABI = [
    "function hasRole(bytes32, address) view returns (bool)",
    "function getRoleAdmin(bytes32) view returns (bytes32)"
  ];

  for (const [name, address] of Object.entries(ADDRESSES)) {
    const contract = await ethers.getContractAt(ABI, address);

    console.log(`\n--- Checking roles for ${name} at ${address} ---`);

    
    let hasDaoRole = await contract.hasRole(DAO_ROLE, DAO_ADDRESS);
    console.log(`DAO_ROLE assigned to DAO_ADDRESS (${DAO_ADDRESS}): ${hasDaoRole}`);

    
    let hasDao = await contract.hasRole(DAO_ROLE, address);
    console.log(`DAO_ROLE assigned to contract address itself: ${hasDao}`);

    
    let adminDao = await contract.getRoleAdmin(DAO_ROLE);
    console.log(`Admin of DAO_ROLE: ${adminDao}`);

    let adminDefault = await contract.getRoleAdmin(DEFAULT_ADMIN_ROLE);
    console.log(`Admin of DEFAULT_ADMIN_ROLE: ${adminDefault}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
