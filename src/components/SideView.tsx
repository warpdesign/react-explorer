import * as React from "react";
import { inject, Provider, observer } from 'mobx-react';
import { Toolbar } from './Toolbar';
import { Statusbar } from './Statusbar';
import { FileList } from './FileList';
import { AppState } from "../state/appState";
import { LoginDialog } from "./dialogs/LoginDialog";
import { FileState } from "../state/fileState";
import { Loader } from "./Loader";

interface SideViewProps {
    hide: boolean;
    // active: boolean;
    fileCache: FileState;
    onPaste: () => void;
}

interface InjectedProps extends SideViewProps{
    appState: AppState;
}

// interface SideViewState{
//     fileCache: FileState;
// }

@inject('appState')
@observer
export class SideView extends React.Component<SideViewProps/*, SideViewState*/>{
    static id = 0;
    viewId = 'view_' + SideView.id++;

    private fileListBusy = false;

    constructor(props:SideViewProps) {
        super(props);
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private onValidation = (dir:string):boolean => {
        return true;
    }

    private onClose = () => {
        // login cancelled
        const { fileCache } = this.props;
        // doesn't work: it keeps the previous fs
        fileCache.revertPath();
    }

    onFileRender = () => {
        // console.log('rendering filelist');
        // console.time('rendering filelist');
        this.fileListBusy = true;
    }

    onFileUpdate = () => {
        // console.timeEnd('rendering filelist');
        this.fileListBusy = false;
    }

    renderSideView() {
        const { fileCache } = this.props;
        const active = fileCache.active;

        const activeClass = active && ' active' || '';
        const needLogin = fileCache.status === 'login';
        // Blueprint's Tree (or React ?) seems to take a long time rendering
        // the Tree object (1-2secs is needed for a directory of 700 files)
        // so we make sure to keep the loader while the render is in progress
        const busy = fileCache.status === 'busy' || this.fileListBusy;

        if (!this.props.hide) {
            return (
                <div id={this.viewId} className={`sideview${activeClass}`}>
                    {needLogin && <LoginDialog isOpen={needLogin} onValidation={this.onValidation} onClose={this.onClose} />}
                    <Toolbar active={active && !busy} onPaste={this.props.onPaste} />
                    <FileList onRender={this.onFileRender} onUpdate={this.onFileUpdate} />
                    <Statusbar />
                    <Loader active={busy}></Loader>
                </div>
            );
        } else {
            return (<React.Fragment></React.Fragment>);
        }
    }

    shouldComponentUpdate() {
        console.time('SideView Render');
        return true;
    }

    componentDidUpdate() {
        console.timeEnd('SideView Render');
    }

    render() {

        const { fileCache } = this.props;

        return (
            <Provider fileCache={fileCache}>
                {this.renderSideView()}
            </Provider>
        );
    }
}
