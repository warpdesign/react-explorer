import * as React from "react";
import * as drivelist from "drivelist";
import { observable } from "mobx";
import { Icon } from "@blueprintjs/core";
import { observer } from "mobx-react";

interface Favorite {
    label: string;
    icon: Icon;
    path?: string;
    isReadOnly?: boolean;
    isRemovable?: boolean;
}

class FavoritesList {
    drives = observable<Favorite>([]);

    async getDriveList() {
        console.log('getting drives');
        const drives = await drivelist.list();
        console.log('got drives', drives);
        const usableDrives = drives.filter((drive:any) => drive.mountpoints && drive.mountpoints.length);
        this.drives.replace(usableDrives.map((drive:any) => {
            const mountpoint = drive.mountpoints[0];

            return {
                label: mountpoint.label,
                path: mountpoint.path
            } as Favorite;
        }));
        console.log('created drives', this.drives);
    }

    constructor() {
        this.getDriveList();
    }
}

const favorites = new FavoritesList();

@observer
export class LeftPanel extends React.Component {
    constructor(props:any) {
        super(props);
    }

    render() {
        const favs = favorites.drives;
        return <div style={{
            float:"left",
            width:"200px",
            border:"1px dotted gray"
        }}>
            {favs.map(favorite => <div key={favorite.path}>{favorite.label}</div>)}
        </div>;
    }
}
