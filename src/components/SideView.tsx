import * as React from "react";
import { observer, inject } from 'mobx-react';
import { PathInput } from './PathInput';
import { FileList } from './FileList';
import { AppState } from '../state/appState';

@inject('appState')
@observer
export class SideView extends React.Component<{ type:string }>{
    pathChange() {
        debugger;
    }

    render() {
        return (
            <div>
                {/* <PathInput fileCache={this.props.fileCache} type={this.props.type} onPathChange={this.pathChange} /> */}
                <FileList type={this.props.type} />
            </div>
        );
    }
}