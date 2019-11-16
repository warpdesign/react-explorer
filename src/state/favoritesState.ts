import { IconName } from "@blueprintjs/core";
import { observable } from "mobx";
import * as drivelist from "drivelist";
import { IconNames } from "@blueprintjs/icons";
import { ALL_DIRS } from "../utils/platform";

const CHECK_FOR_DRIVES_DELAY = 5000;

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
    previousPlaces:drivelist.Drive[] = [];

    buildShortcuts() {
        this.shortcuts.replace(Object.entries(ALL_DIRS).map(dir => ({
            label: dir[0],
            path: dir[1],
            icon: IconNames.DATABASE
        })));
    }

    async getDrivesList() {
        const drives = await drivelist.list();
        return drives.filter((drive:drivelist.Drive) => drive.mountpoints && drive.mountpoints.length);
    }

    async buildPlaces(drives:drivelist.Drive[]) {
        this.places.replace(drives.map((drive:drivelist.Drive) => {
            const mountpoint = drive.mountpoints[0];

            return {
                // Some mountpoints may not have a label (eg. win: c:\)
                label: mountpoint.label || mountpoint.path,
                path: mountpoint.path,
                icon: (drive.isRemovable || drive.isVirtual) ? IconNames.FLOPPY_DISK : IconNames.DATABASE
            } as Favorite;
        }));
    }

    launchTimeout(immediate = false) {
        if (immediate) {
            this.checkForNewDrives();
        } else {
            setTimeout(() => this.checkForNewDrives(), CHECK_FOR_DRIVES_DELAY);
        }
    }

    async buildDrivesList() {
        this.buildShortcuts();
        this.launchTimeout(true);
    }

    /**
     * checks if new drives: if new drives are found, re-generate the places
     */
    async checkForNewDrives() {
        const usableDrives = await this.getDrivesList();
        if (this.hasDriveListChanged(usableDrives)) {
            this.previousPlaces = usableDrives;
            this.buildPlaces(usableDrives);
        }

        // restart timeout in any case
        this.launchTimeout();
    }

    hasDriveListChanged(newList:drivelist.Drive[]):boolean {
        if (newList.length !== this.previousPlaces.length) {
            return true;
        } else {
            const newString = newList
                                .filter((drive:drivelist.Drive) => drive.mountpoints && drive.mountpoints.length)
                                .reduce((str:string, drive:drivelist.Drive) => str + drive.mountpoints[0].path, '');

            const oldString = this.previousPlaces
            .filter((drive:drivelist.Drive) => drive.mountpoints && drive.mountpoints.length)
            .reduce((str:string, drive:drivelist.Drive) => str + drive.mountpoints[0].path, '');

            return oldString !== newString;
        }
    }

    constructor() {
        this.buildDrivesList();
    }
}
