import * as React from "react";
import { inject, Provider, observer } from 'mobx-react';
import { Toolbar } from './Toolbar';
import { Statusbar } from './Statusbar';
import { FileList } from './FileList';
import { AppState } from "../state/appState";
import { Directory } from "../services/Fs";
import { LoginDialog } from "./LoginDialog";

interface SideViewProps {
}

interface InjectedProps extends SideViewProps{
    appState: AppState;
}

interface SideViewState{
    fileCache: Directory;
}

@inject('appState')
@observer
export class SideView extends React.Component<SideViewProps, SideViewState>{
    constructor(props:{}) {
        super(props);

        const { appState } = this.injected;
        const cache: Directory = appState.addCache();

        this.state = {
            fileCache: cache
        };

        cache.cd('.');
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private onValidation = (dir:string):boolean => {
        return true;
    }

    private onClose = (username: string, password: string) => {
        // TODO: call login
        console.log('need to login', username, password);
    }

    render() {
        const { fileCache } = this.state;
        const needLogin = fileCache.status === 'login';

        return (
            <Provider fileCache={fileCache}>
                <div className="sideview">
                    {needLogin && <LoginDialog isOpen={needLogin} onValidation={this.onValidation} onClose={this.onClose} />}
                    <Toolbar />
                    <FileList />
                    <Statusbar />
                </div>
            </Provider>
        );
    }
}