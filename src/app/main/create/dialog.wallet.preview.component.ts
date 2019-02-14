import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as html2canvas from 'html2canvas';
import * as jsPDF from 'jspdf'

import { ISOM32Wallet } from '@som32/interfaces'


@Component({
    selector     : 'dialog-wallet-preview',
    templateUrl  : './dialog.wallet.preview.component.html',
    styleUrls    : ['./dialog.wallet.preview.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class DialogWalletPreviewComponent implements OnInit, OnDestroy
{
    invoice: any;

    // Private
    private _unsubscribeAll: Subject<any>;

    public some32Wallet : ISOM32Wallet;
    public mnemonic     : string;
    public privateKey   : string;
    public paymentPubKey: string;
    public changePubKey : string;


    constructor(
        public matDialogRef: MatDialogRef<DialogWalletPreviewComponent>,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.some32Wallet = this._data;
        this.mnemonic = this._data.wallet.mnemonic;
        this.privateKey = this._data.wallet.privateKey;
        this.paymentPubKey = this._data.wallet.paymentPubKey;
        this.changePubKey = this._data.wallet.changePubKey;
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    public get walletToString(): string {
        return JSON.stringify(this.some32Wallet);
    }

    public exportToPDF(): void {
        html2canvas(
            document.getElementById('canvas'), 
            {
                letterRendering: 1,
                allowTaint : true, 
            }
        ).then(
            function(canvas) {
                // var a = document.createElement("a");
                // a.href = canvas.toDataURL("image/png");
                // a.download = "sample.png";
                // a.click();

                var imgData = canvas.toDataURL('image/png');              
                var doc = new jsPDF("p", "mm", "a4");
                // doc.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                doc.addImage(imgData, 'PNG', 0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight());
                doc.save('sample-file.pdf');
            }

            // html2canvas(document.getElementById('canvas')).then(function(canvas) {
            //     var imgData = canvas.toDataURL('image/png');              
            //     var doc = new jsPDF('p', 'mm');
            //     doc.addImage(imgData, 'PNG', 10, 10);
            //     doc.save('sample-file.pdf');
            // }
        );
    }
}
