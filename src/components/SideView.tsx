import * as React from "react";
import { observer, inject, Provider } from 'mobx-react';
import { Toolbar } from './Toolbar';
import { FileList } from './FileList';
import { AppState } from "../state/appState";
import { Directory } from "../services/Fs";

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

        console.log('was updateCache');
        cache.cd('.');
        // appState.updateCache(cache, '.');
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    render() {
        return (
            <Provider fileCache={this.state.fileCache}>
                <div className="sideview">
                    <Toolbar />
                    <FileList  />
                </div>
            </Provider>
        );
    }
}