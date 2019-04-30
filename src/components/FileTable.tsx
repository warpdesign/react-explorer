import * as React from 'react';
import { IconName, Icon, Classes, HotkeysTarget, Hotkeys, Hotkey } from '@blueprintjs/core';
import { Column, Table, AutoSizer, Index, TableRowRenderer } from 'react-virtualized';
import { AppState } from '../state/appState';
import { FileState } from '../state/fileState';
import { WithNamespaces, withNamespaces } from 'react-i18next';
import { inject } from 'mobx-react';
import i18next from 'i18next';
import { IReactionDisposer, reaction, toJS } from 'mobx';
import { File } from '../services/Fs';
import { formatBytes } from '../utils/formatBytes';
import { shouldCatchEvent, isEditable } from '../utils/dom';
import { AppAlert } from './AppAlert';
import { WithMenuAccelerators, Accelerators, Accelerator } from './WithMenuAccelerators';
import { isMac } from '../utils/platform';
import { ipcRenderer } from 'electron';
import classnames from 'classnames';
import { RowRenderer } from './RowRenderer';
import { SettingsState } from '../state/settingsState';
import { ViewState } from '../state/viewState';

require('react-virtualized/styles.css');
require('../css/filetable.css');

const REGEX_EXTENSION = /\.(?=[^0-9])/;

const CLICK_DELAY = 300;
const LABEL_CLASSNAME = 'file-label';
const TABLE_CLASSNAME = 'ReactVirtualized__Table__Grid';

const TYPE_ICONS: { [key: string]: IconName } = {
    'img': 'media',
    'any': 'document',
    'snd': 'music',
    'vid': 'mobile-video',
    'exe': 'application',
    'arc': 'compressed',
    'doc': 'align-left',
    'cod': 'code'
};

enum KEYS {
    Backspace = 8,
    Enter = 13,
    Escape = 27,
    Down = 40,
    Up = 38
};

interface ITableRow {
    name: string;
    icon: IconName;
    size: string;
    isSelected: boolean;
    nodeData: File;
    className: string;
}

interface IState {
    nodes: ITableRow[];
    // number of items selected
    selected: number;
    type: string;
    // position of last selected element
    position: number;
    // last path that was used
    path: string;
};

interface IProps extends WithNamespaces {
    hide: boolean;
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
    viewState: ViewState;
    settingsState: SettingsState;
}

@inject('appState', 'viewState', 'settingsState')
@WithMenuAccelerators
@HotkeysTarget
export class FileTableClass extends React.Component<IProps, IState> {
    private viewState: ViewState;
    private disposer: IReactionDisposer;
    private editingElement: HTMLElement = null;
    private editingFile: File;
    private clickTimeout: any;
    gridElement: HTMLElement;

    constructor(props: IProps) {
        super(props);

        this.viewState = this.injected.viewState;

        this.state = {
            nodes: this.buildNodes(this.cache.files, false),
            selected: 0,
            type: 'local',
            position: -1,
            path: this.cache.path
        };

        this.installReaction();
        // since the nodes are only generated after the files are updated
        // we re-render them after language has changed otherwise FileList
        // gets re-rendered with the wrong language after language has been changed
        this.bindLanguageChange();

        // this.cache.cd(this.cache.path);
    }

    get cache() {
        return this.viewState.getVisibleCache();
    }

    private bindLanguageChange = () => {
        i18next.on('languageChanged', this.onLanguageChanged);
    }

    private unbindLanguageChange = () => {
        i18next.off('languageChanged', this.onLanguageChanged);
    }

    public onLanguageChanged = (lang: string) => {
        this.updateNodes(this.cache.files);
    }

    public componentWillUnmount() {
        this.disposer();
        document.removeEventListener('keydown', this.onDocKeyDown);
        this.unbindLanguageChange();
    }

    public componentDidMount() {
        document.addEventListener('keydown', this.onDocKeyDown);
    }

    renderMenuAccelerators() {
        return <Accelerators>
            <Accelerator combo="CmdOrCtrl+A" onClick={this.onSelectAll}></Accelerator>
            <Accelerator combo="rename" onClick={this.getElementAndToggleRename}></Accelerator>
        </Accelerators>;
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
                combo="mod + shift + o"
                label={t('SHORTCUT.ACTIVE_VIEW.OPEN_FILE')}
                onKeyDown={this.onOpenFile}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}>
            </Hotkey>
            {!isMac && (<Hotkey
                global={true}
                combo="mod + a"
                label={t('SHORTCUT.ACTIVE_VIEW.SELECT_ALL')}
                onKeyDown={this.onSelectAll}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}>
            </Hotkey>)}
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

    private installReaction() {
        this.disposer = reaction(
            () => { return toJS(this.cache.files) },
            (files: File[]) => {
                this.updateNodes(files);
            });
    }

    private isNodeSelected(name: string) {
        return !!this.state.nodes.find(node => node.isSelected && node.name === name);
    }

    private buildNodes = (files: File[], keepSelection = false): ITableRow[] => {
        console.log('** building nodes', files.length);

        return files
            .sort((file1, file2) => {
                if ((file2.isDir && !file1.isDir)) {
                    return 1;
                } else if (!file1.name.length || (file1.isDir && !file2.isDir)) {
                    return -1;
                } else {
                    return file1.fullname.localeCompare(file2.fullname);
                }
            })
            .map((file, i) => {
                const filetype = file.type;
                const isSelected = keepSelection && this.isNodeSelected(file.fullname);

                const res: ITableRow = {
                    icon: file.isDir && "folder-close" || (filetype && TYPE_ICONS[filetype] || TYPE_ICONS['any']),
                    name: file.fullname,
                    nodeData: file,
                    className: file.fullname !== '..' && file.fullname.startsWith('.') && 'isHidden' || '',
                    isSelected: isSelected,
                    size: !file.isDir && formatBytes(file.length) || ''
                };

                return res;
            });
    }

    _noRowsRenderer = () => {
        const { t } = this.injected;

        return (<div className="empty"><Icon icon="tick-circle" iconSize={40} />{t('COMMON.EMPTY_FOLDER')}</div>);
    }

    private updateNodes(files: File[]) {
        // we want to keep selected files when updating the cache
        const keepSelection = files.length && this.state.path === files[0].dir;
        console.log('got files', files.length);
        // console.time('building nodes');
        const nodes = this.buildNodes(files, keepSelection);
        this.updateState(nodes, keepSelection);
    }

    private updateState(nodes: ITableRow[], keepSelection = false) {
        this.setState({ nodes, selected: keepSelection ? this.state.selected : 0, position: -1 });
    }

    getRow(index: number): ITableRow {
        return this.state.nodes[index];
    }

    nameRenderer = (data: any) => {
        const iconName = data.rowData.icon;

        return (<div className="name"><Icon icon={iconName}></Icon><span title={data.cellData} className="file-label">{data.cellData}</span></div>);
    }

    rowClassName = (data: any) => {
        const file = this.state.nodes[data.index];
        const error = file && file.nodeData.mode === -1;

        return classnames('tableRow', file && file.className, { selected: file && file.isSelected, error: error });
    }

    clearClickTimeout() {
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = 0;
        }
    }

    onRowClick = (data: any) => {
        console.log('nodeclick');
        const { rowData, event, index } = data;
        const { nodes, selected } = this.state;
        const originallySelected = rowData.isSelected;
        const file = rowData.nodeData as File;

        // keep a reference to the target before set setTimeout is called
        // because React set the event to null
        const element = event.target as HTMLElement;

        // do not select parent dir pseudo file
        if (this.editingElement === element || file.fullname === '..') {
            return;
        }

        let newSelected = selected;
        let position = index;

        if (!event.shiftKey) {
            newSelected = 0;
            nodes.forEach(n => (n.isSelected = false));
            rowData.isSelected = true;

            // online toggle rename when clicking on the label, not the icon
            if (element.classList.contains(LABEL_CLASSNAME)) {
                this.clearClickTimeout();

                // only toggle inline if last selected element was this one
                if (index === this.state.position && originallySelected) {
                    this.clickTimeout = setTimeout(() => {
                        this.toggleInlineRename(element, originallySelected, file);
                    }, CLICK_DELAY);
                }
            }
        } else {
            rowData.isSelected = !rowData.isSelected;
            if (!rowData.isSelected) {
                // need to update position with last one
                // will be -1 if no left selected node is
                position = nodes.findIndex((node) => node.isSelected);
            }
            this.editingElement = null;
        }


        if (rowData.isSelected) {
            newSelected++;
        } else if (originallySelected && newSelected > 0) {
            newSelected--;
        }

        this.setState({ nodes, selected: newSelected, position });
        this.updateSelection();
    }

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
                    // this will not re-sort the files
                    this.updateSelection();
                    // we could also reload but not very optimal when working on remote files
                    // const { fileCache } = this.injected;
                    // fileCache.reload();
                    // Finder automatically repositions the file but won't automatically scroll the list
                    // so the file may be invisible after the reposition: not sure this is perfect either
                })
                .catch((error) => {
                    AppAlert.show(error.message).then(() => {
                        editingElement.innerText = error.oldName;
                    });
                });
        }
        this.editingElement = null;
        this.editingFile = null;

        editingElement.blur();
        editingElement.removeAttribute('contenteditable');
    }

    updateSelection() {
        const { appState } = this.injected;
        const fileCache = this.cache;
        const { nodes } = this.state;

        const selection = nodes.filter((node) => node.isSelected).map((node) => node.nodeData) as File[];

        appState.updateSelection(fileCache, selection);
    }

    selectLeftPart() {
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

    toggleInlineRename(element: HTMLElement, originallySelected: boolean, file: File) {
        console.log('toggle inlinerename');
        if (!file.readonly) {
            if (originallySelected) {
                console.log('activate inline rename!');
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

    onRowDoubleClick = (data: any) => {
        this.clearClickTimeout();
        const { rowData, event } = data;
        const file = rowData.nodeData as File;

        if ((event.target as HTMLElement) !== this.editingElement) {
            this.openFileOrDirectory(file, event);
        }
    }

    async openFileOrDirectory(file: File, event: KeyboardEvent) {
        const { appState } = this.injected;

        try {
            if (!file.isDir) {
                // await this.cache.openFile(file);
                // await appState.getFile(file);
                await this.cache.openFile(appState, this.cache, file);
                console.log('** done');
            } else {
                const isShiftDown = event.shiftKey;
                const cache = isShiftDown ? appState.getInactiveViewVisibleCache() : this.cache;

                await cache.openDirectory(file);
            }
        } catch (error) {
            const { t } = this.injected;
            AppAlert.show(t('ERRORS.GENERIC', { error }), {
                intent: 'danger'
            });
        }
    }

    selectAll(invert = false) {
        let { position, selected } = this.state;
        let { nodes } = this.state;
        const fileCache = this.cache;

        if (nodes.length && this.isViewActive()) {
            console.log('onSelectAll', document.activeElement);
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

    onOpenFile = (e: KeyboardEvent) => {
        const { position, nodes } = this.state;

        if (this.isViewActive() && position > -1) {
            const file = nodes[position].nodeData as File;
            // this.cache.openFile(file).catch((error) => {
            //     const { t } = this.injected;
            //     AppAlert.show(t('ERRORS.GENERIC', { error }), {
            //         intent: 'danger'
            //     });
            // })
            this.openFileOrDirectory(file, e);
        }
    }

    onSelectAll = () => {
        const isOverlayOpen = document.body.classList.contains('bp3-overlay-open');
        if (!isOverlayOpen && !isEditable(document.activeElement)) {
            this.selectAll();
        } else {
            // need to select all text: send message
            console.log('isEditable');
            ipcRenderer.send('selectAll');
        }
    }

    onInvertSelection = () => {
        this.selectAll(true);
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

    getNodeContentElement(position: number): HTMLElement {
        const selector = `[aria-rowindex="${position}"]`;
        return this.gridElement.querySelector(selector);
    }

    isViewActive(): boolean {
        const { viewState } = this.injected;
        return viewState.isActive && !this.props.hide;
    }

    getElementAndToggleRename = (e?: KeyboardEvent | string) => {
        if (!this.editingElement && this.state.selected > 0) {
            const { position, nodes } = this.state;
            const node = nodes[position];
            const file = nodes[position].nodeData as File;
            const element = this.getNodeContentElement(position + 1);
            const span: HTMLElement = element.querySelector(`.${LABEL_CLASSNAME}`);
            if (e && typeof e !== 'string') {
                e.preventDefault();
            }
            this.toggleInlineRename(span, node.isSelected, file);
        }
    }

    onDocKeyDown = (e: KeyboardEvent) => {
        const fileCache = this.cache;

        if (!this.isViewActive() || !shouldCatchEvent(e)) {
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
                this.getElementAndToggleRename(e);
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
        const fileCache = this.cache;
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

    setTableRef = (element: HTMLElement) => {
        this.gridElement = element && element.querySelector(`.${TABLE_CLASSNAME}`) || null;
    }

    rowRenderer = (props: any) => {
        const { selected, nodes } = this.state;
        const { settingsState } = this.injected;
        const fileCache = this.cache;
        const node = nodes[props.index];

        props.selectedCount = node.isSelected ? selected : 0;
        props.fileCache = fileCache;
        props.isDarkModeActive = settingsState.isDarkModeActive;

        return RowRenderer(props);
    }

    rowGetter = (index: Index) => this.getRow(index.index);

    render() {
        const { position } = this.state;
        const rowCount = this.state.nodes.length;

        return (<div ref={this.setTableRef} onKeyDown={this.onInputKeyDown} className={`fileListSizerWrapper ${Classes.ELEVATION_0}`}>
            <AutoSizer>
                {({ width, height }) => (
                    <Table
                        disableHeader={true}
                        headerClassName="tableHeader"
                        headerHeight={30}
                        height={height}
                        onRowClick={this.onRowClick}
                        onRowDoubleClick={this.onRowDoubleClick}
                        noRowsRenderer={this._noRowsRenderer}
                        rowClassName={this.rowClassName}
                        rowHeight={30}
                        rowGetter={this.rowGetter}
                        rowCount={rowCount}
                        scrollToIndex={position < 0 ? 0 : position}
                        rowRenderer={this.rowRenderer}
                        width={width}>
                        <Column
                            dataKey="name"
                            label="Name"
                            cellRenderer={this.nameRenderer}
                            width={10}
                            flexGrow={1}
                        />
                        <Column
                            className="size bp3-text-small"
                            width={90}
                            disableSort
                            label="Size"
                            dataKey="size"
                            flexShrink={1}
                        />
                    </Table>
                )
                }
            </AutoSizer></div>);
    }
}

const FileTable = withNamespaces()(FileTableClass);

export { FileTable };
