import * as React from "react";
import { observer } from 'mobx-react';
import { PathInput } from './PathInput';
import { FileList } from './FileList';

@observer
export class SideView extends React.Component<{ type:string }>{
    render() {
        return (
            <div className="sideview">
                <PathInput type={this.props.type} />
                <FileList type={this.props.type} />
            </div>
        );
    }
}