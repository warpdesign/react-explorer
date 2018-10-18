import * as React from "react";
import { observer, inject, Provider } from 'mobx-react';
import { PathInput } from './PathInput';
import { FileList } from './FileList';
import { AppState } from "../state/appState";
import { Directory } from "../services/Fs";

interface SideViewProps {
    type: string;
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
    constructor(props: {type: string}) {
        super(props);

        const { appState } = this.injected;
        const cache: Directory = appState.addCache();

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
                    <PathInput type={this.props.type} />
                    <FileList type={this.props.type} />
                </div>
            </Provider>
        );
    }
}