import * as React from "react";
import { PathInput } from './PathInput';
import { FileList } from './FileList';

export class SideView extends React.Component<{}, {}>{
    render() {
        return (
            <React.Fragment>
                <PathInput />
                <FileList />
            </React.Fragment>
        );
    }
}