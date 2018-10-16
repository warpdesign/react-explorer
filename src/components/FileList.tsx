import * as React from "react";
import { observer, inject } from 'mobx-react';
import { Classes, ITreeNode, Tooltip, Tree } from "@blueprintjs/core";
import { AppState } from "../state/appState";
import { File } from "../services/Fs";
import { shell } from 'electron';
import * as path from 'path';

export interface ITreeExampleState {
    nodes: ITreeNode[];
    path: string
};

const INITIAL_STATE: ITreeNode[] = [
    {
        id: 0,
        icon: "folder-close",
        label: "Folder 0",
    },
    {
        id: 1,
        icon: "folder-close",
        // isExpanded: true,
        label: <Tooltip content="I'm a folder <3">Folder 1</Tooltip>,
        // childNodes: [
        //     {
        //         id: 2,
        //         icon: "document",
        //         label: "Item 0"
        //         // secondaryLabel: (
        //         //     <Tooltip content="An eye!">
        //         //         <Icon icon="eye-open" />
        //         //     </Tooltip>
        //         // ),
        //     },
        //     {
        //         id: 3,
        //         icon: "tag",
        //         label: "Organic meditation gluten-free, sriracha VHS drinking vinegar beard man."
        //     },
        //     {
        //         id: 4,
        //         hasCaret: true,
        //         icon: "folder-close",
        //         label: <Tooltip content="foo">Folder 2</Tooltip>,
        //         childNodes: [
        //             { id: 5, label: "No-Icon Item" },
        //             { id: 6, icon: "tag", label: "Item 1" },
        //             {
        //                 id: 7,
        //                 hasCaret: true,
        //                 icon: "folder-close",
        //                 label: "Folder 3",
        //                 childNodes: [
        //                     { id: 8, icon: "document", label: "Item 0" },
        //                     { id: 9, icon: "tag", label: "Item 1" }
        //                 ]
        //             }
        //         ]
        //     }
        // ]
    },
    { id: 3, icon: "document", label: "Item 1" },
];

interface FileListProps{
    type: string
}

// Here we extend our props in order to keep the injected props private
// and still keep strong typing.
//
// if appState was added to the public props FileListProps,
// it would have to be specified when composing FileList, ie:
// <FileList ... appState={appState}/> and we don't want that
// see:
interface InjectedProps extends FileListProps {
    appState: AppState
}

@inject('appState')
@observer
export class FileList extends React.Component<FileListProps> {
    constructor(props: any) {
        super(props);
    }

    get injected() {
        return this.props as InjectedProps;
    }

    buildNodes(files: Array<any>): ITreeNode<{}>[] {
        return files
            .sort((file1, file2) => {
                if (file2.isDir && !file1.isDir) {
                    return 1;
                } else if (file1.isDir && !file2.isDir) {
                    return -1;
                } else {
                    return file1.fullname.localeCompare(file2.fullname);
                }
            })
            .map((file, i) => {
                const res: ITreeNode = {
                    id: i,
                    icon: file.isDir && "folder-close" || 'document',
                    label: file.fullname,
                    nodeData: file,
                    className: file.fullname !== '..' && file.fullname.startsWith('.') && 'isHidden'
                };
            return res;
        });
    }

    onDoubleClick(node: ITreeNode) {
        const data = node.nodeData as File;
        const { appState } = this.injected;

        if (data.isDir) {
            console.log('need to read dir');
            console.log(path.resolve(path.join(data.dir, data.fullname)));
            appState.readDirectory(path.join(appState.localCache.path, data.fullname), this.props.type);
        } else {
            console.log('oops, need to open file');
            shell.openItem(path.join(data.dir, data.fullname));
        }
    }

    public render() {
        const { appState } = this.injected;
        let files: Array<any>;

        if (this.props.type === 'local') {
            files = appState.localCache.files;
        } else {
            files = appState.remoteCache.files;
        }

        return <Tree
            contents={this.buildNodes(files)}
            className={`${Classes.ELEVATION_0}`}
            onNodeDoubleClick={this.onDoubleClick.bind(this)}
        />;
    }
}