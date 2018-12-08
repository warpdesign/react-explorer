import * as React from "react";
import { inject } from 'mobx-react';
import { reaction, toJS, IReactionDisposer } from 'mobx';
import { Classes, Button, ITreeNode, Tooltip, Tree, Intent } from "@blueprintjs/core";
import { AppState } from "../state/appState";
import { AppToaster } from './AppToaster';
// TODO: remove any calls to shell
import { File } from "../services/Fs";
import { shell } from 'electron';
import { Logger } from "./Log";
import { FileState } from "../state/fileState";

const REGEX_EXTENSION = /\.(?=[^0-9])/;

export interface FileListState {
    nodes: ITreeNode[];
    selected: number;
    type: string
};

enum KEYS {
    Escape = 27,
    Enter = 13
};

const CLICK_DELAY = 300;

interface IProps{
    onUpdate?: () => void;
    onRender?: () => void;
}

// Here we extend our props in order to keep the injected props private
// and still keep strong typing.
//
// if appState was added to the public props FileListProps,
// it would have to be specified when composing FileList, ie:
// <FileList ... appState={appState}/> and we don't want that
// see: https://github.com/mobxjs/mobx-react/issues/256
interface InjectedProps extends IProps {
    appState: AppState;
    fileCache: FileState;
}

@inject('appState', 'fileCache')
export class FileList extends React.Component<IProps, FileListState> {
    private cache: FileState;
    private editingElement: HTMLElement;
    private editingFile: File;
    private clickTimeout: any;
    private disposer: IReactionDisposer;
    private firstRender = true;

    constructor(props: IProps) {
        super(props);

        const { fileCache } = this.injected;

        this.cache = fileCache;

        this.state = {
            nodes: this.buildNodes(this.cache.files),
            selected: 0,
            type: 'local'
        };

        this.installReaction();
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private installReaction() {
        this.disposer = reaction(
            () => { return toJS(this.cache.files) },
            (files: File[]) => {
                console.log('got files', files.length);
                // console.time('building nodes');
                const nodes = this.buildNodes(files);
                // console.timeEnd('building nodes');
                this.setState({ nodes, selected: 0 });
            });
    }

    // took this from stack overflow: https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
    private sizeExtension(bytes:number):string {
        const i = bytes > 0 ? Math.floor(Math.log2(bytes)/10) : 0;
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

    private onNodeDoubleClick = (node: ITreeNode, _nodePath: number[], e: React.MouseEvent<HTMLElement>) => {
        const data = node.nodeData as File;

        // double click: prevent inline rename
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = 0;
        }

        if ((e.target as HTMLElement) !== this.editingElement) {
            if (data.isDir) {
                Logger.log('need to read dir', data.dir, data.fullname);
                this.cache.cd(data.dir, data.fullname);
                // Logger.log('need to read dir', this.cache.FS.joinResolve(data.dir, data.fullname));
                // appState.updateCache(this.cache, this.cache.FS.joinResolve(data.dir, data.fullname));
            } else {
                console.log('need to open file')
                this.cache.get(data.dir, data.fullname).then((tmpPath: string) => {
                    console.log('opening file', tmpPath);
                    shell.openItem(tmpPath);
                });
            }
        }
    }

    private selectLeftPart() {
        const filename = this.editingFile.fullname;
        const selectionLength = filename.split(REGEX_EXTENSION)[0].length;
        const selection = window.getSelection();
        const range = document.createRange();
        const textNode = this.editingElement.childNodes[0];

        range.setStart(textNode, 0);
        range.setEnd(textNode, selectionLength);
        selection.empty();
        selection.addRange(range);
    }

    private toggleInlineRename(element: HTMLElement, originallySelected: boolean, file: File) {
        // do not activate rename when clicking on parent ('..') entry
        if (!file.readonly) {
            if (originallySelected) {
                element.contentEditable = "true";
                element.focus();
                this.editingElement = element;
                this.editingFile = file;
                this.selectLeftPart();
                element.onblur = () => {
                    if (this.editingElement) {
                        this.onInlineEdit(true);
                    }
                }
            } else {
                // clear rename
                if (this.editingElement) {
                    this.editingElement.blur();
                    this.editingElement.removeAttribute('contenteditable');
                    this.editingElement = null;
                }
            }
        }
    }

    private onNodeClick = (nodeData: ITreeNode, _nodePath: number[], e: React.MouseEvent<HTMLElement>) => {
        const originallySelected = nodeData.isSelected;
        const { nodes, selected } = this.state;
        const { fileCache, appState } = this.injected;
        const file = nodeData.nodeData as File;

        // keep a reference to the target before set setTimeout is called
        // because React set the event to null
        const element = e.target as HTMLElement;

        // do not select parent dir pseudo file
        if (this.editingElement === element || file.fullname === '..') {
            return;
        }

        let newSelected = selected;

        if (!e.shiftKey) {
            newSelected = 0;
            nodes.forEach(n => (n.isSelected = false));
            nodeData.isSelected = true;
            // online toggle rename when clicking on the label, not the icon
            if (element.classList.contains('bp3-tree-node-label')) {
                if (this.clickTimeout) {
                    clearTimeout(this.clickTimeout);
                    this.clickTimeout = 0;
                }

                this.clickTimeout = setTimeout(() => {
                    this.toggleInlineRename(element, originallySelected, file);
                }, CLICK_DELAY);
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

    private onInlineEdit(cancel: boolean) {
        const editingElement = this.editingElement;

        if (cancel) {
            console.log('restoring value');
            // restore previous value
            editingElement.innerText = this.editingFile.fullname;
        } else {
            console.log('renaming value', this.cache.path, this.editingFile);
            // call rename function
            this.cache.rename(this.editingFile.dir, this.editingFile, editingElement.innerText)
                .then(() => {
                    // this.injected.appState.refreshCache(this.cache);
                    this.cache.reload();
                }).catch((oldName) => {
                    editingElement.innerText = oldName;
                });
        }
        this.editingElement = null;
        this.editingFile = null;

        editingElement.blur();
        editingElement.removeAttribute('contenteditable');
    }

    onKeyUp = (e: React.KeyboardEvent<HTMLElement>) => {
        if (this.editingElement) {
            e.nativeEvent.stopImmediatePropagation();
            if (e.keyCode === KEYS.Escape || e.keyCode === KEYS.Enter) {
                this.onInlineEdit(e.keyCode === KEYS.Escape);
            }
        }
    }

    onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (this.editingElement && e.keyCode === KEYS.Enter) {
            e.preventDefault();
        }
    }

    public componentWillUnmount() {
        this.disposer();
    }

    public shouldComponentUpdate() {
        console.time('FileList Render');

        if (this.props.onRender) {
            this.props.onRender();
        }

        return true;
    }

    public componentDidUpdate() {
        console.timeEnd('FileList Render');
        if (this.props.onUpdate) {
            this.props.onUpdate();
        }
    }

    public render() {
        // if (this.cache.path.match(/Downloads/)) {
        //     return (
        //         <div className="filelist" onKeyUp={this.onKeyUp} onKeyDown={this.onKeyDown}>
        //             {this.state.nodes.map((node) => (<div key={node.id}><span>{node.label}</span><div>Blah</div></div>))}
        //             {this.state.nodes.map((node) => (<div key={this.getId(node.id)}><span>{node.label}</span><div>Blew</div></div>))}
        //             {this.state.nodes.map((node) => (<div key={this.getId(node.id)}><span>{node.label}</span><div>Blew</div></div>))}
        //         </div>
        //     );
        // } else {
            return (
                <div className="filelist" onKeyUp={this.onKeyUp} onKeyDown={this.onKeyDown}>
                    <Tree
                        contents={this.state.nodes}
                        className={`${Classes.ELEVATION_0}`}
                        onNodeDoubleClick={this.onNodeDoubleClick}
                        onNodeClick={this.onNodeClick}
                    />
                </div>);
        // }
    }
}
