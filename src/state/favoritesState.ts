import { IconName } from '@blueprintjs/core';
import { observable } from 'mobx';
import * as drivelist from 'drivelist';
import { IconNames } from '@blueprintjs/icons';
import { ALL_DIRS } from '../utils/platform';
import { WSL_PREFIX, getWSLDistributions } from '../utils/wsl';

const CHECK_FOR_DRIVES_DELAY = 5000;
const CHECK_FOR_WSL_DELAY = 30000;

export interface Favorite {
    label: string;
    path: string;
    icon?: IconName;
    isReadOnly?: boolean;
    isRemovable?: boolean;
    isVirtual?: boolean;
}

export class FavoritesState {
    shortcuts = observable<Favorite>([]);
    places = observable<Favorite>([]);
    distributions = observable<Favorite>([]);
    previousPlaces: drivelist.Drive[] = [];

    buildShortcuts(): void {
        this.shortcuts.replace(
            Object.entries(ALL_DIRS).map((dir: string[]) => ({
                label: dir[0],
                path: dir[1],
                icon: IconNames.DATABASE,
            })),
        );
    }

    async getDrivesList(): Promise<drivelist.Drive[]> {
        const drives = await drivelist.list();
        return drives.filter((drive: drivelist.Drive) => drive.mountpoints && drive.mountpoints.length);
    }

    async getDistributionList(): Promise<string[]> {
        const distribs = await getWSLDistributions();
        return distribs;
    }

    buildDistributions(distribs: string[]): void {
        this.distributions.replace(
            distribs.map((distrib: string) => ({
                label: distrib,
                path: `${WSL_PREFIX}${distrib}\\`,
                icon: IconNames.SOCIAL_MEDIA,
            })),
        );
    }

    buildPlaces(drives: drivelist.Drive[]): void {
        // on macOS (bigSur/+), drivelist (9.2.1) returns
        // the same volume multiple times so we filter
        // out the list based on the volume name
        const lookupTable: string[] = [];
        const filteredList: Favorite[] = drives.reduce((elements, drive) => {
            const mountpoint = drive.mountpoints[0];
            const path = mountpoint.path;
            const label: string = mountpoint.label || path;
            if (lookupTable.indexOf(label) === -1) {
                lookupTable.push(label);
                const favorite: Favorite = {
                    label: label || path,
                    path: path,
                    icon: drive.isRemovable || drive.isVirtual ? IconNames.FLOPPY_DISK : IconNames.DATABASE,
                };
                elements.push(favorite);
            }
            return elements;
        }, []);

        this.places.replace(filteredList);
    }

    launchTimeout(immediate = false, callback: () => void, timeout: number): void {
        if (immediate) {
            callback();
            // this.checkForNewDrives();
        } else {
            setTimeout(() => callback() /*this.checkForNewDrives()*/, timeout);
        }
    }

    async buildDrivesList(): void {
        this.buildShortcuts();
        this.launchTimeout(true, this.checkForNewDrives, CHECK_FOR_DRIVES_DELAY);
        this.launchTimeout(true, this.checkForNewDistributions, CHECK_FOR_WSL_DELAY);
    }

    checkForNewDistributions = async (): Promise<void> => {
        const distribs = await this.getDistributionList();
        if (distribs.length !== this.distributions.length) {
            this.buildDistributions(distribs);
        }

        // restart timeout in any case
        this.launchTimeout(false, this.checkForNewDistributions, CHECK_FOR_WSL_DELAY);
    };

    /**
     * checks if new drives: if new drives are found, re-generate the places
     */
    checkForNewDrives = async (): Promise<void> => {
        const usableDrives = await this.getDrivesList();
        if (this.hasDriveListChanged(usableDrives)) {
            this.previousPlaces = usableDrives;
            this.buildPlaces(usableDrives);
        }

        // restart timeout in any case
        this.launchTimeout(false, this.checkForNewDrives, CHECK_FOR_DRIVES_DELAY);
    };

    hasDriveListChanged(newList: drivelist.Drive[]): boolean {
        if (newList.length !== this.previousPlaces.length) {
            return true;
        } else {
            const newString = newList
                .filter((drive: drivelist.Drive) => drive.mountpoints && drive.mountpoints.length)
                .reduce((str: string, drive: drivelist.Drive) => str + drive.mountpoints[0].path, '');

            const oldString = this.previousPlaces
                .filter((drive: drivelist.Drive) => drive.mountpoints && drive.mountpoints.length)
                .reduce((str: string, drive: drivelist.Drive) => str + drive.mountpoints[0].path, '');

            return oldString !== newString;
        }
    }

    constructor() {
        this.buildDrivesList();
    }
}
