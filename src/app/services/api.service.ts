import { Injectable, OnDestroy, OnInit } from '@angular/core'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { BehaviorSubject, forkJoin, Observable, of, Subject } from 'rxjs'
import { catchError, delay, takeUntil, tap } from 'rxjs/operators'
import { address as Address } from 'bitcoinjs-lib'
import { 
    IBitcoinfeesTypes, 
    IBlockchainInfoUnspent,
    IEtherscanTx,
    ISom32Account,
    SmartbitBalance
} from '@som32/interfaces'
import { C } from '@som32/globals'

const httpOptions = {
    headers: new HttpHeaders({'Content-Type': 'application/json'})
};

const Url = {
    blockchainInfo  : "https://blockchain.info",
    blockcypher     : {
        address     : "https://api.blockcypher.com/v1/btc/main",
        transaction : "https://api.blockcypher.com/v1/bcy/main/txs/push"
    },
    sochain         : {
        txpush  : "https://chain.so/api/v2/send_tx/BTC",
    },
    bitcoinfees     : 'https://bitcoinfees.earn.com/api/v1/fees/recommended',
}

const UrlTest = {
    blockchainInfo  : {
        unspent : "https://testnet.blockchain.info/unspent?active={ADDRESS}&cors=true",
        txs     : "https://testnet.blockchain.info/rawaddr/{ADDRESS}?cors=true"
    },
    blockcypher     : {
        balance : "https://api.blockcypher.com/v1/btc/test3/addrs/{ADDRESS}/balance",
        txnew   : "https://api.blockcypher.com/v1/btc/test3/txs/new",
        txsend  : "https://api.blockcypher.com/v1/btc/test3/txs/send",
        txpush  : "https://api.blockcypher.com/v1/bcy/test/txs/push",
        txdecode: "https://api.blockcypher.com/v1/bcy/test/txs/decode"
    },
    sochain         : {
        txpush  : "https://chain.so/api/v2/send_tx/BTCTEST",
    },
    smartbit        : {
        balance : "https://testnet-api.smartbit.com.au/v1/blockchain/address/{ADDRESS}?tx=0",
        tx      : "https://testnet-api.smartbit.com.au/v1/blockchain/tx/{TX}",
        txhex   : "https://testnet-api.smartbit.com.au/v1/blockchain/tx/{TX}/hex",
        txs     : "https://testnet-api.smartbit.com.au/v1/blockchain/address/{ADDRESS}?limit=10",
        txpush  : "https://testnet-api.smartbit.com.au/v1/blockchain/pushtx",
        unspent : "https://testnet-api.smartbit.com.au/v1/blockchain/address/{ADDRESS}/unspent",
    },
}

const Som32Psbt = {
    getcomplete : "https://som32.crypblorm.com:28332/v0/psbt/getcomplete",
    list        : "https://som32.crypblorm.com:28332/v0/psbt/list/{ADDRESS}/{TARGET}/{BY}",
    create      : "https://som32.crypblorm.com:28332/v0/psbt/create",
    sign        : "https://som32.crypblorm.com:28332/v0/psbt/sign",
    combine     : "https://som32.crypblorm.com:28332/v0/psbt/combine",
    push        : "https://som32.crypblorm.com:28332/v0/psbt/push",
    cancel      : "https://som32.crypblorm.com:28332/v0/psbt/cancel",
}

const externals = {
    eth: {
        etherscan: {
            balance : "https://api.etherscan.io/api?module=account&action=balance&address={ADDRESS}&tag=latest&apikey={APIKEY}",
            txint   : "https://api.etherscan.io/api?module=account&action=txlistinternal&address={ADDRESS}&startblock=0&endblock=2702578&page=1&offset=10&sort=asc&apikey={APIKEY}",
            txext   : "https://api.etherscan.io/api?module=account&action=txlist&address={ADDRESS}&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey={APIKEY}",
        }
    },
}

const externals_test = {
    btc: {
        blockchainInfo  : {
            unspent : "https://testnet.blockchain.info/unspent?active={ADDRESS}&cors=true",
            txs     : "https://testnet.blockchain.info/rawaddr/{ADDRESS}?cors=true"
        },
        blockcypher     : {
            balance : "https://api.blockcypher.com/v1/btc/test3/addrs/{ADDRESS}/balance",
            txnew   : "https://api.blockcypher.com/v1/btc/test3/txs/new",
            txsend  : "https://api.blockcypher.com/v1/btc/test3/txs/send",
            txpush  : "https://api.blockcypher.com/v1/bcy/test/txs/push",
            txdecode: "https://api.blockcypher.com/v1/bcy/test/txs/decode"
        },
        sochain         : {
            txpush  : "https://chain.so/api/v2/send_tx/BTCTEST",
        },
        smartbit        : {
            balance : "https://testnet-api.smartbit.com.au/v1/blockchain/address/{ADDRESS}?tx=0",
            tx      : "https://testnet-api.smartbit.com.au/v1/blockchain/tx/{TX}",
            txhex   : "https://testnet-api.smartbit.com.au/v1/blockchain/tx/{TX}/hex",
            txs     : "https://testnet-api.smartbit.com.au/v1/blockchain/address/{ADDRESS}?limit=10",
            txpush  : "https://testnet-api.smartbit.com.au/v1/blockchain/pushtx",
            unspent : "https://testnet-api.smartbit.com.au/v1/blockchain/address/{ADDRESS}/unspent",
        },
        som32Psbt   : {
            getcomplete : "https://som32.crypblorm.com:28332/v0/psbt/getcomplete",
            list        : "https://som32.crypblorm.com:28332/v0/psbt/list/{ADDRESS}/{TARGET}/{BY}",
            create      : "https://som32.crypblorm.com:28332/v0/psbt/create",
            sign        : "https://som32.crypblorm.com:28332/v0/psbt/sign",
            combine     : "https://som32.crypblorm.com:28332/v0/psbt/combine",
            push        : "https://som32.crypblorm.com:28332/v0/psbt/push",
            cancel      : "https://som32.crypblorm.com:28332/v0/psbt/cancel",
        }
    },
    eth: {
        etherscan: {
            balance : "https://api-ropsten.etherscan.io/api?module=account&action=balance&address={ADDRESS}&tag=latest&apikey={APIKEY}",
            gas     : {
                price: "https://api-ropsten.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey={APIKEY}",
                estimate: "https://api-ropsten.etherscan.io/api?module=proxy&action=eth_estimateGas&to={TO}&value={VALUE}&gasPrice={GASPRICE}&gas=0xffffff&apikey={APIKEY}"
            },
            nonce   : "https://api-ropsten.etherscan.io/api?module=proxy&action=eth_getTransactionCount&address={ADDRESS}&tag=latest&apikey={APIKEY}",
            txpush  : "https://api-ropsten.etherscan.io/api?module=proxy&action=eth_sendRawTransaction&hex={RAWTX}&apikey={APIKEY}",
            txint   : "https://api-ropsten.etherscan.io/api?module=account&action=txlistinternal&address={ADDRESS}&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey={APIKEY}",
            txext   : "https://api-ropsten.etherscan.io/api?module=account&action=txlist&address={ADDRESS}&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey={APIKEY}",
        }
    },
    eos: {

    }
}

@Injectable({
    providedIn: 'root',
})
export class ApiService implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    private _addressValidator: AddressValidator;
    private _listItems: any[];
    private _entrusted: any;

    constructor(
        private http: HttpClient
    ) { 
        this._unsubscribeAll = new Subject()
        this._addressValidator = new AddressValidator()
    }

    private handleError<T> (operation = 'operation', result?: T) {
        return (error: any): Observable<T> => {
      
          // TODO: send the error to remote logging infrastructure
          console.error(error); // log to console instead
      
          // Let the app keep running by returning an empty result.
          return of(result as T);
        };
    }

    private jqLocalSelect (): any {
        return {
            select: function (input) {
                if (Array.isArray(input)) {
                    let keys = [].slice.call(arguments, 1)
                    return input.map(function (item) {
                        return Object.keys(item).reduce(
                            function (result, key) {
                                if (~keys.indexOf(key)) {
                                    result[key] = item[key]
                                }
                                return result
                            }, 
                            {}
                        )
                    })
                }
            }
        }
    }

    /**
     * On init
     */
    ngOnInit(): void {
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    public get entrusted() {
        let entrusted = this._entrusted
        this._entrusted = null
        return entrusted
    }
    public set entrusted(data: any) {
        this._entrusted = data
    }

    public getBalance(address: string, currency: ISom32Account["currency"] = C.ACCOUNT_CURRENCY_BTC): Observable<any> {

        // if(['P2WPKH', 'P2WSH'].includes(this._addressValidator.identify(address).type)) {
        //     return this.http.get<any>(UrlTest.smartbit.balance.replace('{ADDRESS}', address)).pipe(
        //     );
        // } else {
        //     return this.http.get<any>(UrlTest.blockcypher.balance.replace('{ADDRESS}', address)).pipe(
        //         tap(res => this.entrusted = res),
        //         catchError(this.handleError('getAddressBalance', []))
        //     );
        // }

        // return this.http.get<any>(UrlTest.blockcypher.balance.replace('{ADDRESS}', address)).pipe(
        //     tap(res => this.entrusted = res),
        //     catchError(this.handleError('getAddressBalance', []))
        // )

        if(currency == C.ACCOUNT_CURRENCY_ETH) {
            return this.http.get<any>(
                externals_test.eth.etherscan.balance
                .replace('{ADDRESS}', address)
                .replace('{APIKEY}', C.APP_API_KEY_ETHERSCAN)
            ).pipe(
                tap(
                    res => {
                        this.entrusted = {
                            total_received      : 0,
                            total_sent          : 0,
                            balance             : res.result,
                            unconfirmed_balance : 0,
                            final_balance       : 0,
                            n_tx                : 0,
                            unconfirmed_n_tx    : 0,
                            final_n_tx          : 0
                        }
                    }
                ),
                catchError(this.handleError('getAddressBalance', []))
            )
        } else if(currency == C.ACCOUNT_CURRENCY_EOS) {

        } else {
            return this.http.get<any>(UrlTest.smartbit.balance.replace('{ADDRESS}', address)).pipe(
                tap(
                    res => {
                        let r = <SmartbitBalance>res
                        this.entrusted = {
                            total_received      : r.address.confirmed.received_int,
                            total_sent          : r.address.confirmed.spent_int,
                            balance             : r.address.confirmed.balance_int,
                            unconfirmed_balance : r.address.unconfirmed.balance_int,
                            final_balance       : r.address.total.balance_int,
                            n_tx                : r.address.confirmed.transaction_count,
                            unconfirmed_n_tx    : r.address.unconfirmed.transaction_count,
                            final_n_tx          : r.address.total.transaction_count
                        }
                    }
                ),
                catchError(this.handleError('getAddressBalance', []))
            )
        }
    }

    /**
     * Blockchain Data API
     */ 
    public getTx(tx: string, hex: boolean): Observable<any> {
        return this.http.get<any>(
            !hex ?
            UrlTest.smartbit.tx.replace('{TX}', tx) :
            UrlTest.smartbit.txhex.replace('{TX}', tx)
        ).pipe(
            tap(
                res => {
                    this.entrusted = res.hex
                }
            ),
            catchError(this.handleError('getTxs', []))
        )
    }
        
    public getTxs(address: string, currency: ISom32Account["currency"] = C.ACCOUNT_CURRENCY_BTC): Observable<any> {
        // if(['P2WPKH', 'P2WSH'].includes(this._addressValidator.identify(address).type)) {
        //     return this.http.get<any>(UrlTest.smartbit.txs.replace('{ADDRESS}', address)).pipe(
        //     )
        // } else {
        //     return this.http.get<any>(UrlTest.blockchainInfo.txs.replace('{ADDRESS}', address)).pipe(
        //         tap(
        //             res => {
        //                 let txs: IBlockchainInfoTx[]  = res.txs;
        //                 let listItems = [];

        //                 for (let tx of txs) {
        //                     let txtime = new Date(tx.time * 1000);
        //                     let type = tx.inputs.find(input => input.prev_out.addr === address) ? 'Sent' : 'Received';
        //                     let addr = type == 'Sent' ? JQ(`.out[addr!=${address}].addr`, { data: tx }).value : tx.inputs[0].prev_out.addr;
        //                     let coin = type == 
        //                         'Sent' ? 
        //                         JQ(`.out[addr!=${address}].value`, { data: tx }).value * -1 : 
        //                         JQ(`.out[addr=${address}].value`, { data: tx }).value;
                                
        //                     let listItem = {
        //                         hash        : tx.hash,
        //                         indicator   : type == 'Sent' ? 'To' : 'From',
        //                         addr        : addr,
        //                         amount      : coin,
        //                         time        : txtime.toLocaleDateString() + ' ' + txtime.toLocaleTimeString(),
        //                         confirmed   : typeof(tx.block_index)=='undefined' ? false : true
        //                     };
        //                     listItems.push(listItem);
        //                 }

        //                 this.entrusted = listItems;
        //             }
        //         ),
        //         catchError(this.handleError('getTxs', []))
        //     )
        // }

        if(currency == C.ACCOUNT_CURRENCY_EOS) {

            // TODO: 
            
        } else if(currency == C.ACCOUNT_CURRENCY_ETH) {
            let entxs = this.http.get<any>(
                externals_test.eth.etherscan.txext
                .replace('{ADDRESS}', address)
                .replace('{APIKEY}', C.APP_API_KEY_ETHERSCAN)
            )
            let intxs = this.http.get<any>(
                externals_test.eth.etherscan.txint
                .replace('{ADDRESS}', address)
                .replace('{APIKEY}', C.APP_API_KEY_ETHERSCAN)
            ).pipe(delay(100))

            return forkJoin(entxs, intxs).pipe(
                tap(res => {
                    this.entrusted = res.map(typetxs => {
                        return typetxs.result.map(txres => {

                            let confirmed = typeof typetxs.confirmations == 'undefined' || !!!typetxs.confirmations ? true : true

                            let txtime = new Date(txres.timeStamp * 1000)
                            let type = txres.from == address.toLowerCase() ? 'Sent' : 'Received'
                            let addr = txres.to
                            let coin = txres.value

                            return {
                                hash        : txres.hash,
                                indicator   : type == 'Sent' ? 'To' : 'From',
                                addr        : addr,
                                amount      : coin * (type == 'Sent' ? -1 : 1),
                                time        : txtime.toLocaleDateString() + ' ' + txtime.toLocaleTimeString(),
                                confirmed   : confirmed
                            }
                        })
                    })
                })
            )
        } else {
            return this.http.get<any>(UrlTest.smartbit.txs.replace('{ADDRESS}', address)).pipe(
                tap(
                    res => {
                        let txs = res.address.transactions || [];
                        let listItems = [];
    
                        for (let tx of txs) {
                            if(tx.coinbase) continue
    
                            let txtime = new Date(tx.time * 1000);
                            let type = tx.inputs.find(input => input.addresses.includes(address)) ? 'Sent' : 'Received';
                            let addr = ''
                            let coin = 0
                            if(type == 'Sent') {
                                let output = tx.outputs.find(output => !output.addresses.includes(address))
                                if(!!!output) {
                                    tx.outputs.sort((a, b) => b.value - a.value)
                                    addr = tx.outputs[0]["addresses"][0]
                                    coin = tx.outputs[0]["value_int"]
                                } else {
                                    addr = output["addresses"][0]
                                    coin = output["value_int"]
                                }
                            } else {
                                addr = tx.inputs[0].addresses[0]
                                coin = tx.outputs.find(output => output.addresses.includes(address))["value_int"]
                            }
                            let listItem = {
                                hash        : tx.hash,
                                indicator   : type == 'Sent' ? 'To' : 'From',
                                addr        : addr,
                                amount      : coin * (type == 'Sent' ? -1 : 1),
                                time        : txtime.toLocaleDateString() + ' ' + txtime.toLocaleTimeString(),
                                confirmed   : tx.confirmations !== 0
                            };
                            listItems.push(listItem);
                        }
    
                        this.entrusted = listItems;
                    }
                ),
                catchError(this.handleError('getTxs', []))
            )
        }
    }

    /**
     * Blockchain Data API
     */ 
    public getUnspents(address: string): Observable<any> {
        if(['P2WPKH', 'P2WSH'].includes(this._addressValidator.identify(address).type)) {
            return this.http.get<any>(UrlTest.smartbit.unspent.replace('{ADDRESS}', address)).pipe(
                tap(
                    res => {
                        // TODO:   define a Som32-Unspent interface to adopt any of 3rd parties's form 
                        //          as Som32 owns.
                        //          IBlockchainInfoUnspent will be converted and adopted as Som32-Unspent.

                        let unspents: IBlockchainInfoUnspent[] = []

                        for (let unspent of res.unspent) {
                            unspents.push({
                                tx_hash             : unspent.txid,
                                tx_hash_big_endian  : unspent.txid,
                                tx_index            : unspent.id,
                                tx_output_n         : 0,
                                script              : JSON.stringify(unspent.script_pub_key),
                                value               : unspent.value_int,
                                value_hex           : '',
                                confirmations       : unspent.confirmations,
                            })
                        }

                        this.entrusted = unspents
                    }
                ),
                catchError(this.handleError('getTxs', []))
            )
        } else {
            return this.http.get<any>(UrlTest.blockchainInfo.unspent.replace('{ADDRESS}', address)).pipe(
                takeUntil(this._unsubscribeAll),
                tap(res => this.entrusted = res.unspent_outputs),
                catchError(this.handleError('getTxs', []))
            )
        }
    }

    /**
     * Blockcypher Data API
     */ 
    public generateTx(inouts: any): Observable<any> {
        return this.http.post<any>(UrlTest.blockcypher.txnew, inouts).pipe(
            catchError(this.handleError('generateTx', []))
        )
    }

    /**
     * Blockcypher's send raw transaction api is not working, 
     * instead sochain's send raw transaction api
     */ 
    // public pushTx(rawtx: string): Observable<any> {
    //     return this.http.post<any>(UrlTest.blockcypher.txpush, { tx: rawtx }).pipe(
    //         catchError(this.handleError('sendTx', []))
    //     )
    // }

    /**
     * Blockcypher Data API
     */ 
    public decodeTx(rawtx: string): Observable<any> {
        return this.http.post<any>(UrlTest.blockcypher.txdecode, { tx: rawtx }).pipe(
            catchError(this.handleError('sendTx', []))
        )
    }

    /**
     * chain.so api
     * @param rawtx
     */
    public pushTx(rawtx: string, currency: ISom32Account["currency"] = C.ACCOUNT_CURRENCY_BTC): Observable<any> {
        if(currency == C.ACCOUNT_CURRENCY_EOS) {

            // TODO: 
            
        } else if(currency == C.ACCOUNT_CURRENCY_ETH) {
            return this.http.get<any>(
                externals_test.eth.etherscan.txpush
                .replace('{RAWTX}', rawtx)
                .replace('{APIKEY}', C.APP_API_KEY_ETHERSCAN)
            ).pipe(
                tap(
                    res => {
                        this.entrusted = {
                            success : true,
                            txid    : res.result
                        }
                    }
                ),
                catchError(this.handleError('pushTx', []))
            )

        } else {
            return this.http.post<any>(UrlTest.sochain.txpush, { tx_hex: rawtx }).pipe(
                tap(
                    res => {
                        this.entrusted = {
                            success : true,
                            txid    : res.data.txid
                        }
                    }
                ),
                catchError(this.handleError('pushTx', []))
            )
        }
        // return this.http.post<any>(UrlTest.smartbit.txpush, { hex: rawtx }).pipe(
        //     catchError(this.handleError('pushTx', []))
        // )
    }

    /**
     * Bitcoinfees API
     */ 
    public getTxFees(currency: ISom32Account["currency"] = C.ACCOUNT_CURRENCY_BTC): Observable<any> {
        if(currency == C.ACCOUNT_CURRENCY_EOS) {

            // TODO: 
            
        } else if(currency == C.ACCOUNT_CURRENCY_ETH) {
            return this.http.get<any>(
                externals_test.eth.etherscan.gas.price
                .replace('{APIKEY}', C.APP_API_KEY_ETHERSCAN)
            ).pipe(
                catchError(this.handleError('getTxFees', []))
            )
        } else {
            return this.http.get<any>(Url.bitcoinfees).pipe(
                catchError(this.handleError('getTxFees', []))
            )
        }
    }

    public getTxFeetEstimated(to: string, amount: number, txprice: number): Observable<any> {
        return this.http.get(
            externals_test.eth.etherscan.gas.estimate
            .replace('{TO}', to)
            .replace('{VALUE}', String(amount))
            .replace('{GASPRICE}', String(txprice))
            .replace('{APIKEY}', C.APP_API_KEY_ETHERSCAN)
        ).pipe(
            catchError(this.handleError('geTxFeetEstimated', []))
        )
    }
    
    public getNonce(address: string): Observable<any> {
        return this.http.get(
            externals_test.eth.etherscan.nonce
            .replace('{ADDRESS}', address)
            .replace('{APIKEY}', C.APP_API_KEY_ETHERSCAN)
        ).pipe(
            catchError(this.handleError('geTxFeetEstimated', []))
        )
    }

    public get listItems(): any {
        return this._listItems;
    }

    /**
     * Som32 PSBT Service
     */ 
    public getPsbtList(
        address: string, 
        target: string,
        by: string = 'ALL'
    ): Observable<any> {
        return this.http.get<any>(
            Som32Psbt.list
            .replace('{ADDRESS}', address)
            .replace('{TARGET}', target)
            .replace('{BY}', by)
        )
    }

    // address: string, id: number
    public getPsbtComplete(data: any): Observable<any> {
        return this.http.post<any>(Som32Psbt.getcomplete, data).pipe(
            tap(res => { }),
            catchError(this.handleError('cnacelPsbt', []))
        )
    }

    public cancelPsbt(data: any): Observable<IBitcoinfeesTypes> {
        return this.http.post<any>(Som32Psbt.cancel, data).pipe(
            tap(
                res => {
                    
                    // this.entrusted = {
                    //     success : true,
                    //     txid    : res.data.txid
                    // }
                }
            ),
            catchError(this.handleError('cnacelPsbt', []))
        )
    }

    public createPsbt(data: any): Observable<IBitcoinfeesTypes> {
        return this.http.put<any>(Som32Psbt.create, data).pipe(
            tap(
                res => {
                    
                    // this.entrusted = {
                    //     success : true,
                    //     txid    : res.data.txid
                    // }
                }
            ),
            catchError(this.handleError('createPsbt', []))
        )
    }

    public signPsbt(data: any): Observable<IBitcoinfeesTypes> {
        return this.http.put<any>(Som32Psbt.sign, data).pipe(
            tap(
                res => {
                    
                    // this.entrusted = {
                    //     success : true,
                    //     txid    : res.data.txid
                    // }
                }
            ),
            catchError(this.handleError('createPsbt', []))
        )
    }

    public pushPsbt(data: any): Observable<any> {
        return this.http.post<any>(Som32Psbt.push, data).pipe(
            tap(
                res => {
                    
                    // this.entrusted = {
                    //     success : true,
                    //     txid    : res.data.txid
                    // }
                }
            ),
            catchError(this.handleError('createPsbt', []))
        )
    }
}

class AddressValidator {

    constructor() { }

    public validate(): boolean {
        return true
    }

    public identify(address: string): {
        network : string;
        type    : string;
    } {
        let prefix = address.slice(0, 1)
        let network = prefix=='m'||prefix=='n'||prefix=='2'||prefix=='t'?'testnet':''
        let type = prefix=='m'||prefix=='n'?'P2PKH':prefix=='2'?'P2SH':''

        if(prefix=='t') {
            if(Address.fromBech32(address).data.byteLength==20) type = 'P2WPKH';
            else type = 'P2WSH'
        }

        return {
            network : network,
            type    : type
        }
    }
}