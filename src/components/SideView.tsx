import * as React from "react";
import { observer, inject } from 'mobx-react';
import { PathInput } from './PathInput';
import { FileList } from './FileList';
import { AppState } from '../state/appState';

@observer
export class SideView extends React.Component<{ type:string }>{
    render() {
        return (
            <div>
                <PathInput type={this.props.type} />
                <FileList type={this.props.type} />
            </div>
        );
    }
}