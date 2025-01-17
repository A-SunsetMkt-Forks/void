/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IMetricsService } from '../../../../platform/void/common/metricsService.js';
import { IVoidUpdateService } from '../../../../platform/void/common/voidUpdateService.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';




const notifyYesUpdate = (notifService: INotificationService, msg?: string) => {
	const message = msg || 'This is a very old version of void, please download the latest version! [Void Editor](https://voideditor.com/download-beta)!'
	notifService.notify({
		severity: Severity.Info,
		message: message,
	})
}
const notifyNoUpdate = (notifService: INotificationService) => {
	notifService.notify({
		severity: Severity.Info,
		message: 'Void is up-to-date!',
	})
}
const notifyErrChecking = (notifService: INotificationService) => {
	const message = `Void Error: There was an error checking for updates. If this persists, please get in touch or reinstall Void [here](https://voideditor.com/download-beta)!`
	notifService.notify({
		severity: Severity.Info,
		message: message,
	})
}



// Action
registerAction2(class extends Action2 {
	constructor() {
		super({
			f1: true,
			id: 'void.voidCheckUpdate',
			title: localize2('voidCheckUpdate', 'Void: Check for Updates'),
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const voidUpdateService = accessor.get(IVoidUpdateService)
		const notifService = accessor.get(INotificationService)
		const metricsService = accessor.get(IMetricsService)

		const res = await voidUpdateService.check()
		if (!res) { notifyErrChecking(notifService); metricsService.capture('Void Update: Error', {}) }
		else if (res.hasUpdate) { notifyYesUpdate(notifService, res.message); metricsService.capture('Void Update: Yes', {}) }
		else if (!res.hasUpdate) { notifyNoUpdate(notifService); metricsService.capture('Void Update: No', {}) }
	}
})

// on mount
class VoidUpdateWorkbenchContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.void.voidUpdate'
	constructor(
		@IVoidUpdateService private readonly voidUpdateService: IVoidUpdateService,
		@INotificationService private readonly notifService: INotificationService,
		@IMetricsService private readonly metricsService: IMetricsService,
	) {
		super()

		// on mount
		setTimeout(async () => {
			const res = await this.voidUpdateService.check()

			const notifService = this.notifService
			const metricsService = this.metricsService

			if (!res) { notifyErrChecking(notifService); metricsService.capture('Void Update Startup: Error', {}) }
			else if (res.hasUpdate) { notifyYesUpdate(this.notifService, res.message); metricsService.capture('Void Update Startup: Yes', {}) }
			else if (!res.hasUpdate) { metricsService.capture('Void Update Startup: No', {}) } // display nothing if up to date

		}, 5 * 1000)
	}
}
registerWorkbenchContribution2(VoidUpdateWorkbenchContribution.ID, VoidUpdateWorkbenchContribution, WorkbenchPhase.BlockRestore);
