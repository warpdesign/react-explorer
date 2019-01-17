import * as React from "react";
import * as ReactDOM from "react-dom";
import { inject } from 'mobx-react';
import { reaction, toJS, IReactionDisposer } from 'mobx';
import { Classes, ITreeNode, Tree, TreeNode, HotkeysTarget, Hotkeys, Hotkey } from "@blueprintjs/core";
import { AppState } from "../state/appState";
import { File } from "../services/Fs";
import { FileState } from "../state/fileState";
import { withNamespaces, WithNamespaces } from 'react-i18next';
import { formatBytes } from '../utils/formatBytes';
import { shouldCatchEvent } from '../utils/dom';
import i18next from '../locale/i18n';

const REGEX_EXTENSION = /\.(?=[^0-9])/;

export interface FileListState {
    nodes: ITreeNode[];
    // number of items selected
    selected: number;
    type: string;
    // position of last selected element
    position: number;
};

enum KEYS {
    Backspace = 8,
    Enter = 13,
    Escape = 27,
    Down = 40,
    Up = 38
};

const CLICK_DELAY = 300;

interface IProps extends WithNamespaces{
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
@HotkeysTarget
export class FileListClass extends React.Component<IProps, FileListState> {
    private cache: FileState;
    private editingElement: HTMLElement = null;
    private editingFile: File;
    private clickTimeout: any;
    private disposer: IReactionDisposer;
    private treeRef: Tree;
    private newNodes = false;

    constructor(props: IProps) {
        super(props);

        const { fileCache } = this.injected;

        this.cache = fileCache;

        this.state = {
            nodes: this.buildNodes(this.cache.files),
            selected: 0,
            type: 'local',
            position: -1
        };

        this.installReaction();
        // since the nodes are only generated after the files are updated
        // we re-render them after language has changed otherwise FileList
        // gets re-rendered with the wrong language after language has been changed
        this.bindLanguageChange();

        fileCache.cd(fileCache.path);
    }

    private bindLanguageChange = () => {
        i18next.on('languageChanged', this.onLanguageChanged);
    }

    private unbindLanguageChange = () => {
        i18next.off('languageChanged', this.onLanguageChanged);
    }

    public onLanguageChanged = (lang: string) => {
        const nodes = this.buildNodes(this.cache.files);
        this.updateNodes(nodes);
    }

    renderHotkeys() {
        const { t } = this.props;

        return <Hotkeys>
            <Hotkey
                global={true}
                combo="mod + o"
                label={t('SHORTCUT.ACTIVE_VIEW.OPEN_FILE')}
                onKeyDown={this.onOpenFile}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}>
            </Hotkey>
            <Hotkey
                global={true}
                combo="mod + a"
                label={t('SHORTCUT.ACTIVE_VIEW.SELECT_ALL')}
                onKeyDown={this.onSelectAll}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}>
            </Hotkey>
            <Hotkey
                global={true}
                combo="mod + i"
                label={t('SHORTCUT.ACTIVE_VIEW.SELECT_INVERT')}
                onKeyDown={this.onInvertSelection}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}>
            </Hotkey>
        </Hotkeys>;
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private updateNodes(nodes: ITreeNode<{}>[]) {
        this.setState({ nodes, selected: 0, position: -1 });
    }

    private installReaction() {
        this.disposer = reaction(
            () => { return toJS(this.cache.files) },
            (files: File[]) => {
                console.log('got files', files.length);
                // console.time('building nodes');
                const nodes = this.buildNodes(files);
                this.updateNodes(nodes);
            });
    }

    private buildNodes = (files:File[]): ITreeNode<{}>[] => {
        console.log('** building nodes');
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
                    secondaryLabel: !file.isDir && (<div className="bp3-text-small">{formatBytes(file.length)}</div>) || ''
                };

            this.newNodes = true;

            return res;
        });
    }

    private onOpenFile = () => {
        const { position, nodes } = this.state;
        const { fileCache } = this.injected;

        if (fileCache.active && position > -1) {
            const file = nodes[position].nodeData as File;
            this.cache.openFile(file);
        }
    }

    private onNodeDoubleClick = (node: ITreeNode, _nodePath: number[], e: React.MouseEvent<HTMLElement>) => {
        const file = node.nodeData as File;

        // double click: prevent inline rename
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = 0;
        }

        if ((e.target as HTMLElement) !== this.editingElement) {
            this.cache.openFile(file);
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
        const file = nodeData.nodeData as File;

        // keep a reference to the target before set setTimeout is called
        // because React set the event to null
        const element = e.target as HTMLElement;

        // do not select parent dir pseudo file
        if (this.editingElement === element || file.fullname === '..') {
            return;
        }

        let newSelected = selected;
        let position = parseInt(nodeData.id.toString(), 10);

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
            nodeData.isSelected = !nodeData.isSelected;
            if (!nodeData.isSelected) {
                // need to update position with last one
                // will be -1 if no left selected node is
                position = nodes.findIndex((node) => node.isSelected);
            }
            this.editingElement = null;
        }


        if (nodeData.isSelected) {
            newSelected++;
        } else if (originallySelected && newSelected > 0) {
            newSelected--;
        }

        this.setState({ nodes, selected: newSelected, position });
        this.updateSelection();
    };

    private onInlineEdit(cancel: boolean) {
        const editingElement = this.editingElement;

        if (cancel) {
            console.log('restoring value');
            // restore previous value
            editingElement.innerText = this.editingFile.fullname;
        } else {
            console.log('renaming value', this.cache.path, this.editingFile);
            // since the File element is modified by the rename FileState.rename method there is
            // no need to refresh the file cache:
            // 1. innerText has been updated and is valid
            // 2. File.fullname is also updated, so any subsequent render will get the latest version as well
            this.cache.rename(this.editingFile.dir, this.editingFile, editingElement.innerText)
                .then(() => {
                    this.updateSelection();
                })
                .catch((oldName) => {
                    editingElement.innerText = oldName;
                });
        }
        this.editingElement = null;
        this.editingFile = null;

        editingElement.blur();
        editingElement.removeAttribute('contenteditable');
    }

    onInputKeyUp = (e: React.KeyboardEvent<HTMLElement>) => {
        // if (this.editingElement) {
        //     e.nativeEvent.stopImmediatePropagation();
        //     if (e.keyCode === KEYS.Escape || e.keyCode === KEYS.Enter) {
        //         console.log('end inline edit');
        //         this.onInlineEdit(e.keyCode === KEYS.Escape);
        //     }
        // }
    }

    onInputKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (this.editingElement) {
            e.nativeEvent.stopImmediatePropagation();
            if (e.keyCode === KEYS.Escape || e.keyCode === KEYS.Enter) {
                if (e.keyCode === KEYS.Enter) {
                    e.preventDefault();
                }
                // console.log('end inline edit');
                this.onInlineEdit(e.keyCode === KEYS.Escape);
            }
        }
    }

    onDocKeyDown = (e: KeyboardEvent) => {
        const { fileCache } = this.injected;

        if (!fileCache.active || !shouldCatchEvent(e)) {
            return;
        }

        switch (e.keyCode) {
            case KEYS.Down:
            case KEYS.Up:
                if (!this.editingElement && (e.keyCode === KEYS.Down || e.keyCode === KEYS.Up)) {
                    this.moveSelection(e.keyCode === KEYS.Down ? 1 : -1, e.shiftKey);
                    e.preventDefault();
                }
                break;

            case KEYS.Enter:
                if (!this.editingElement && this.state.selected > 0) {
                    const { position, nodes } = this.state;
                    const node = nodes[position];
                    const file = nodes[position].nodeData as File;
                    const element = this.treeRef.getNodeContentElement(position);
                    const span: HTMLElement = element.querySelector('.bp3-tree-node-label');
                    e.preventDefault();
                    this.toggleInlineRename(span, node.isSelected, file);
                }
                break;

            case KEYS.Backspace:
                // TODO: this is used in Log as well, share the code !
                const { nodes } = this.state;

                if (!this.editingElement && nodes.length) {
                    const node = nodes[0];
                    const file = node.nodeData as File;

                    if (!fileCache.isRoot(file.dir)) {
                        this.cache.cd(file.dir, '..');
                    }
                }
                break;
        }
    }

    moveSelection(step: number, isShiftDown: boolean) {
        console.log('down');
        const { fileCache } = this.injected;
        let { position, selected } = this.state;
        let { nodes } = this.state;

        position += step;

        // skip parent entry (only if this is not the root folder)
        if (!position) {
            const dir = (nodes[0].nodeData as File).dir;
            if (!fileCache.isRoot(dir)) {
                position += step;
            }
        }

        if (position > -1 && position <= this.state.nodes.length - 1) {
            if (isShiftDown) {
                selected++;
            } else {
                // unselect previous one
                nodes.forEach(n => (n.isSelected = false));
                selected = 1;
            }

            console.log('selecting', position);

            nodes[position].isSelected = true;

            // move in method to reuse
            this.setState({ nodes, selected, position });

            this.updateSelection();
        }
    }

    onSelectAll = () => {
        this.selectAll();
    }

    selectAll(invert = false) {
        let { position, selected } = this.state;
        let { nodes } = this.state;
        const { fileCache } = this.injected;

        if (nodes.length && fileCache.active) {
            const isRoot = fileCache.isRoot((nodes[0].nodeData as File).dir);
            selected = 0;

            let i = 0;
            for (let node of nodes) {
                // do not select parent dir
                if (i || isRoot) {
                    node.isSelected = invert ? !node.isSelected : true;
                    if (node.isSelected) {
                        position = i;
                        selected++;
                    }
                }
                i++;
            }

            this.setState({ nodes, selected, position });

            this.updateSelection();
        }
    }

    onInvertSelection = () => {
        this.selectAll(true);
    }

    private updateSelection() {
        const { appState, fileCache } = this.injected;
        const { nodes } = this.state;

        const selection = nodes.filter((node) => node.isSelected).map((node) => node.nodeData) as File[];

        appState.updateSelection(fileCache, selection);
    }

    public componentWillUnmount() {
        this.disposer();
        document.removeEventListener('keydown', this.onDocKeyDown);
        this.unbindLanguageChange();
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

        const node = ReactDOM.findDOMNode(this) as Element;
        const tree = node.querySelector('.bp3-tree') as HTMLElement;
        const { position } = this.state;

        // FileList can be rendered for two reasons:
        // 1. nodes have changed, in this case we need to reset scrollTop (see below)
        // 2. selection state has changed, in this case we may need to change scrollTop
        // so that the selected element is visible
        if (this.newNodes) {
            console.log('new nodes');
            // blueprint bug? sometimes scrollTop doesn't get reset to 0 when rendering a new tree
            this.newNodes = false;
            tree.scrollTop = 0;
        } else if (position > -1) {
            const treeScrollTop = tree.scrollTop;
            const element = this.treeRef.getNodeContentElement(position);
            const elementOffsetTop = element.offsetTop;
            const elementBottom =  elementOffsetTop + element.offsetHeight;
            const scrollBottom = tree.offsetHeight + treeScrollTop;
            let newPos = -1;

            if (treeScrollTop > elementOffsetTop) {
                // need to scroll up
                newPos = element.offsetTop;
            } else if (scrollBottom <= elementBottom) {
                newPos = treeScrollTop + (elementBottom - scrollBottom);
            }

            if (newPos > -1) {
                tree.scrollTop = newPos;
            }
        } else {
            console.log('didupdate');
        }
    }

    public componentDidMount() {
        document.addEventListener('keydown', this.onDocKeyDown);
    }

    public setTreeRef = (ref: Tree) => {
        this.treeRef = ref;
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
                <div className="filelist" onKeyUp={this.onInputKeyUp} onKeyDown={this.onInputKeyDown}>
                    <Tree
                        ref={this.setTreeRef}
                        contents={this.state.nodes}
                        className={`${Classes.ELEVATION_0}`}
                        onNodeDoubleClick={this.onNodeDoubleClick}
                        onNodeClick={this.onNodeClick}
                    />
                </div>);
        // }
    }
}

const FileList = withNamespaces()(FileListClass);

export { FileList };
