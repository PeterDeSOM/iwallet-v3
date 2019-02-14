/*
 * BitcoinJS's type references
 */
export interface IBitcoinjsNetwork {
    messagePrefix   : string
    bech32          : string
    bip32           : {
      public    : number
      private   : number 
    }
    pubKeyHash      : number 
    scriptHash      : number 
    wif             : number 
}
export interface IBitcoinjsBIP32 {
    constructor(d: Buffer, Q: Buffer, chainCode: Buffer, network: IBitcoinjsNetwork)

    identifier: Buffer
    fingerprint: Buffer
    privateKey: Buffer
    publicKey: Buffer

    depth: number
    index: number
    parentFingerprint: number
    network: IBitcoinjsNetwork

    isNeutered(): boolean
    neutered(): IBitcoinjsBIP32
    toBase58(): string
    toWIF(): string
    derive(index: number): IBitcoinjsBIP32
    deriveHardened(index: number): IBitcoinjsBIP32
    derivePath(path: string): IBitcoinjsBIP32
    sign(hash: Buffer): Buffer
    verify(hash: Buffer, signature: Buffer): boolean
}
export interface IBitcoinjsRedeem {
    network?: IBitcoinjsNetwork
    input?  : Buffer
    output? : Buffer
    witness?: Buffer[]
}
export interface IBitcoinjsP2PK {
    input       : Buffer
    output      : Buffer
    witness     : Buffer[]
    signature   : Buffer
    pubkey      : Buffer
}
export interface IBitcoinjsP2PKH {
    input       : Buffer
    output      : Buffer
    address     : string
    hash        : Buffer
    witness     : Buffer[]
    signature   : Buffer
    pubkey      : Buffer
}
export interface IBitcoinjsP2MS {
    network?    : IBitcoinjsNetwork
    input?      : Buffer
    output      : Buffer
    m           : number
    n           : number
    pubkeys     : Buffer[]
    signatures? : Buffer[]
    witness?    : Buffer[]
}
export interface IBitcoinjsP2SH {
    network?: IBitcoinjsNetwork
    input?  : Buffer
    output  : Buffer
    address : string
    hash    : Buffer
    redeem  : IBitcoinjsP2MS
    witness?: Buffer[]
}


/*
 * Som32 Wallet's type references
 */
export interface ISom32PsbtDecoded {
    tx: {
        vout: {
            value       : number
            n           : number
            scriptPubKey: {
                addresses: string[]
            }
        }[]
    }
    inputs: {
        witness_utxo: {
            amount: number
        }
        partial_signatures: {}
    }[]
    fee: number
}
export interface ISom32PsbtImportForm {
    network : string
    version : string
    type    : string
    multisig: ISom32AccountShared
    by      : string
    hex     : string
    base64  : string
}

export interface ISom32AccountSingle {
    name     : string
    address  : string
    pubkey   : string
    wif      : string
    multis   : string[]
    desc     : string
}

export interface ISom32AccountShared {
    name     : string
    address  : string
    m        : number
    n        : number
    pubkeys  : string[]
    script   : {
        pubkey: string
        redeem: string
        witess: string
    }
    singles : string[]
    desc     : string
}

export interface ISom32Account {
    currency    : 'btc' | 'eth' | 'eos'
    opened      : string
    type        : 'single' | 'shared'
    payto       : ('p2pk' | 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'n2wpkh' | 'n2wsh')[]
    single?     : ISom32AccountSingle[]
    shared      : ISom32AccountShared[]
}

export interface ISom32Extenal {
    version : string
    network : 'mainnet' | 'testnet'
    account : ISom32Account
    bip32   : {
        levels      : string
        path        : string
    }
    bip39   : {
        _entropy: number
        _code   : string
    }
}

export interface ISom32Alert {
    title   : string
    msg     : string
    desc    : string
    button  : ('OK' | 'CANCEL' | 'YES' | 'NO')[]
}

export interface ISom32Balance {
    total_received      : number
    total_sent          : number
    balance             : number
    unconfirmed_balance : number
    final_balance       : number
    n_tx                : number
    unconfirmed_n_tx    : number
    final_n_tx          : number
}

export interface ISom32PsbtInfo {
    type        : string
    typeDesc    : string
    by          : string
    recipient   : string
    complete    : boolean
    amount      : number
    fee         : number
    signers     : string[],
}

export interface ISOM32RawTxToSend {
    inputs  : Array<any>
    outputs : Array<any>
    bytes   : number
    totalfee: number
    hex     : string
}
export interface ISOM32TxFormToSend {
    to          : string
    amount      : number
    fee         : number
    bytes?      : number
    description : string
}
export interface ISOM32Wallet {
    accountType : 'single' | 'shared'
    useMnemonic : boolean
    wallet      : IBIP32Wallet
}
export interface IBIP32Wallet {
    mnemonic            : string
    seed512             : string
    privateKey          : string
    publicKey           : string
    chaincode           : string
    wifPrivateKey       : string
    extPrivateKey       : string
    hash160Identifier   : string
    fingerprint         : string
    paymentPrivateKey   : string
    paymentPrivateKeyWif: string
    paymentPubKey       : string
    paymentP2PK         : IBitcoinjsP2PK
    paymentP2PKH        : IBitcoinjsP2PKH
    paymentP2SH         : IBitcoinjsP2SH
    paymentP2WPKH       : IBitcoinjsP2PKH
    paymentP2WSH        : IBitcoinjsP2SH
    paymentN2WPKH       : IBitcoinjsP2SH
    paymentN2WSH        : IBitcoinjsP2SH
    changePubKey        : string
}

/*
 * bitcoinfees.earn.com's type references
 */
export interface IBitcoinfeesTypes {
    fastestFee  : number
    halfHourFee : number
    hourFee     : number
}
/*
 * Blockchain.info's type references
 */
export interface IBlockchainInfoTxOutputPoint {
    tx_index: number
    n       : number
}
export interface IBlockchainInfoTxOutput {
    spent               : boolean
    spending_outpoints? : IBlockchainInfoTxOutputPoint[]
    tx_index            : number
    type                : number
    addr                : string
    value               : number
    n                   : number
    script              : string
}
export interface IBlockchainInfoTxInput {
    sequence: number
    witness : string
    prev_out: IBlockchainInfoTxOutput
    script  : string
}
export interface IBlockchainInfoTx {
    hash            : string
    ver             : number
    vin_sz          : number
    vout_sz         : number
    lock_time       : number
    size            : number
    relayed_by      : string
    block_height?   : number
    tx_index        : number
    inputs          : IBlockchainInfoTxInput[]
    out             : IBlockchainInfoTxOutput[]
    weight          : number
    result          : number
    block_index?    : number
    time            : number
}
export interface IBlockchainInfoAddressTxs {
    hash160         : string
    address         : string
    n_tx            : number
    total_received  : number
    total_sent      : number
    final_balance   : number
    txs             : IBlockchainInfoTx[]
}
export interface IBlockchainInfoUnspent {
    tx_hash             : string
    tx_hash_big_endian  : string
    tx_index            : number
    tx_output_n         : number
    script              : string
    value               : number
    value_hex           : string
    confirmations       : number
}
export interface IBlockchainInfoUnspents {
    unspent_outputs: IBlockchainInfoUnspent[]
}

/*
 * Blockcypher.com's type references
 */
export interface IBlockcypherBlock {
    block_hash  : string
    block_height: number
    hash        : string
    addresses   : string[]
}
export interface IBlockcypherTxInput {
    prev_hash   : string
    output_index: number
    script      : string
    output_value: number
    sequence    : number
    addresses   : string[]
    script_type : string
}
export interface IBlockcypherTxOutput {
    value       : number
    script      : string
    addresses   : string[]
    script_type : string
}
export interface IBlockcypherTx {
    block_hash      : string
    block_height    : number
    hash            : string
    addresses       : string[]
    total           : number
    fees            : number
    size            : number
    preference      : string
    relayed_by      : string
    confirmed       : string
    received        : string
    ver             : number
    lock_time       : number
    double_spend    : boolean
    vin_sz          : number
    vout_sz         : number
    confirmations   : number
    confidence      : number
    inputs          : IBlockcypherTxInput[]
    outputs         : IBlockcypherTxOutput[]
}
export interface IBlockcypherTxref {
    tx_hash         : string
    block_height    : number
    tx_input_n      : number
    tx_output_n     : number
    value           : number
    ref_balance     : number
    spent           : boolean
    confirmations   : number
    confirmed       : string
    double_spend    : boolean
}
export interface IBlockcypherAddressBalance {
    address?            : string
    total_received      : number
    total_sent          : number
    balance             : number
    unconfirmed_balance : number
    final_balance       : number
    n_tx                : number
    unconfirmed_n_tx    : number
    final_n_tx          : number
}
export interface IBlockcypherAddressTxrefs extends IBlockcypherAddressBalance {
    txrefs: IBlockcypherTxref[]
    tx_url: string
}
export interface IBlockcypherAddressTxs extends IBlockcypherAddressBalance {
    txs: IBlockcypherTx[]
}

/*
 * Etherscan type reference
 */
export interface IEtherscanTx {
    blockNumber         : number
    timeStamp           : number
    hash                : string
    nonce               : number
    blockHash           : string
    transactionIndex    : number
    from                : string
    to                  : string
    value               : number
    gas                 : number
    gasPrice            : number
    isError             : number
    txreceipt_status    : string
    input               : string
    contractAddress     : string
    cumulativeGasUsed   : number
    gasUsed             : number
    confirmations       : number
}

/*
 * Smartbit type reference
 */
export interface SmartbitBalance {
    success: boolean
    address: {
        address: string
        total: {
            received: number
            received_int: number
            spent: number
            spent_int: number
            balance: number
            balance_int: number
            input_count: number
            output_count: number
            transaction_count: number
        }
        confirmed: {
            received: number
            received_int: number
            spent: number
            spent_int: number
            balance: number
            balance_int: number
            input_count: number
            output_count: number
            transaction_count: number
        }
        unconfirmed: {
            received: number
            received_int: number
            spent: number
            spent_int: number
            balance: number
            balance_int: number
            input_count: number
            output_count: number
            transaction_count: number
        }
        multisig: {
            confirmed: {
                balance: number
                balance_int: number
            }
            unconfirmed: {
                balance: number
                balance_int: number
            }
        }
    }
}