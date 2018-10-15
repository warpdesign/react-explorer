import * as React from "react";
import { observer } from 'mobx-react';
import { PathInput } from './PathInput';
import { FileList } from './FileList';
import { Cache } from '../services/Fs';

@observer export class SideView extends React.Component<{ fileCache:Cache, leftIcon:string }>{
    pathChange() {
        debugger;
    }

    render() {
        return (
            <div>
                <PathInput fileCache={this.props.fileCache} leftIcon={this.props.leftIcon} onPathChange={this.pathChange} />
                <FileList path={this.props.fileCache.path} files={this.props.fileCache.files} />
            </div>
        );
    }
}