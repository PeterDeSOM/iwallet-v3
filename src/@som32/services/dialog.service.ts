import { Injectable } from '@angular/core'
import { MatDialog } from '@angular/material'
import { Observable } from 'rxjs';
import { ISom32Alert, ISom32Extenal } from '@som32/interfaces'
import { DialogAlertComponent, DialogPassphraseComponent, DialogQRCodeScannerComponent } from '@som32/components'


@Injectable({
    providedIn: 'root'
})
export class DialogQRCodeScannerService {

    constructor(        
        private _matDialog: MatDialog,
    ) {}

    public pop(): Observable<any> {
        return this._matDialog.open(DialogQRCodeScannerComponent, {
            panelClass  : 'dialog-qrcode-scanner',
        }).afterClosed()
    }
}

@Injectable({
    providedIn: 'root'
})
export class DialogPassphraseService {

    constructor(        
        private _matDialog: MatDialog,
    ) {}

    public pop(data: { title: string, msg: string, wallet: ISom32Extenal }, callback?: Function) {

        // config = {
        //     disableClose: false,
        //     panelClass: 'custom-overlay-pane-class',
        //     hasBackdrop: true,
        //     backdropClass: '',
        //     width: '',
        //     height: '',
        //     minWidth: '',
        //     minHeight: '',
        //     maxWidth: defaultDialogConfig.maxWidth,
        //     maxHeight: '',
        //     position: {
        //     top: '',
        //     bottom: '',
        //     left: '',
        //     right: ''
        //     },
        //     data: {
        //     message: 'Jazzy jazz jazz'
        //     }
        // }

        this._matDialog.open(DialogPassphraseComponent, {
            panelClass  : 'dialog-passphrase',
            data        : data
        }).afterClosed().subscribe(res => {
            if(!!!res || !!!res.message || !!!res.data) callback(false, '')
            else if(res.message == 'Confirmed' && res.data.verified === true) callback(true, res.data.password)
            else callback(false, '')
        })
    }

    public popn(data: { title: string, msg: string, wallet: ISom32Extenal }): Observable<any> {
        return this._matDialog.open(DialogPassphraseComponent, {
            panelClass  : 'dialog-passphrase',
            data        : data
        }).afterClosed()
    }
}

@Injectable({
    providedIn: 'root'
})
export class Alert {

    constructor(        
        private _matDialog: MatDialog,
    ) {}

    public pop(data: { title: string, desc: string, msg: string, button: ('OK' | 'CANCEL' | 'YES' | 'NO')[] }, callback?: Function) {
        this._matDialog.open(DialogAlertComponent, {
            panelClass  : 'dialog-alert',
            data        : data
        }).afterClosed().subscribe(res => {
            if(!!!callback) return
            if(!!!res || !!!res.message || !!!res.action) callback(data.button.includes('CANCEL') ? 'CANCEL' : 'NO')
            else callback(res.action)
        })
    }

    public popn(data: { title: string, desc: string, msg: string, button: ('OK' | 'CANCEL' | 'YES' | 'NO')[] }): Observable<any> {
        return this._matDialog.open(DialogAlertComponent, {
            panelClass  : 'dialog-alert',
            data        : data
        }).afterClosed()
    }
}

export const AlertNotEnoughBalance: ISom32Alert = {
    title   : 'Not enough balance.',
    msg     : 'Balance is not enough!',
    desc    : '',
    button  : ['OK']
}

export const AlertInvalidPassword: ISom32Alert = {
    title   : 'Failed to verify password',
    msg     : 'Invalid password!',
    desc    : '',
    button  : ['OK']
}

export const AlertInvalidFileCode: ISom32Alert = {
    title   : 'Invalid file or code',
    msg     : 'Not a valid file or code.',
    desc    : '',
    button  : ['OK']
}

export const AlertFileNotFound: ISom32Alert = {
    title   : 'File not found',
    msg     : 'File not found, or invalid.',
    desc    : '',
    button  : ['OK']
}

export const AlertIncorrectMultiSig: ISom32Alert = {
    title   : 'MultiSig not matched',
    msg     : 'MultiSig account is not correct.',
    desc    : 'Selected or imported MultiSig account is not matched with current wallet\'s MultiSig account. Please select or import currect one.',
    button  : ['OK']
}

export const AlerNotMatchedMultiSigWithSingle: ISom32Alert = {
    title   : 'Invalid MultiSig Account.',
    msg     : '',
    desc    : "Current wallet's Single account is not a member (participant) of targeted MultiSig (Shared) account. To manage the MultiSig account concurrently, its Single account must be a signer on the MultiSig transactions.",
    button  : ['OK']
}

export const AlertInvalidPsbtImportFormat: ISom32Alert = {
    title   : 'Invalid PIF',
    msg     : 'Invalid PSBT Import Format.',
    desc    : 'Imported file does not have valid PSBT-Import-Format. You may need to recreate a PSBT and export it with valid PSBT-Import-Format.',
    button  : ['OK']
}

export const AlertInvalidWalletImportFormat: ISom32Alert = {
    title   : 'Invalid Wallet Import Format',
    msg     : 'Invalid Wallet Import Format.',
    desc    : 'Imported file does not have valid Wallet Import Format. You may need to recreate a wallet file with valid Wallet-Import-Format.',
    button  : ['OK']
}


export const AlertNotMatchedNetwork: ISom32Alert = {
    title   : 'Not matched network.',
    msg     : 'The network is not matched.',
    desc    : '',
    button  : ['OK']
}

export const AlertError: Function = (msg: string, err: string): ISom32Alert => {
    return {
        title   : 'Error',
        msg     : msg,
        desc    : err,
        button  : ['OK']
    }
}

