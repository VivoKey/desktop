import { powerMonitor } from 'electron';

import { ConstantsService } from 'jslib/services/constants.service';

import { isSnapStore } from 'jslib/electron/utils';

import { Main } from '../main';

// tslint:disable-next-line
const desktopIdle = require('desktop-idle');
const IdleLockSeconds = 5 * 60; // 5 minutes
const IdleCheckInterval = 30 * 1000; // 30 seconds

export class PowerMonitorMain {
    private idle: boolean = false;

    constructor(private main: Main) { }

    init() {
        // ref: https://github.com/electron/electron/issues/13767
        if (!isSnapStore()) {
            // System sleep
            powerMonitor.on('suspend', async () => {
                const options = await this.getVaultTimeoutOptions();
                if (options[0] === -3) {
                    options[1] === 'lock' ? this.main.messagingService.send('lockVault') :
                        this.main.messagingService.send('logout', { expired: false });
                }
            });
        }

        if (process.platform !== 'linux') {
            // System locked
            powerMonitor.on('lock-screen', async () => {
                const options = await this.getVaultTimeoutOptions();
                if (options[0] === -2) {
                    options[1] === 'lock' ? this.main.messagingService.send('lockVault') :
                        this.main.messagingService.send('logout', { expired: false });
                }
            });
        }

        // System idle
        global.setInterval(async () => {
            const idleSeconds: number = desktopIdle.getIdleTime();
            const idle = idleSeconds >= IdleLockSeconds;
            if (idle) {
                if (this.idle) {
                    return;
                }

                const options = await this.getVaultTimeoutOptions();
                if (options[0] === -4) {
                    options[1] === 'lock' ? this.main.messagingService.send('lockVault') :
                        this.main.messagingService.send('logout', { expired: false });
                }
            }

            this.idle = idle;
        }, IdleCheckInterval);
    }

    private async getVaultTimeoutOptions(): Promise<[number, string]> {
        const timeout = await this.main.storageService.get<number>(ConstantsService.vaultTimeoutKey);
        const action = await this.main.storageService.get<string>(ConstantsService.vaultTimeoutActionKey);
        return [timeout, action];
    }
}
