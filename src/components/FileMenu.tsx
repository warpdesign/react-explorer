import * as React from "react";
import { Menu, MenuItem, MenuDivider } from "@blueprintjs/core";

export class FileMenu extends React.Component{
    constructor (props: any){
        super(props);
    }

    render() {
        return (
        <Menu>
            <MenuItem text="New Folder" icon="folder-new" />
            <MenuDivider />
            <MenuItem text="Paste 3 items" icon="duplicate" disabled />
            <MenuItem text="Delete 3 items" intent="danger" icon="delete" />            
        </Menu>
        )
    }
}
