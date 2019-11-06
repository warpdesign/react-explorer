import { IconName } from "@blueprintjs/core";
import { observable, runInAction } from "mobx";
import * as drivelist from "drivelist";
import { IconNames } from "@blueprintjs/icons";
import { ALL_DIRS } from "../utils/platform";

interface Favorite {
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

    buildShortcuts() {
        console.log('building shortcuts', ALL_DIRS, Object.entries(ALL_DIRS));
        this.shortcuts.replace(Object.entries(ALL_DIRS).map(dir => ({
            label: dir[0],
            path: dir[1],
            icon: IconNames.DATABASE
        })));

        console.log('shortcuts', this.shortcuts);
    }

    async buildPlaces() {
        console.log('getting drives');
        const drives = await drivelist.list();
        console.log('got drives', drives);
        const usableDrives = drives.filter((drive:any) => drive.mountpoints && drive.mountpoints.length);
        this.places.replace(usableDrives.map((drive:any) => {
            const mountpoint = drive.mountpoints[0];

            return {
                label: mountpoint.label,
                path: mountpoint.path,
                icon: (drive.isRemovable || drive.isVirtual) ? IconNames.FLOPPY_DISK : IconNames.DATABASE
            } as Favorite;
        }));
        console.log('created drives', this.places);
    }

    async buildDrivesList() {
        this.buildShortcuts();
        this.buildPlaces();
    }

    constructor() {
        this.buildDrivesList();
        // // test
        // setTimeout(() => {
        //     runInAction(() => {
        //         this.places[0].label = "dtc";
        //         console.log('changing nodes !!');
        //     });
        // }, 10000);
        // TODO: add listener for language change + check that places haven't changed every 5 secs
    }
}
