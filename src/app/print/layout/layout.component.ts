import { Component } from '@angular/core';

@Component({
    selector     : 'print-layout',
    templateUrl  : './layout.component.html',
    styleUrls    : ['./layout.component.scss']
})
export class LayoutComponent {
    public isShow: boolean;

    constructor() { 
        this.isShow = true;
    }

    public print(): void {
        this.isShow = false;
        window.print(); 
    }
}
