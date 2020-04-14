import {
    Component,
    ComponentFactoryResolver,
    ViewChild,
    ViewContainerRef,
    Injectable
} from '@angular/core';
import { Router } from '@angular/router';
import { BrowserWindow } from 'electron';
import { EnvironmentComponent } from './environment.component';
import { HttpClient} from '@angular/common/http';
import { AuthService } from 'jslib/abstractions/auth.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { StateService } from 'jslib/abstractions/state.service';
import { StorageService } from 'jslib/abstractions/storage.service';
import { SyncService } from 'jslib/abstractions/sync.service';

import { LoginComponent as BaseLoginComponent } from 'jslib/angular/components/login.component';
import { ModalComponent } from 'jslib/angular/components/modal.component';

@Component({
    selector: 'app-login',
    templateUrl: 'login.component.html',
})
@Injectable({
    providedIn: 'root',
})
export class LoginComponent extends BaseLoginComponent {
    @ViewChild('environment', { read: ViewContainerRef }) environmentModal: ViewContainerRef;

    showingModal = false;
    isretyet: boolean = false;
    returl: string;
    httpcli: HttpClient;
    electron = require('electron');
    BrowserWindow = this.electron.remote.BrowserWindow;
    win: BrowserWindow;

    constructor(authService: AuthService, router: Router,
        i18nService: I18nService, syncService: SyncService, httpclient: HttpClient,
        private componentFactoryResolver: ComponentFactoryResolver, storageService: StorageService,
        platformUtilsService: PlatformUtilsService, stateService: StateService) {
        
        super(authService, router, platformUtilsService, i18nService, storageService, stateService);
        this.httpcli = httpclient;

        super.onSuccessfulLogin = () => {
            return syncService.fullSync(true);
        };
    }
    async submit() {
        this.isretyet = false;
        this.win = new this.BrowserWindow({ width: 800, height: 600 });
        this.win.loadURL("https://vault.vivokey.com/bwauth/webapi/redirectin?state=login&app_type=mobile");
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
        if (propurl.searchParams.has("code") && propurl.searchParams.has("state")) {
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
                'name':"",
                'email':"",
                'passwd':"",
                'new':""
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
            this.email = userinfo.email;
            this.masterPassword = userinfo.passwd;
            super.submit();
        }
    }
    settings() {
        const factory = this.componentFactoryResolver.resolveComponentFactory(ModalComponent);
        const modal = this.environmentModal.createComponent(factory).instance;
        modal.onShown.subscribe(() => {
            this.showingModal = true;
        });
        modal.onClosed.subscribe(() => {
            this.showingModal = false;
            modal.onShown.unsubscribe();
            modal.onClosed.unsubscribe();
        });

        const childComponent = modal.show<EnvironmentComponent>(EnvironmentComponent,
            this.environmentModal);
        childComponent.onSaved.subscribe(() => {
            modal.close();
        });
    }


}
