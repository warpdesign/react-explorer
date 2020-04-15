import * as React from 'react';
import { IconName, Icon, HotkeysTarget, Hotkeys, Hotkey, IHotkeysProps } from '@blueprintjs/core';
import { Column, Table, AutoSizer, Index, HeaderMouseEventHandlerParams } from 'react-virtualized';
import { AppState } from '../state/appState';
import { WithNamespaces, withNamespaces } from 'react-i18next';
import { inject } from 'mobx-react';
import i18next from 'i18next';
import { IReactionDisposer, reaction, toJS } from 'mobx';
import { File, FileID } from '../services/Fs';
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
import { debounce } from '../utils/debounce';
import { TSORT_METHOD_NAME, TSORT_ORDER, getSortMethod } from '../services/FsSort';
import CONFIG from '../config/appConfig'
import { getSelectionRange } from '../utils/fileUtils';
import { throttle } from '../utils/throttle';

declare var ENV: any;

require('react-virtualized/styles.css');
require('../css/filetable.css');

const CLICK_DELAY = 300;
const SCROLL_DEBOUNCE = 50;
const ARROW_KEYS_REPEAT_DELAY = 5;
const ROW_HEIGHT = 28;
const SIZE_COLUMN_WITDH = 70;
// this is just some small enough value: column will grow
// automatically to make the name visible
const NAME_COLUMN_WIDTH = 10;

const LABEL_CLASSNAME = 'file-label';
const GRID_CLASSNAME = 'filetable-grid';

const TYPE_ICONS: { [key: string]: IconName } = {
    'img': 'media',
    'any': 'document',
    'snd': 'music',
    'vid': 'mobile-video',
    'exe': 'application',
    'arc': 'compressed',
    'doc': 'align-left',
    'cod': 'code',
    'dir': 'folder-close'
};

enum KEYS {
    Backspace = 8,
    Enter = 13,
    Escape = 27,
    Down = 40,
    Up = 38,
    PageDown = 34,
    PageUp = 33
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
    private disposers: Array<IReactionDisposer> = new Array();
    private editingElement: HTMLElement = null;
    private editingFile: File;
    private clickTimeout: any;
    gridElement: HTMLElement;
    tableRef: React.RefObject<Table> = React.createRef();

    constructor(props: IProps) {
        super(props);

        const cache = this.cache;

        this.state = {
            nodes: [],// this.buildNodes(this.cache.files, false),
            selected: 0,
            type: 'local',
            position: -1,
            path: cache.path
        };

        this.installReactions();
        // since the nodes are only generated after the files are updated
        // we re-render them after language has changed otherwise FileList
        // gets re-rendered with the wrong language after language has been changed
        this.bindLanguageChange();

        // this.cache.cd(this.cache.path);
    }

    get cache() {
        const viewState = this.injected.viewState;
        return viewState.getVisibleCache();
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
        for (let disposer of this.disposers) {
            disposer();
        }
        document.removeEventListener('keydown', this.onDocKeyDown);
        this.unbindLanguageChange();
    }

    public componentDidMount() {
        document.addEventListener('keydown', this.onDocKeyDown);
    }

    public componentDidUpdate() {
        const scrollTop = this.state.position === -1 ? this.cache.scrollTop : null;
        const viewState = this.injected.viewState;
        if (!viewState.viewId) {
            console.log('componentDidUpdate', this.state.position, this.cache.scrollTop, scrollTop);
        }

        // edge case: previous saved scrollTop isn't good anymore
        // eg. files have been deleted, or selected item has been renamed,
        // so that using previous scrollTop would hide the selected item
        // if (/*scrollTop !== null && scrollTop > -1*/1) {
        this.tableRef.current.scrollToPosition(this.cache.scrollTop);
        // }
    }

    renderMenuAccelerators() {
        return <Accelerators>
            <Accelerator combo="CmdOrCtrl+A" onClick={this.onSelectAll}></Accelerator>
            <Accelerator combo="rename" onClick={this.getElementAndToggleRename}></Accelerator>
        </Accelerators>;
    }

    renderHotkeys(): React.ReactElement<IHotkeysProps> {
        const { t } = this.props;

        return (<Hotkeys>
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
            {(!isMac || ENV.CY) && (<Hotkey
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
        </Hotkeys>) as React.ReactElement<IHotkeysProps>;
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private installReactions() {
        this.disposers.push(reaction(
            () => toJS(this.cache.files),
            (files: File[]) => {
                const cache = this.cache;
                // when cache is being (re)loaded, cache.files is empty:
                // we don't want to show "empty folder" placeholder
                // that case, only when cache is loaded and there are no files
                if (cache.cmd === 'cwd' || cache.history.length) {
                    this.updateNodes(files);
                }
            }),
            reaction(
                () => this.cache.error,
                () => this.updateNodes(this.cache.files)
            )
        );
    }

    private getSelectedState(name: string) {
        const cache = this.cache;

        return !!cache.selected.find(file => file.fullname === name);
    }

    buildNodeFromFile(file: File, keepSelection: boolean) {
        const filetype = file.type;
        let isSelected = keepSelection && this.getSelectedState(file.fullname) || false;
        const classes = classnames({
            isHidden: file.fullname.startsWith('.'),
            isSymlink: file.isSym
        });

        const res: ITableRow = {
            icon: file.isDir && TYPE_ICONS['dir'] || (filetype && TYPE_ICONS[filetype] || TYPE_ICONS['any']),
            name: file.fullname,
            nodeData: file,
            className: classes,
            isSelected: isSelected,
            size: !file.isDir && formatBytes(file.length) || '--'
        };

        return res;
    }

    private buildNodes = (list: File[], keepSelection = false): ITableRow[] => {
        // console.time('buildingNodes');
        const { sortMethod, sortOrder } = this.cache;
        const SortFn = getSortMethod(sortMethod, sortOrder);
        const dirs = list.filter(file => file.isDir);
        const files = list.filter(file => !file.isDir);

        // if we sort by size, we only sort files by size: folders should still be sorted
        // alphabetically
        const nodes = dirs.sort(sortMethod !== 'size' ? SortFn : getSortMethod('name', 'asc'))
            .concat(files.sort(SortFn))
            .map((file, i) => this.buildNodeFromFile(file, keepSelection));

        // console.timeEnd('buildingNodes');

        return nodes;
    }

    _noRowsRenderer = () => {
        const { t } = this.injected;
        const status = this.cache.status;
        const error = this.cache.error;

        // we don't want to show empty + loader at the same time
        if (status !== 'busy') {
            const placeholder = error && t('COMMON.NO_SUCH_FOLDER') || t('COMMON.EMPTY_FOLDER');
            const icon = error ? 'warning-sign' : 'tick-circle';
            return (<div className="empty"><Icon icon={icon} iconSize={40} />{placeholder}</div>);
        } else {
            return (<div />);
        }
    }

    private updateNodes(files: File[]) {
        // reselect previously selected file in case of reload/change tab
        const keepSelection = !!this.cache.selected.length;

        const nodes = this.buildNodes(files, keepSelection);
        this.updateState(nodes, keepSelection);
    }

    private updateState(nodes: ITableRow[], keepSelection = false) {
        const cache = this.cache;
        const newPath = nodes.length && nodes[0].nodeData.dir || '';
        const position = keepSelection && cache.selectedId ? this.getFilePosition(nodes, cache.selectedId) : -1;

        // cancel inlineedit if there was one
        this.clearEditElement();
        this.setState({ nodes, selected: keepSelection ? this.state.selected : 0, position, path: newPath }, () => {
            if (keepSelection && cache.editingId && position > -1) {
                this.getElementAndToggleRename(undefined, false);
            } else if (this.editingElement) {
                this.editingElement = null;
            }
        });
    }

    getFilePosition(nodes: ITableRow[], id: FileID): number {
        return nodes.findIndex(node => {
            const fileId = node.nodeData.id;
            return fileId && fileId.ino === id.ino && fileId.dev === id.dev
        });
    }

    getRow(index: number): ITableRow {
        return this.state.nodes[index];
    }

    nameRenderer = (data: any) => {
        const iconName = data.rowData.icon;

        return (<div className="name"><Icon icon={iconName}></Icon><span title={data.cellData} className="file-label">{data.cellData}</span></div>);
    }

    /*
    {
        columnData,
        dataKey,
        disableSort,
        label,
        sortBy,
        sortDirection
      }
    */
    headerRenderer = (data: any) => {
        // TOOD: hardcoded for now, should store the column size/list
        // and use it here instead      
        const hasResize = data.columnData.index < 1;
        const { sortMethod, sortOrder } = this.cache;
        const isSort = data.columnData.sortMethod === sortMethod;
        const classes = classnames("sort", sortOrder);

        return (<React.Fragment key={data.dataKey}>
            <div className="ReactVirtualized__Table__headerTruncatedText">
                {data.label}
            </div>
            {isSort && (<div className={classes}>^</div>)}
            {hasResize && (
                <Icon className="resizeHandle" icon="drag-handle-vertical"></Icon>
            )}
        </React.Fragment>);
    }

    rowClassName = (data: any) => {
        const file = this.state.nodes[data.index];
        const error = file && file.nodeData.mode === -1;
        const mainClass = data.index === - 1 ? 'headerRow' : 'tableRow';

        return classnames(mainClass, file && file.className, { selected: file && file.isSelected, error: error, headerRow: data.index === -1 });
    }

    clearClickTimeout() {
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = 0;
        }
    }

    setEditElement(element: HTMLElement, file: File) {
        const cache = this.cache;

        this.editingElement = element;
        this.editingFile = file;

        cache.setEditingFile(file);
    }

    setSort(newMethod: TSORT_METHOD_NAME, newOrder: TSORT_ORDER) {
        this.cache.setSort(newMethod, newOrder);
    }

    /*
    { columnData: any, dataKey: string, event: Event }
    */
    onHeaderClick = ({ columnData, dataKey }: HeaderMouseEventHandlerParams) => {
        const { sortMethod, sortOrder } = this.cache;
        const newMethod = columnData.sortMethod as TSORT_METHOD_NAME;
        const newOrder = sortMethod !== newMethod ? 'asc' : (sortOrder === 'asc' && 'desc' || 'asc') as TSORT_ORDER;
        this.setSort(newMethod, newOrder);
        this.updateNodes(this.cache.files);
    }

    onRowClick = (data: any) => {
        const { rowData, event, index } = data;
        const { nodes, selected } = this.state;
        const originallySelected = rowData.isSelected;
        const file = rowData.nodeData as File;

        // keep a reference to the target before set setTimeout is called
        // because React appaers to recycle the event object after event handler
        // has returned
        const element = event.target as HTMLElement;

        // do not select parent dir pseudo file
        if (this.editingElement === element) {
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
            this.setEditElement(null, null);
        }


        if (rowData.isSelected) {
            newSelected++;
        } else if (originallySelected && newSelected > 0) {
            newSelected--;
        }

        this.setState({ nodes, selected: newSelected, position }, () => {
            this.updateSelection();
        });
    }

    private onInlineEdit(cancel: boolean) {
        const editingElement = this.editingElement;

        if (cancel) {
            // restore previous value
            editingElement.innerText = this.editingFile.fullname;
        } else {
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
        this.setEditElement(null, null);

        editingElement.blur();
        editingElement.removeAttribute('contenteditable');
    }

    updateSelection() {
        const { appState } = this.injected;
        const fileCache = this.cache;
        const { nodes, position } = this.state;

        const selection = nodes.filter((node, i) => i !== position && node.isSelected).map((node) => node.nodeData) as File[];

        if (position > -1) {
            const cursorFile = nodes[position].nodeData as File;
            selection.push(cursorFile);
        }

        appState.updateSelection(fileCache, selection);
    }

    selectLeftPart() {
        const filename = this.editingFile.fullname;
        const selectionRange = getSelectionRange(filename);
        const selection = window.getSelection();
        const range = document.createRange();
        const textNode = this.editingElement.childNodes[0];

        range.setStart(textNode, selectionRange.start);
        range.setEnd(textNode, selectionRange.end);
        selection.empty();
        selection.addRange(range);
    }

    clearContentEditable() {
        if (this.editingElement) {
            this.editingElement.blur();
            this.editingElement.removeAttribute('contenteditable');
        }
    }

    toggleInlineRename(element: HTMLElement, originallySelected: boolean, file: File, selectText = true) {
        if (!file.readonly) {
            if (originallySelected) {
                element.contentEditable = "true";
                element.focus();
                this.setEditElement(element, file);
                selectText && this.selectLeftPart();
                element.onblur = () => {
                    if (this.editingElement) {
                        this.onInlineEdit(true);
                    }
                }
            } else {
                // clear rename
                this.clearContentEditable();
                this.setEditElement(null, null);
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
                await this.cache.openFile(appState, this.cache, file);
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

    unSelectAll() {
        const { nodes } = this.state;
        const selectedNodes = nodes.filter(node => node.isSelected);

        if (selectedNodes.length && this.isViewActive()) {
            selectedNodes.forEach(node => { node.isSelected = false })
            this.setState({ nodes, selected: 0, position: -1 }, () => {
                this.updateSelection();
            });
        }
    }

    selectAll(invert = false) {
        let { position, selected } = this.state;
        const { nodes } = this.state;

        if (nodes.length && this.isViewActive()) {
            selected = 0;
            position = -1;

            let i = 0;
            for (let node of nodes) {
                node.isSelected = invert ? !node.isSelected : true;
                if (node.isSelected) {
                    position = i;
                    selected++;
                }
                i++;
            }

            this.setState({ nodes, selected, position }, () => {
                this.updateSelection();
            });
        }
    }

    onOpenFile = (e: KeyboardEvent) => {
        const { position, nodes } = this.state;

        if (this.isViewActive() && position > -1) {
            const file = nodes[position].nodeData as File;
            this.openFileOrDirectory(file, e);
        }
    }

    onSelectAll = () => {
        const isOverlayOpen = document.body.classList.contains('bp3-overlay-open');
        if (!isOverlayOpen && !isEditable(document.activeElement)) {
            this.selectAll();
        } else {
            // need to select all text: send message
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
                this.onInlineEdit(e.keyCode === KEYS.Escape);
            }
        }
    }

    getNodeContentElement(position: number): HTMLElement {
        const selector = `[aria-rowindex="${position}"]`;
        return this.gridElement.querySelector(selector);
    }

    clearEditElement() {
        const selector = `[aria-rowindex] [contenteditable]`;
        const element = this.gridElement.querySelector(selector) as HTMLElement;
        if (element) {
            element.onblur = null;
            element.removeAttribute('contenteditable');
        }
    }

    isViewActive(): boolean {
        const { viewState } = this.injected;
        return viewState.isActive && !this.props.hide;
    }

    getElementAndToggleRename = (e?: KeyboardEvent | string, selectText = true) => {
        if (this.state.selected > 0) {
            const { position, nodes } = this.state;
            const node = nodes[position];
            const file = nodes[position].nodeData as File;
            const element = this.getNodeContentElement(position + 1);
            const span: HTMLElement = element.querySelector(`.${LABEL_CLASSNAME}`);

            if (e && typeof e !== 'string') {
                e.preventDefault();
            }
            this.toggleInlineRename(span, node.isSelected, file, selectText);
        }
    }

    scrollPage = throttle((up: boolean) => {
        const table = this.tableRef.current;
        const props = this.tableRef.current.props;
        const headerHeight = props.disableHeader ? 0 : props.headerHeight;
        const scrollTop = this.cache.scrollTop;
        // TODO: props.rowHeight may be a function
        const rowHeight = props.rowHeight as number;
        const maxHeight = this.state.nodes.length * rowHeight - (props.height - headerHeight);

        let newScrollTop = 0;

        if (!up) {
            newScrollTop = scrollTop + (props.height - headerHeight);
            if (newScrollTop > maxHeight) {
                newScrollTop = maxHeight;
            }
        } else {
            newScrollTop = scrollTop - (props.height - headerHeight);
            if (newScrollTop < 0) {
                newScrollTop = 0;
            }
        }

        table.scrollToPosition(newScrollTop);
    }, ARROW_KEYS_REPEAT_DELAY)

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

            case KEYS.PageDown:
            case KEYS.PageUp:
                this.scrollPage(e.keyCode === KEYS.PageUp);
                break;

            case KEYS.Backspace:
                if (!this.editingElement && !this.cache.isRoot()) {
                    this.cache.openParentDirectory();
                }
                break;
        }
    }

    moveSelection = throttle((step: number, isShiftDown: boolean) => {
        let { position, selected } = this.state;
        let { nodes } = this.state;

        position += step;

        if (position > -1 && position <= this.state.nodes.length - 1) {
            if (isShiftDown) {
                selected++;
            } else {
                // unselect previous one
                nodes.forEach(n => (n.isSelected = false));
                selected = 1;
            }

            nodes[position].isSelected = true;

            // move in method to reuse
            this.setState({ nodes, selected, position }, () => {
                this.updateSelection();
                // test
                this.tableRef.current.scrollToRow(position);
            });
        }
    }, ARROW_KEYS_REPEAT_DELAY)

    setGridRef = (element: HTMLElement) => {
        this.gridElement = element && element.querySelector(`.${GRID_CLASSNAME}`) || null;
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

    onScroll = debounce(({ scrollTop }: any) => {
        this.cache.scrollTop = scrollTop;
        // console.log('onScroll: updating scrollTop', scrollTop, this.cache.path);
    }, SCROLL_DEBOUNCE);

    rowGetter = (index: Index) => this.getRow(index.index);

    onBlankAreaClick = (e:React.MouseEvent<HTMLElement>) => {
        if (e.target === this.gridElement) {
            this.unSelectAll()
        }
    }

    render() {
        const { t } = this.injected;
        const { position } = this.state;
        const rowCount = this.state.nodes.length;
        const GRID_CLASSES = `data-cy-filetable ${GRID_CLASSNAME} ${CONFIG.CUSTOM_SCROLLBAR_CLASSNAME}`

        return (<div ref={this.setGridRef} onClick={this.onBlankAreaClick} onKeyDown={this.onInputKeyDown} className={`fileListSizerWrapper`}>
            <AutoSizer>
                {({ width, height }) => (
                    <Table
                        headerClassName="tableHeader"
                        headerHeight={ROW_HEIGHT}
                        height={height}
                        gridClassName={GRID_CLASSES}
                        onRowClick={this.onRowClick}
                        onRowDoubleClick={this.onRowDoubleClick}
                        onHeaderClick={this.onHeaderClick}
                        noRowsRenderer={this._noRowsRenderer}
                        rowClassName={this.rowClassName}
                        rowHeight={ROW_HEIGHT}
                        rowGetter={this.rowGetter}
                        rowCount={rowCount}
                        // scrollToIndex={position < 0 ? undefined : position}
                        onScroll={this.onScroll}
                        rowRenderer={this.rowRenderer}
                        ref={this.tableRef}
                        width={width}>
                        <Column
                            dataKey="name"
                            label={t('FILETABLE.COL_NAME')}
                            cellRenderer={this.nameRenderer}
                            headerRenderer={this.headerRenderer}
                            width={NAME_COLUMN_WIDTH}
                            flexGrow={1}
                            columnData={{ 'index': 0, sortMethod: 'name' }}
                        />
                        <Column
                            className="size bp3-text-small"
                            width={SIZE_COLUMN_WITDH}
                            label={t('FILETABLE.COL_SIZE')}
                            headerRenderer={this.headerRenderer}
                            dataKey="size"
                            flexShrink={1}
                            columnData={{ 'index': 1, sortMethod: 'size' }}
                        />
                    </Table>
                )
                }
            </AutoSizer></div>);
    }
}

const FileTable = withNamespaces()(FileTableClass);

export { FileTable };
