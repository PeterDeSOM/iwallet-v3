import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector     : 'print-som32-wallet',
    templateUrl  : './som32.wallet.component.html',
    styleUrls    : ['./som32.wallet.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class Som32WalletComponent implements OnInit, OnDestroy
{
    invoice: any;

    // Private
    private _unsubscribeAll: Subject<any>;

    /**
     * Constructor
     *
     * @param {InvoiceService} _invoiceService
     */
    constructor(
    )
    {
        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.invoice = {
            number: 'Som32WalletComponent',
            date: '2018-11-15',
            dueDate: '2018-12-15',
            total: 923589000,
            from: {
                title: 'ViewEncapsulation',
                address: '',
                phone: '',
                email: '',
                website: ''
            },
            client: {
                title: '@angular/core',
                address: '',
                phone: '',
                email: '',
                website: ''
            },
            services: []
        }

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }
}
