import * as React from "react";
import { inject, Provider, observer } from 'mobx-react';
import { Toolbar } from './Toolbar';
import { Statusbar } from './Statusbar';
import { FileList } from './FileList';
import { AppState } from "../state/appState";
import { LoginDialog } from "./dialogs/LoginDialog";
import { FileState } from "../state/fileState";
import { Loader } from "./Loader";
import { FileTable } from "./FileTable";

interface SideViewProps {
    hide: boolean;
    // active: boolean;
    fileCache: FileState;
    onPaste: () => void;
}

interface InjectedProps extends SideViewProps{
    appState: AppState;
}

@inject('appState')
@observer
export class SideView extends React.Component<SideViewProps>{
    static id = 0;
    viewId = 'view_' + SideView.id++;

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

    renderSideView() {
        const { fileCache } = this.props;
        const active = fileCache.active;

        let activeClass = active && ' active' || '';

        const needLogin = fileCache.status === 'login';
        const busy = fileCache.status === 'busy';

        if (this.props.hide) {
            activeClass += ' hidden';
        }

        return (
            <div id={this.viewId} className={`sideview${activeClass}`}>
                {needLogin && <LoginDialog isOpen={needLogin} onValidation={this.onValidation} onClose={this.onClose} />}
                <Toolbar active={active && !busy} onPaste={this.props.onPaste} />
                <FileTable hide={this.props.hide}/>
                <Statusbar />
                <Loader active={busy}></Loader>
            </div>
        );
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
