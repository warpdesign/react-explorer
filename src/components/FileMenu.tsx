import * as React from "react";
import { Menu, MenuItem, MenuDivider } from "@blueprintjs/core";
import { observer, inject } from "mobx-react";
import { AppState } from "../state/appState";
import { File } from "../services/Fs";

interface IFileMenuProps {
    onFileAction: (action: string) => any;
    selectedItems: File[];
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

    private onDelete = () => {
        this.props.onFileAction('delete');
    }

    // shouldComponentUpdate() {
    //     console.time('FileMenu Render');
    //     return true;
    // }

    // componentDidUpdate() {
    //     console.timeEnd('FileMenu Render');
    // }

    public render() {
        const { appState } = this.injected;
        const clipboardLength = appState.clipboard.files.length;
        const { selectedItems } = this.props;

        return (
        <React.Fragment>
            <Menu>
                <MenuItem text="New Folder" icon="folder-new" onClick={this.onNewfolder}/>
                <MenuDivider />
                <MenuItem text={`Paste ${clipboardLength} item(s)`} icon="duplicate" onClick={this.onPaste} disabled={!clipboardLength} />
                <MenuItem text={`Delete ${selectedItems.length} item(s)`} onClick={this.onDelete} intent={selectedItems.length && "danger" || "none"} icon="delete" disabled={!selectedItems.length} />
            </Menu>
        </React.Fragment>
        )
    }
}
