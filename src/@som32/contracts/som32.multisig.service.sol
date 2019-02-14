pragma solidity >=0.4.22 <0.6.0;
import "./som32.token.erc20.sol";

/**
 * @title Som32 Multi-Signature Service - Som32 Multi-Signature Service service supports Multi-Signature feature for the ETH transaction, and it provides up to 15-of-15 authorizers to sign a Multi-Sig transaction.
 * @author Peter Kim - <peterkim@crypblorm.com>
 */
contract Som32MultiSigService {

    string private name;
    uint8 private m;
    uint8 private n;
    address[] private members;
    uint32 private txscount;

    mapping(uint32 => PSET) private psets;
    mapping(uint32 => bytes1) private psetstate;

    struct PSET {
        address recipient;
        uint256 amount;
        uint32 timelimit;
        address[] signed;
        bytes1 state;
    }

    constructor (
        string memory _name,
        uint8 _m,
        uint8 _n,
        address[] memory _members
    ) public {
        name = _name;
        m = _m;
        n = _n;
        members = _members;
        txscount = 0;
    }

    function createPset(address _recipient, uint256 _amount, uint32 _timelimit) public return (uint32 txid) {
        let txid_ = txscount;
        
        psets[_txid_] = PSET(_recipient, _amount, _timelimit, [], "0x00");
        psetstate[_txid_] = psets[_txid_].state;
        txscount += 1;

        return txid_;
    }

    function signPset(
        address _signer, 
        bytes32 _txid
    ) public return (bool signed) {
        
        psetstate[_txid].signed.push(_signer);
        psetstate[_txid].state = "0x01";

        return true;
    }

    function completePset(
        address _signer, 
        bytes32 _txid
    ) public return (bool signed) {
        
        psetstate[_txid].signed.push(_signer);
        psetstate[_txid].state = "0x01";

        signed = true;
    }

    function pushPset(
        address _signer, 
        bytes32 _txid
    ) public return (bool signed) {
        
        psetstate[_txid].signed.push(_signer);
        psetstate[_txid].state = "0x01";

        signed = true;
    }
}
