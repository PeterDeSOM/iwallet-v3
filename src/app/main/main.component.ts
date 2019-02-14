import { Component } from '@angular/core';
import { FuseConfigService } from '@fuse/services/config.service';

@Component({
    selector   : 'main',
    templateUrl: './main.component.html',
    styleUrls  : ['./main.component.scss']
})
export class MainComponent {
    /**
     * Constructor
     *
     * @param {FuseConfigService} _fuseConfigService
     */
    constructor(
        private _fuseConfigService: FuseConfigService
    )
    {
        // Configure the layout
        this._fuseConfigService.config = {
            layout: {
                navbar   : {
                    hidden: true
                },
                toolbar  : {
                    hidden: true
                },
                footer   : {
                    hidden: true
                },
                sidepanel: {
                    hidden: true
                }
            }
        };
    }
}
    