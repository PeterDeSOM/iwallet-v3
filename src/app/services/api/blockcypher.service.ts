import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { catchError, tap, map } from 'rxjs/operators';

import * as JQ from 'json-query';

import { IBlockcypherAddressBalance, IBlockcypherAddressTxrefs, IBlockcypherAddressTxs, IBlockcypherTx } from '@som32/interfaces'

const httpOptions = {
    headers: new HttpHeaders({'Content-Type': 'application/json'})
};
// const Url = "https://api.blockcypher.com/v1/btc/main";
const Url = "https://api.blockcypher.com/v1/btc/test3";
const soChainUrl = "https://chain.so/api/v2";

@Injectable({
    providedIn: 'root',
})
export class ApiBlockcypherService {

    private _addressFiltered: any;

    constructor(
        private http: HttpClient
    ) { }

    private handleError<T> (operation = 'operation', result?: T) {
        return (error: any): Observable<T> => {
      
          // TODO: send the error to remote logging infrastructure
          console.error(error); // log to console instead
      
          // Let the app keep running by returning an empty result.
          return of(result as T);
        };
    }

    public set addressFiltered(dataFiltered: any) {
        this._addressFiltered = dataFiltered;
    }

    public get addressFiltered(): any {
        return this._addressFiltered;
    }

    public getAddressBalance(address: string): Observable<IBlockcypherAddressBalance> {
        return this.http.get<any>(Url + '/addrs/' + address + '/balance')
            .pipe(
                catchError(this.handleError('getAddressBalance', []))
            );
    }

    public getAddressTxrefs(address: string): Observable<IBlockcypherAddressTxrefs> {
        return this.http.get<any>(Url + '/addrs/' + address)
            .pipe(
                tap(
                    res => {
                        let filtered = JQ('txrefs:select(tx_hash, tx_output_n, value)', {
                            data: res,
                            locals: {
                                select: function (input) {
                                    if (Array.isArray(input)) {
                                        var keys = [].slice.call(arguments, 1)
                                        return input.map(function (item) {
                                            return Object.keys(item).reduce(function (result, key) {
                                                if (~keys.indexOf(key)) {
                                                    result[key] = item[key]
                                                }
                                                return result
                                            }, {})
                                        })
                                    }
                                }
                            }
                        }).value;
                        // console.log(`filtered result: %s`, JSON.stringify(filtered));

                        this.addressFiltered = filtered;
                    }
                ),
                catchError(this.handleError('getAddressTxrefs', []))
            );
    }

    public getAddressTxs(address: string): Observable<IBlockcypherAddressTxs> {
        return this.http.get<any>(Url + '/addrs/' + address + '/full')
            .pipe(
                catchError(this.handleError('getAddressTxs', []))
            );
    }

    public getTxs(address: string): Observable<any> {

        let txFiltered = [];

        this.getAddressTxrefs(address).subscribe(
            res => {
                let txrefs = res.txrefs;
                this.getAddressTxs(address).subscribe(
                    res => {
                        
                        for (let txref of txrefs) {

                            console.log(`txref info : { "tx_hash": "%s", "tx_output_n": "%s" }`, txref.tx_hash, txref.tx_output_n)
                            let extracted = JQ(`txs[hash=${txref.tx_hash}].outputs[${txref.tx_output_n}]`, { data: res }).value
                            txFiltered.push(extracted)
                        }
                    }
                );
            }
        );

        return of(txFiltered)
    }

    public getTx(txHash: string): Observable<IBlockcypherTx> {
        return this.http.get<any>(soChainUrl + '/get_tx_outputs/BTCTEST/' + txHash)
            .pipe(
                catchError(this.handleError('getTx', []))
            );
    }

    public getTxOutput(txHash: string, outputIdx: number): Observable<IBlockcypherTx> {
        return this.http.get<any>(soChainUrl + '/get_tx_outputs/BTCTEST/' + txHash + '/' + outputIdx)
            .pipe(
                catchError(this.handleError('getTx', []))
            );
    }
}

