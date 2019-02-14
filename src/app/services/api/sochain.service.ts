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
export class APISochainService {

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

    public getTx(txHash: string): Observable<IBlockcypherTx> {
        return this.http.get<any>(soChainUrl + '/get_tx_outputs/BTCTEST/' + txHash, httpOptions)
            .pipe(
                catchError(this.handleError('getTx', []))
            );
    }
}

