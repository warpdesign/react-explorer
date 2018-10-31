import * as React from "react";
import { inject } from 'mobx-react';
import { reaction } from 'mobx';
import { Classes, Button, ITreeNode, Tooltip, Tree, Intent } from "@blueprintjs/core";
import { AppState } from "../state/appState";
import { AppToaster } from './AppToaster';
// TODO: remove any calls to shell, path
import { File, Directory, DirectoryType } from "../services/Fs";
import { shell } from 'electron';
import * as path from 'path';
import { Logger } from "./Log";

export interface FileListState {
    nodes: ITreeNode[];
    selected: number;
    type: DirectoryType
};

let i = 0;

enum KEYS {
    Escape = 27,
    Enter = 13
};

interface FileListProps{
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
    fileCache: Directory;
}

@inject('appState', 'fileCache')
export class FileList extends React.Component<{}, FileListState> {
    private cache: Directory;
    private editingElement: HTMLElement;
    private editingFile: File;

    constructor(props: any) {
        super(props);

        const { fileCache } = this.injected;

        this.cache = fileCache;

        this.state = {
            nodes: [],
            selected: 0,
            type: fileCache.FS.type
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

    // took this from stack overflow: https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
    private sizeExtension(bytes:number):string {
        const i = Math.floor(Math.log2(bytes)/10);
        const num = (bytes/Math.pow(1024, i));

        return  (i > 0 ? num.toFixed(2) : (num | 0)) + ' ' + ['Bytes','Kb','Mb','Gb','Tb'][i];
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
                    className: file.fullname !== '..' && file.fullname.startsWith('.') && 'isHidden',
                    secondaryLabel: !file.isDir && (<div className="bp3-text-small">{this.sizeExtension(file.length)}</div>) || ''
                };
            return res;
        });
    }

    private onNodeDoubleClick = (node: ITreeNode) => {
        const data = node.nodeData as File;
        const { appState } = this.injected;

        if (data.isDir) {
            Logger.log('need to read dir', path.resolve(path.join(data.dir, data.fullname)));
            appState.updateCache(this.cache, path.resolve(path.join(data.dir, data.fullname)));
        } else {
            shell.openItem(path.join(data.dir, data.fullname));
        }
    }

    private selectLeftPart() {
        const filename = this.editingFile.fullname;
        const regex = RegExp('\\.', 'g');
        const matches = filename.match(regex);
        const selection = window.getSelection();
        const range = document.createRange();
        const textNode = this.editingElement.childNodes[0];

        let selectionLength = filename.length;

        if (matches) {
            const pos = filename.lastIndexOf('.');
            if (pos > 0) {
                selectionLength = pos;
            }
        }

        range.setStart(textNode, 0);
        range.setEnd(textNode, selectionLength);
        selection.empty();
        selection.addRange(range);
    }

    private onNodeClick = (nodeData: ITreeNode, _nodePath: number[], e: React.MouseEvent<HTMLElement>) => {
        console.log(e.target);
        const originallySelected = nodeData.isSelected;
        const { nodes, selected } = this.state;
        const { fileCache, appState } = this.injected;

        let newSelected = selected;

        if (!e.shiftKey) {
            newSelected = 0;
            nodes.forEach(n => (n.isSelected = false));
            nodeData.isSelected = true;
            if (originallySelected) {
                (e.target as HTMLElement).contentEditable = "true";
                (e.target as HTMLElement).focus();
                this.editingElement = e.target as HTMLElement;
                this.editingFile = nodeData.nodeData as File;
                this.selectLeftPart();
            } else {
                // clear rename
                if (this.editingElement) {
                    this.editingElement.blur();
                    this.editingElement.removeAttribute('contenteditable');
                    this.editingElement = null;
                }
            }
        } else {
            nodeData.isSelected = originallySelected == null ? true : !originallySelected;
            this.editingElement = null;
        }


        if (nodeData.isSelected) {
            newSelected++;
        } else if (originallySelected && newSelected > 0) {
            newSelected--;
        }

        this.setState({ nodes, selected: newSelected });
        const selection = nodes.filter((node) => node.isSelected).map((node) => node.nodeData) as File[];

        appState.updateSelection(fileCache, selection);
    };

    private onClipboardCopy = () => {
        const { appState } = this.injected;
        const { nodes, selected } = this.state;

        const elements = nodes.filter((node) => node.isSelected).map((node) => { const nodeData = node.nodeData as File; return nodeData.fullname; });

        appState.setClipboard(this.state.type, this.cache.path, elements);

        AppToaster.show({
            message: `${selected} element(s) copied to the clipboard`,
            icon: "tick",
            intent: Intent.SUCCESS
        });
    }

    private onInlineEdit(cancel: boolean) {
        this.editingElement.blur();
        this.editingElement.removeAttribute('contenteditable');

        if (cancel) {
            console.log('restoring value');
            // restore previous value
            this.editingElement.innerText = this.editingFile.fullname;
        } else {
            console.log('renaming value');
            // call rename function
            this.editingElement.innerText = this.editingFile.fullname;
        }
        this.editingElement = null;
        this.editingFile = null;
    }

    onKeyUp = (e: React.KeyboardEvent<HTMLElement>) => {
        if (this.editingElement) {
            e.nativeEvent.stopImmediatePropagation();
            if (e.keyCode === KEYS.Escape || e.keyCode === KEYS.Enter) {
                this.onInlineEdit(e.keyCode === KEYS.Escape);
            }
        }
    }

    public render() {
        if (this.state.type === DirectoryType.LOCAL) {
            Logger.log('render', i++);
        }

        let copyToClipboardClasses = 'copy';
        if (this.state.selected > 0) {
            copyToClipboardClasses += " showClipboard";
        }

        return <div onKeyUp={this.onKeyUp}>
            <Tree
                contents={this.state.nodes}
                className={`${Classes.ELEVATION_0}`}
                onNodeDoubleClick={this.onNodeDoubleClick}
                onNodeClick={this.onNodeClick}
            />
            <Button icon="duplicate" className={copyToClipboardClasses} onClick={this.onClipboardCopy}>{this.state.selected} element(s)</Button>
        </div>;
    }
}