import * as FileSaver from 'file-saver'

export const C = {
    // Application
    APP_API_KEY_ETHERSCAN       : '5BTDVB4ICDU3X7BBBR5NUW1QHPH3XK3NSN', // for the development version
    APP_GASLIMIT_TX_HEX         : '0x9C40',
    APP_GASLIMIT_CONTRACT_HEX   : '0x9C40',
    APP_PSBT_USEOF_ONLINE       : 'online',
    APP_PSBT_USEOF_OFFLINE      : 'offline',
    APP_VERTION                 : '1.0.001',

    // Account Type
    ACCOUNT_TYPE_SHARED         : <'single' | 'shared'>'shared',
    ACCOUNT_TYPE_SINGLE         : <'single' | 'shared'>'single',

    // Account Currency Type
    ACCOUNT_CURRENCY_BTC        : <'btc' | 'eth' | 'eos'>'btc',
    ACCOUNT_CURRENCY_ETH        : <'btc' | 'eth' | 'eos'>'eth',
    ACCOUNT_CURRENCY_EOS        : <'btc' | 'eth' | 'eos'>'eos',

    // Account Payment Type
    ACCOUNT_PAYMENT_P2PK        : 'p2pk',
    ACCOUNT_PAYMENT_P2PKH       : 'p2pkh',
    ACCOUNT_PAYMENT_P2SH        : 'p2sh',
    ACCOUNT_PAYMENT_P2WPKH      : 'p2wpkh',
    ACCOUNT_PAYMENT_P2WSH       : 'p2wsh',
    ACCOUNT_PAYMENT_N2WPKH      : 'n2wpkh',
    ACCOUNT_PAYMENT_N2WSH       : 'n2wsh',

    // Navigation ID
    NAVIGATION_ID_ETHSINGLE     : 'ethsingle',
    NAVIGATION_ID_SHARED        : 'shared',
    NAVIGATION_ID_SINGLE        : 'single',
    NAVIGATION_ID_PSBTSOM32     : 'psbtsom32',

    // Network Type
    NETWORK_MAINNET             : 'mainnet',
    NETWORK_TESTNET             : 'testnet',
    
    // Payment Type
    PAYMENT_TYPE_SCRIPT         : 'script',
    PAYMENT_TYPE_SIGWIT         : 'sigwit',
    
    // Som32 PSBT Service's action name
    PSBT_ACTION_NAME_COMBINED   : 'COMBINED',
    PSBT_ACTION_NAME_CREATED    : 'CREATED',
    PSBT_ACTION_NAME_COMPLETE   : 'COMPLETE',
    PSBT_ACTION_NAME_HISTORY    : 'HISTORY',
    PSBT_ACTION_NAME_SIGNED     : 'SIGNED',
    
    // Router Path
    ROUTE_PATH_MAIN_START           : '/main/start',
    ROUTE_PATH_PSBT_CREATE          : '/wallet/psbt/create',
    ROUTE_PATH_PSBT_COMBINE         : '/wallet/psbt/combine',
    ROUTE_PATH_PSBT_PUSH            : '/wallet/psbt/push',
    ROUTE_PATH_PSBT_SIGN            : '/wallet/psbt/sign',
    ROUTE_PATH_PSBT_SOM32           : '/wallet/psbt/som32',
    ROUTE_PATH_WALLET_HOME          : '/wallet/home',

    // Session values
    SESSION_PATH_CONFIG              : 'config',
    SESSION_PATH_CURRENCY_SYMBOL     : 'currency.symbol',
    SESSION_PATH_LAYOUT_FOOTER_HIDDEN: 'footer.hidden',
    SESSION_PATH_PSBT_COMBINED       : 'psbt.combined',
    SESSION_PATH_PSBT_CREATED        : 'psbt.created',
    SESSION_PATH_PSBT_SIGNED         : 'psbt.signed',
    SESSION_PATH_PSBT_USEOF          : 'config.psbt.useof',
    SESSION_PATH_SALT                : 'salt',
    SESSION_PATH_WALLET              : 'wallet',
    SESSION_PATH_WALLET_ISIMPORTED   : 'wallet.isimported',
    SESSION_PATH_WALLET_PREVBAL      : 'wallet.header.prevbalance',
}

export const ErrorMessagePassword: { [key: string]: string } = {
    required        : 'Password is required.',
    invalidwallet   : 'Invalid Wallet Import Format.',
    nohdpath        : 'Not found deriving path in your wallet.',
    nomnemonic      : 'Not found mnemonic-word in your wallet.',
    invalidpassword : 'Invalid password.',
    minLength       : 'Password must contain at least 8 characters.',
    mismatch        : 'Passwords don\'t match.',
    unique          : 'Passwords must contain at least 3 unique characters.'
}

export const blobExport = (data: any, filename: string, encrypt: boolean = true) => {
    let source = encrypt ? toBase64(data) : data
    let blob = new Blob([source], { type: "text/json;charset=UTF-8" })
    FileSaver.saveAs(blob, filename)
}

export const toBase64 = (data: any): string => {
    return Buffer.from(JSON.stringify(data)).toString('base64')
}

export const toHex = (data: any): string => {
    return Buffer.from(JSON.stringify(data)).toString('hex')
}
