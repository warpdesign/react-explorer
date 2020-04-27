import * as React from "react";
import { inject, Provider, observer } from 'mobx-react';
import { Toolbar } from './Toolbar';
import { Statusbar } from './Statusbar';
import { AppState } from "../state/appState";
import { LoginDialog } from "./dialogs/LoginDialog";
import { Loader } from "./Loader";
import { FileTable } from "./FileTable";
import classnames from 'classnames';
import { DropTargetSpec, DropTargetConnector, DropTargetMonitor, DropTargetCollector, ConnectDropTarget, DropTarget } from "react-dnd";
import { TabList } from "./TabList";
import { ViewState } from "../state/viewState";
import { AppToaster } from "./AppToaster";
import { Intent } from "@blueprintjs/core";
import { getLocalizedError } from "../locale/error";
import { withNamespaces, WithNamespaces } from "react-i18next";
import { LocalApi } from "../services/plugins/FsLocal";

interface SideViewProps extends WithNamespaces {
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
        return props.viewState.viewId !== sourceViewId && fileCache.status !== 'busy' && !fileCache.error;
    },
    drop(props, monitor, component) {
        const item = monitor.getItem();
        const sideView = component.wrappedInstance;
        sideView.onDrop(item);
    }
};

const collect: DropTargetCollector<any, any> = (connect: DropTargetConnector, monitor: DropTargetMonitor) => {
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
            inactive: !active,
            hidden: this.props.hide,
            dropTarget: dropAndOver,
            notDropTarget: isOver && !canDrop
        });

        const needLogin = fileCache.status === 'login';
        const busy = fileCache.status === 'busy';
        // console.log('renderSideView, needLogin=', needLogin);

        if (dropAndOver) {
            // console.log('isOver', viewState.viewId);
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

    onDrop(item: any /* DraggedObject | DataTransfer */) {
        console.log('onDrop');
        const appState = this.injected.appState;
        const { viewState } = this.props;
        const fileCache = viewState.getVisibleCache();
        // TODO: build files from native urls
        const files = item.fileState ? item.dragFiles : item.files.map((webFile: any) => LocalApi.fileFromPath(webFile.path));

        // TODO: check both cache are active?
        appState.prepareTransferTo(item.fileState, fileCache, files)
            .then((noErrors: any) => {
                const { t } = this.injected;
                if (noErrors) {
                    AppToaster.show({
                        message: t('COMMON.COPY_FINISHED'),
                        icon: "tick",
                        intent: Intent.SUCCESS,
                        timeout: 3000
                    });
                } else {
                    AppToaster.show({
                        message: t('COMMON.COPY_WARNING'),
                        icon: "warning-sign",
                        intent: Intent.WARNING,
                        timeout: 5000
                    });
                }
            })
            .catch((err: any) => {
                const { t } = this.injected;
                const localizedError = getLocalizedError(err);
                const message = err.code ? t('ERRORS.COPY_ERROR', { message: localizedError.message }) : t('ERRORS.COPY_UNKNOWN_ERROR');

                AppToaster.show({
                    message: message,
                    icon: "error",
                    intent: Intent.DANGER,
                    timeout: 5000
                });
            });
    }

    shouldComponentUpdate() {
        const { viewState } = this.props;
        // console.time('SideView Render' + viewState.viewId);
        return true;
    }

    componentDidUpdate() {
        const { viewState } = this.props;
        // console.timeEnd('SideView Render' + viewState.viewId);
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

const SideViewDD = DropTarget<InjectedProps>('file', fileTarget, collect)(SideViewClass);

const SideView = withNamespaces()(SideViewDD);

export { SideView };
