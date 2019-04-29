import * as React from "react";
import { inject, Provider, observer } from 'mobx-react';
import { Toolbar } from './Toolbar';
import { Statusbar } from './Statusbar';
import { AppState } from "../state/appState";
import { LoginDialog } from "./dialogs/LoginDialog";
import { FileState } from "../state/fileState";
import { Loader } from "./Loader";
import { FileTable } from "./FileTable";
import classnames from 'classnames';
import { DropTargetSpec, DropTargetConnector, DropTargetMonitor, DropTargetCollector, ConnectDropTarget, DropTarget } from "react-dnd";
import { DraggedObject } from './RowRenderer';
import { TabList } from "./TabList";
import { ViewState } from "../state/viewState";

interface SideViewProps {
    hide: boolean;
    viewState: ViewState;
    onPaste: () => void;
    connectDropTarget?: ConnectDropTarget;
    isOver?: boolean;
    canDrop?: boolean;
}

interface InjectedProps extends SideViewProps {
    appState?: AppState;
}

const fileTarget: DropTargetSpec<InjectedProps> = {
    canDrop(props: InjectedProps, monitor) {
        // prevent drag and drop in same sideview for now
        const sourceViewId = monitor.getItem().fileState.viewId;
        const viewState = props.viewState;
        const fileCache = viewState.getVisibleCache();
        return props.viewState.viewId !== sourceViewId && fileCache.status !== 'busy';
    },
    drop(props, monitor, component) {
        const item = monitor.getItem();
        const sideView = component.wrappedInstance;
        sideView.onDrop(item);
    }
};

const collect: DropTargetCollector<any> = (connect: DropTargetConnector, monitor: DropTargetMonitor) => {
    return {
        connectDropTarget: connect.dropTarget(),
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop()
    };
}

@inject('appState')
@observer
export class SideViewClass extends React.Component<InjectedProps>{
    constructor(props: InjectedProps) {
        super(props);
        // TODO: get view
        // this.view = appState.createView(this.viewId);
        // TODO: add tabs ??
    }

    get injected() {
        return this.props as InjectedProps;
    }

    onValidation = (dir: string): boolean => {
        return true;
    }

    onClose = () => {
        // login cancelled
        const { viewState } = this.props;
        const fileCache = viewState.getVisibleCache();
        // doesn't work: it keeps the previous fs
        fileCache.revertPath();
    }

    renderSideView() {
        const { viewState, connectDropTarget, canDrop, isOver } = this.props;
        const fileCache = viewState.getVisibleCache();
        const appState = this.injected.appState;
        const active = appState.getViewFromCache(fileCache).isActive;
        //  fileCache.active;
        const dropAndOver = isOver && canDrop;
        const divId = 'view_' + viewState.viewId;

        let activeClass = classnames('sideview', {
            active: active,
            hidden: this.props.hide,
            dropTarget: dropAndOver,
            notDropTarget: isOver && !canDrop
        });

        const needLogin = fileCache.status === 'login';
        const busy = fileCache.status === 'busy';
        console.log('renderSideView, needLogin=', needLogin);

        if (dropAndOver) {
            console.log('isOver', viewState.viewId);
        }

        return (
            connectDropTarget(
                <div id={divId} className={activeClass}>
                    {needLogin && <LoginDialog isOpen={needLogin} onValidation={this.onValidation} onClose={this.onClose} />}
                    <TabList></TabList>
                    <Toolbar active={active && !busy} onPaste={this.props.onPaste} />
                    <FileTable hide={this.props.hide} />
                    <Statusbar />
                    <Loader active={busy}></Loader>
                </div>)
        );
    }

    onDrop(item: DraggedObject) {
        const appState = this.injected.appState;
        const { viewState } = this.props;
        const fileCache = viewState.getVisibleCache();
        const files = item.selectedCount > 0 ? item.fileState.selected.slice(0) : [item.dragFile];

        // TODO: check both cache are active?
        appState.prepareTransferTo(item.fileState, fileCache, files);
    }

    shouldComponentUpdate() {
        const { viewState } = this.props;
        console.time('SideView Render' + viewState.viewId);
        return true;
    }

    componentDidUpdate() {
        const { viewState } = this.props;
        console.timeEnd('SideView Render' + viewState.viewId);
    }

    render() {

        const { viewState } = this.props;

        return (
            <Provider viewState={viewState}>
                {this.renderSideView()}
            </Provider>
        );
    }
}

export const SideView = DropTarget<InjectedProps>('file', fileTarget, collect)(SideViewClass);
