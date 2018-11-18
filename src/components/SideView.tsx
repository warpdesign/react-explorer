import * as React from "react";
import { inject, Provider, observer } from 'mobx-react';
import { Toolbar } from './Toolbar';
import { Statusbar } from './Statusbar';
import { FileList } from './FileList';
import { AppState } from "../state/appState";
import { LoginDialog } from "./LoginDialog";
import { FileState } from "../state/fileState";

interface SideViewProps {
    hide: boolean;
}

interface InjectedProps extends SideViewProps{
    appState: AppState;
}

interface SideViewState{
    fileCache: FileState;
    active: boolean;
}

@inject('appState')
@observer
export class SideView extends React.Component<SideViewProps, SideViewState>{
    constructor(props:SideViewProps) {
        super(props);



        const { appState } = this.injected;
        const cache: FileState = appState.addCache();

        this.state = {
            fileCache: cache,
            active: false
        };

        cache.cd('.');
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private onValidation = (dir:string):boolean => {
        return true;
    }

    private onClose = () => {
        // login cancelled
        const { fileCache } = this.state;
        // doesn't work: it keeps the previous fs
        fileCache.revertPath();
    }

    private handleFocus = () => {
        console.log('focus');
    }

    renderSideView() {
        const { fileCache, active } = this.state;
        const activeClass = active && ' active' || '';
        const needLogin = fileCache.status === 'login';

        if (!this.props.hide) {
            return (<div onFocus={this.handleFocus} className={`sideview${activeClass}`}>
                {needLogin && <LoginDialog isOpen={needLogin} onValidation={this.onValidation} onClose={this.onClose} />}
                <Toolbar />
                <FileList />
                <Statusbar />
            </div>);
        } else {
            return (<div />);
        }
    }

    render() {

        const { fileCache } = this.state;

        return (
            <Provider fileCache={fileCache}>
                {this.renderSideView()}
            </Provider>
        );
    }
}