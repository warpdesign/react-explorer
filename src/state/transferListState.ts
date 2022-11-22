import { action, observable, computed, makeObservable, runInAction } from 'mobx'
import { TransferState, TransferOptions } from '$src/state/transferState'

export const REFRESH_DELAY = 600

export class TransferListState {
    /* transfers */
    transfers = observable<TransferState>([])

    // current active transfers
    activeTransfers = observable<TransferState>([])

    constructor() {
        makeObservable(this, {
            totalTransferProgress: computed,
            pendingTransfers: computed,
            addTransfer: action,
        })
    }

    async addTransfer(options: TransferOptions) {
        let isDir = false

        try {
            isDir = await options.dstFs.isDir(options.dstPath)
        } catch (err) {
            isDir = false
        }

        if (!isDir) {
            throw {
                code: 'NODEST',
            }
        }

        console.log('addTransfer', options.files, options.srcFs, options.dstFs, options.dstPath)

        const transfer = new TransferState(options.srcFs, options.dstFs, options.srcPath, options.dstPath)
        runInAction(() => this.transfers.unshift(transfer))
        await transfer.prepare(options.files)

        // CHECKME
        if (this.activeTransfers.length === 1) {
            this.activeTransfers.clear()
        }
        this.activeTransfers.push(transfer)

        return transfer
    }

    removeTransfer(transferId: number): void {
        const transfer = this.transfers.find((transfer) => transfer.id === transferId)
        if (transfer) {
            transfer.cancel()
            this.transfers.remove(transfer)
        }
    }

    getTransfer(transferId: number) {
        return this.transfers.find((transfer) => transfer.id === transferId)
    }

    getRunningTransfers() {
        const time = Date.now()

        return this.transfers.filter(
            ({ startDate, progress, isStarted }) =>
                progress && isStarted && time - startDate.getTime() >= REFRESH_DELAY,
        ).length
    }

    get totalTransferProgress(): number {
        let totalSize = 0
        let totalProgress = 0

        const runningTransfers = this.activeTransfers
        // .filter(transfer => !transfer.status.match(/error|done/));

        for (const transfer of runningTransfers) {
            totalSize += transfer.size
            totalProgress += transfer.progress
        }

        return (totalSize && totalProgress / totalSize) || 0
    }

    get pendingTransfers(): number {
        return this.getRunningTransfers()
    }
}
