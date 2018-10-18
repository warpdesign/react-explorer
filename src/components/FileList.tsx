import * as React from "react";
import { inject } from 'mobx-react';
import { reaction } from 'mobx';
import { Position, Classes, Button, ITreeNode, Tooltip, Tree, Toaster, Intent } from "@blueprintjs/core";
import { AppState } from "../state/appState";
// TODO: remove any calls to shell, path
import { File, Cache } from "../services/Fs";
import { shell } from 'electron';
import * as path from 'path';
import { Logger } from "./Log";

export interface FileListState {
    nodes: ITreeNode[];
    selected: number;
};

let i = 0;

export const AppToaster = Toaster.create({
    className: "recipe-toaster",
    position: Position.TOP,
});

const TOAST_TIMEOUT = 2000;

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
// see: https://github.com/mobxjs/mobx-react/issues/256
interface InjectedProps extends FileListProps {
    appState: AppState;
    fileCache: Cache;
}

@inject('appState', 'fileCache')
export class FileList extends React.Component<FileListProps, FileListState> {
    private cache: Cache;

    constructor(props: any) {
        super(props);

        const { fileCache } = this.injected;

        // this.cache = props.type === 'local' ? appState.localCache : appState.remoteCache;
        this.cache = fileCache;

        this.state = {
            nodes: [],
            selected: 0
        };

        this.installReaction();
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private installReaction() {
        const reaction1 = reaction(
            () => { return this.cache.files },
            (files: File[]) => {
                const nodes = this.buildNodes(files);
                this.setState({ nodes, selected: 0 });
            });
    }

    private buildNodes = (files:File[]): ITreeNode<{}>[] => {
        return files
            .sort((file1, file2) => {
                if ((file2.isDir && !file1.isDir) ) {
                    return 1;
                } else if (!file1.name.length || (file1.isDir && !file2.isDir)) {
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

    private onNodeDoubleClick = (node: ITreeNode) => {
        const data = node.nodeData as File;
        const { appState } = this.injected;

        if (data.isDir) {
            Logger.log('need to read dir', path.resolve(path.join(data.dir, data.fullname)));
            // appState.readDirectory(path.join(appState.localCache.path, data.fullname), this.props.type);
            appState.updateCache(this.cache, path.resolve(path.join(data.dir, data.fullname)));
        } else {
            shell.openItem(path.join(data.dir, data.fullname));
        }
    }

    private onNodeClick = (nodeData: ITreeNode, _nodePath: number[], e: React.MouseEvent<HTMLElement>) => {
        const originallySelected = nodeData.isSelected;
        const { nodes, selected } = this.state;
        let newSelected = selected;

        if (!e.shiftKey) {
            newSelected = 0;
            nodes.forEach( n => (n.isSelected = false) );
        }
        nodeData.isSelected = originallySelected == null ? true : !originallySelected;

        if (nodeData.isSelected) {
            newSelected++;
        } else if (originallySelected && newSelected > 0) {
            newSelected--;
        }

        this.setState({ nodes, selected: newSelected });
    };

    private onClipboardCopy = () => {
        const { appState } = this.injected;
        const { nodes, selected } = this.state;

        const elements = nodes.filter((node) => node.isSelected).map((node) => { const nodeData = node.nodeData as File; return path.join(nodeData.dir, nodeData.fullname); });

        appState.setClipboard(this.props.type as 'remote' | 'local', elements);

        AppToaster.show({
            message: `${selected} element(s) copied to the clipboard`,
            icon: "tick",
            intent: Intent.SUCCESS,
            timeout: TOAST_TIMEOUT
        });
    }

    public render() {
        if (this.props.type === 'local') {
            Logger.log('render', i++);
        }

        let copyToClipboardClasses = 'copy';
        if (this.state.selected > 0) {
            copyToClipboardClasses += " showClipboard";
        }

        return <React.Fragment>
            <Tree
                contents={this.state.nodes}
                className={`${Classes.ELEVATION_0}`}
                onNodeDoubleClick={this.onNodeDoubleClick}
                onNodeClick={this.onNodeClick}
            />
            <Button icon="duplicate" className={copyToClipboardClasses} onClick={this.onClipboardCopy}>{this.state.selected} element(s)</Button>
        </React.Fragment>;
    }
}