import {
    Component,
    Injectable
} from '@angular/core';
import { Router } from '@angular/router';
import { BrowserWindow } from 'electron';
import { HttpClient } from '@angular/common/http';
import { CryptoService } from 'jslib/abstractions/crypto.service';
import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { MessagingService } from 'jslib/abstractions/messaging.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { StateService } from 'jslib/abstractions/state.service';
import { StorageService } from 'jslib/abstractions/storage.service';
import { UserService } from 'jslib/abstractions/user.service';
import { VaultTimeoutService } from 'jslib/abstractions/vaultTimeout.service';

import { LockComponent as BaseLockComponent } from 'jslib/angular/components/lock.component';

@Component({
    selector: 'app-lock',
    templateUrl: 'lock.component.html',
})
@Injectable({
    providedIn: 'root',
})
export class LockComponent extends BaseLockComponent {
    isretyet: boolean = false;
    returl: string;
    httpcli: HttpClient;
    electron = require('electron');
    BrowserWindow = this.electron.remote.BrowserWindow;
    win: BrowserWindow;
    constructor(router: Router, i18nService: I18nService, httpclient: HttpClient, 
        platformUtilsService: PlatformUtilsService, messagingService: MessagingService,
        userService: UserService, cryptoService: CryptoService,
        storageService: StorageService, vaultTimeoutService: VaultTimeoutService,
        environmentService: EnvironmentService, stateService: StateService) {
        super(router, i18nService, platformUtilsService, messagingService, userService, cryptoService,
            storageService, vaultTimeoutService, environmentService, stateService);
        this.httpcli = httpclient;
    }

    async submit() {
        this.isretyet = false;
        this.win = new this.BrowserWindow({ width: 800, height: 600 });
        this.win.loadURL("https://vault.vivokey.com/bwauth/webapi/redirectin?state=unlock&app_type=mobile");
        this.win.once('ready-to-show', () => {
            this.win.show()
        })
        let con = this.win.webContents;
        con.on("will-redirect", (event, url) => {
            this.isRet(url);
            if (this.isretyet) {
                this.onComplete();
            }
        });


    }
    isRet(url: string) {
        let propurl = new URL(url);
        console.log("URL Captured: " + url);
        if (propurl.searchParams.has("code") && propurl.searchParams.get("state") == "unlock_mobile" && propurl.host == "vault.vivokey.com") {
            this.isretyet = true;
            this.returl = url;
        }
        if (propurl.protocol == "vivokey") {
            this.isretyet = true;
            this.returl = url;
        }
    }
    async onComplete() {
        this.win.destroy();
        if (this.isretyet && this.returl != null) {
            let propurl = new URL(this.returl);
            let code = propurl.searchParams.get("code");
            let userinfo = {
                'name': "",
                'email': "",
                'passwd': "",
                'new': ""
            }
            try {
                let infotok = await this.httpcli.get<any>("https://vault.vivokey.com/bwauth/webapi/getauth?code=" + code).toPromise();

                userinfo = {
                    'name': infotok.name,
                    'email': infotok.email,
                    'passwd': infotok.passwd,
                    'new': infotok.new
                };
            } catch (err) {
            }
            super.masterPassword = userinfo.passwd;
            super.submit();
        }
    }
}
