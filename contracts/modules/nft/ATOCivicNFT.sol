// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title ATOCivicNFT – NFT Proof-of-Impact & Civic Identity Layer
/// @notice DAO-controlled issuance of verifiable civic participation NFTs
contract ATOCivicNFT is Initializable, ERC721URIStorageUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    uint256 private _tokenIdCounter;

    struct ProofMetadata {
        string category;       // e.g. "NGO_DONATION", "DAO_VOTE", "CIVIC_ACTION"
        uint256 timestamp;
    }

    mapping(uint256 => ProofMetadata) public proofData;

    event CivicNFTIssued(address indexed to, uint256 tokenId, string category);
    event CivicNFTBurned(uint256 tokenId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address dao) public initializer {
        __ERC721_init("ATO Civic Proof", "ATOID");
        __ERC721URIStorage_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, dao);
        _grantRole(DAO_ROLE, dao);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /// @notice DAO-only: Issue NFT with metadata
    function issueNFT(address to, string memory category, string memory tokenURI)
        external onlyRole(DAO_ROLE) returns (uint256)
    {
        require(to != address(0), "Invalid recipient");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        proofData[tokenId] = ProofMetadata({
            category: category,
            timestamp: block.timestamp
        });

        emit CivicNFTIssued(to, tokenId, category);
        return tokenId;
    }

    /// @notice NFT owner may burn their token
    function burn(uint256 tokenId) external {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        _burn(tokenId);
        delete proofData[tokenId];
        emit CivicNFTBurned(tokenId);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ERC721Upgradeable.ownerOf(tokenId);
        return (spender == owner || isApprovedForAll(owner, spender) || getApproved(tokenId) == spender);
    }

    function getProof(uint256 tokenId) external view returns (string memory category, uint256 timestamp) {
        ProofMetadata memory data = proofData[tokenId];
        return (data.category, data.timestamp);
    }

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(AccessControlUpgradeable, ERC721URIStorageUpgradeable)
    returns (bool)
{
    return super.supportsInterface(interfaceId);
}

}
