import * as React from "react";
import { observer, inject, Provider } from 'mobx-react';
import { Toolbar } from './Toolbar';
import { FileList } from './FileList';
import { AppState } from "../state/appState";
import { Directory, DirectoryType } from "../services/Fs";

interface SideViewProps {
    type: DirectoryType;
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
    constructor(props: {type: DirectoryType}) {
        super(props);

        const { appState } = this.injected;
        const cache: Directory = appState.addCache(props.type as DirectoryType);

        this.state = {
            fileCache: cache
        };

        appState.updateCache(cache, '.');
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