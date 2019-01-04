import * as React from "react";
import { Menu, MenuItem, MenuDivider } from "@blueprintjs/core";
import { observer, inject } from "mobx-react";
import { AppState } from "../state/appState";
import { File } from "../services/Fs";
import { withNamespaces, WithNamespaces } from 'react-i18next';

interface IFileMenuProps extends WithNamespaces {
    onFileAction: (action: string) => any;
    selectedItems: File[];
};

interface InjectedProps extends IFileMenuProps{
    appState: AppState;
}

@inject('appState')
@observer
export class FileMenuClass extends React.Component<IFileMenuProps>{
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
        const { selectedItems, t } = this.props;

        return (
        <React.Fragment>
                <Menu>
                <MenuItem text={t('COMMON.MAKEDIR')} icon="folder-new" onClick={this.onNewfolder}/>
                <MenuDivider />
                <MenuItem text={t('FILEMENU.PASTE', { count: clipboardLength })} icon="duplicate" onClick={this.onPaste} disabled={!clipboardLength} />
                <MenuDivider />
                <MenuItem text={t('FILEMENU.DELETE', { count: selectedItems.length })} onClick={this.onDelete} intent={selectedItems.length && "danger" || "none"} icon="delete" disabled={!selectedItems.length} />
            </Menu>
        </React.Fragment>
        )
    }
}

const FileMenu = withNamespaces()(FileMenuClass);

export { FileMenu };
