export const som32Config = {
    navigation: {
        id: 'single',
    },
    account: {
        currency: 'btc',
        opened  : '',
        type    : 'single',
    },
    psbt: {
        useof: 'offline',
    },
    values : {
        currency: {
            symbol: ['btc', 'eth', 'eos'],
        },
        navigation: {
            id: ['single', 'shared', 'psbtsom32'],
        },
        account: {
            type: ['single', 'shared'],
        },
        psbt: {
            useof: ['online', 'offline'],
        },
    }
}
