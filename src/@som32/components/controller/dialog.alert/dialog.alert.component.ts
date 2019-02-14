import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

@Component({
    selector     : 'dialog-alert',
    templateUrl  : './dialog.alert.component.html',
    styleUrls    : ['./dialog.alert.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class DialogAlertComponent implements OnInit {

    public title: string
    public message: string
    public desc: string
    public button: ('OK' | 'CANCEL' | 'YES' | 'NO')[]

    /**
     * Constructor
     *
     * @param { MatDialogRef<DialogAlertComponent> } matDialogRef
     * @param _data
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) private _data: { 
            title   : string, 
            msg     : string, 
            desc    : string, 
            button  : ('OK' | 'CANCEL' | 'YES' | 'NO')[],
        },
        public matDialogRef: MatDialogRef<DialogAlertComponent>,
    ) {
        this.title = this._data.title
        this.message = this._data.msg
        this.desc = this._data.desc
        this.button = this._data.button
    }

    ngOnInit(): void {
    }

    public action(action: string) {
        this.matDialogRef.close({
            message : action,
            action  : action,
         })
    }
}
