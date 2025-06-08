require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    bsc: {
      url: "https://bsc-dataseed.binance.org/",
      accounts: [process.env.PRIVATE_KEY],    
      chainId: 56,
      gasPrice: 20000000000                      
    }
  },
  etherscan: {
    apiKey: {
      bsc: process.env.BSCSCAN_API_KEY       
    }
  }
};
