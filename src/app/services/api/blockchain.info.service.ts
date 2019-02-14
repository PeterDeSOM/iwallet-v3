import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { catchError, tap, map } from 'rxjs/operators';

import * as JQ from 'json-query';

import { IBlockchainInfoAddressTxs } from '@som32/interfaces'

const httpOptions = {
    headers: new HttpHeaders({'Content-Type': 'application/json'})
};

const Url = {
    blockchainInfo  : "https://blockchain.info",
    blockcypher     : "https://api.blockcypher.com/v1/btc/main",
    soChain         : "https://chain.so/api/v2",
}
const UrlTest = {
    blockchainInfo  : "https://testnet.blockchain.info",
    blockcypher     : "https://api.blockcypher.com/v1/btc/test3",
    soChain         : "https://chain.so/api/v2",
}

@Injectable({
    providedIn: 'root',
})
export class ApiService {

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

    /**
     * Blockchain Data API
     */ 
    public getTxs(address: string): Observable<IBlockchainInfoAddressTxs> {
        return this.http.get<any>(UrlTest.blockchainInfo + '/rawaddr/' + address + '?cors=true', httpOptions)
            .pipe(
                catchError(this.handleError('getAddressTxs', []))
            );
    }
}

