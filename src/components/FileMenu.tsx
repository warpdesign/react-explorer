import * as React from "react";
import { Menu, MenuItem, MenuDivider } from "@blueprintjs/core";
import { observer, inject } from "mobx-react";
import { AppState } from "../state/appState";

interface IFileMenuProps {
    onFileAction: (action: string) => any;
    selectedItems: number;
};

interface InjectedProps extends IFileMenuProps{
    appState: AppState;
}

@inject('appState')
@observer
export class FileMenu extends React.Component<IFileMenuProps>{
    constructor (props: IFileMenuProps){
        super(props);
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private onNewfolder = () => {
        this.props.onFileAction('makedir');
    }

    private onPaste = () => {
        this.props.onFileAction('paste');
    }

    public render() {
        const { appState } = this.injected;
        const clipboardLength = appState.clipboard.elements.length;
        const { selectedItems } = this.props;

        return (
        <React.Fragment>
            <Menu>
                <MenuItem text="New Folder" icon="folder-new" onClick={this.onNewfolder}/>
                <MenuDivider />
                <MenuItem text={`Paste ${clipboardLength} item(s)`} icon="duplicate" onClick={this.onPaste} disabled={!clipboardLength} />
                <MenuItem text={`Delete ${selectedItems} item(s)`} intent={selectedItems && "danger" || "none"} icon="delete" disabled={!selectedItems} />            
            </Menu>
        </React.Fragment>
        )
    }
}
