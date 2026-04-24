import { observable, runInAction } from 'mobx'
import * as nodeDiskInfo from 'node-disk-info'
import type Drive from 'node-disk-info/dist/classes/drive'
import { IconProps } from '@tabler/icons-react'
import { IconDatabase, IconFolder, IconBrandWindows } from '@tabler/icons-react'

import { ALL_DIRS, isMac, isWin } from '$src/utils/platform'
import { WSL_PREFIX, WslDistribution, getWSLDistributions } from '$src/utils/wsl'

const CHECK_FOR_DRIVES_DELAY = 5000
const CHECK_FOR_WSL_DELAY = 30000

export interface Favorite {
    label: string
    path: string
    icon?: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>
    isReadOnly: boolean
    isRemovable?: boolean
    isVirtual?: boolean
    hasINotify?: boolean
}

export const filterSystemDrive = ({ filesystem, mounted }: Drive) => {
    // exclude system volumes from the list of devices we want to show
    if (filesystem.match(/(tmpfs|devfs|map|efivarfs)/) || mounted.match(/^\/(System|boot)/)) {
        return false
    } else {
        return true
    }
}

export class FavoritesState {
    shortcuts = observable<Favorite>([])
    places = observable<Favorite>([])
    distributions = observable<Favorite>([])
    previousPlaces: Drive[] = []

    buildShortcuts(): void {
        this.shortcuts.replace(
            Object.entries(ALL_DIRS).map((dir: string[]) => ({
                label: dir[0],
                path: dir[1],
                icon: IconDatabase,
                isReadOnly: false,
            })),
        )
    }

    async getDrivesList(): Promise<Drive[]> {
        const drives = await nodeDiskInfo.getDiskInfo()
        return drives.filter(filterSystemDrive)
    }

    buildDistributions(distribs: WslDistribution[]): void {
        runInAction(() =>
            this.distributions.replace(
                distribs.map(({ name, hasINotify }) => ({
                    label: name,
                    path: `${WSL_PREFIX}${name}\\`,
                    icon: IconBrandWindows,
                    hasINotify,
                    isReadOnly: true,
                })),
            ),
        )

        console.log('build WSL distributions', this.distributions)
    }

    buildPlaces(drives: Drive[]): void {
        const filteredList: Favorite[] = drives.reduce((elements, { mounted }) => {
            // mac stuff
            const label = mounted.replace('/Volumes/', '').replace(/^\/$/, isMac ? 'Macintosh HD' : '/')
            const favorite: Favorite = {
                label,
                path: mounted,
                icon: IconFolder,
                isReadOnly: false,
            }
            elements.push(favorite)

            return elements
        }, [])

        runInAction(() => this.places.replace(filteredList))
    }

    launchTimeout(immediate = false, callback: () => void, timeout: number): void {
        if (immediate) {
            callback()
        } else {
            setTimeout(callback, timeout)
        }
    }

    buildDrivesList(): void {
        this.buildShortcuts()
        this.launchTimeout(true, this.checkForNewDrives, CHECK_FOR_DRIVES_DELAY)
        // Only check for WSL distributions on Windows
        isWin && this.launchTimeout(true, this.checkForNewDistributions, CHECK_FOR_WSL_DELAY)
    }

    checkForNewDistributions = async (): Promise<void> => {
        const distribs = await getWSLDistributions()
        if (distribs.length !== this.distributions.length) {
            this.buildDistributions(distribs)
        }

        // restart timeout in any case
        this.launchTimeout(false, this.checkForNewDistributions, CHECK_FOR_WSL_DELAY)
    }

    /**
     * checks if new drives: if new drives are found, re-generate the places
     */
    checkForNewDrives = async (): Promise<void> => {
        const usableDrives = await this.getDrivesList()
        if (this.hasDriveListChanged(usableDrives)) {
            this.previousPlaces = usableDrives
            this.buildPlaces(usableDrives)
        }
        // restart timeout in any case
        this.launchTimeout(false, this.checkForNewDrives, CHECK_FOR_DRIVES_DELAY)
    }

    hasDriveListChanged(newList: Drive[]): boolean {
        if (newList.length !== this.previousPlaces.length) {
            return true
        } else {
            const newString = newList
                .filter(filterSystemDrive)
                .reduce((str: string, { mounted }: Drive) => `${str}${mounted}`, '')

            const oldString = this.previousPlaces
                .filter(filterSystemDrive)
                .reduce((str: string, { mounted }: Drive) => `${str}${mounted}`, '')

            return oldString !== newString
        }
    }

    constructor() {
        this.buildDrivesList()
    }
}
