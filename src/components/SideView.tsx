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

import { ItemTypes } from './DragLayer';
import { cpus } from "os";

interface SideViewProps {
    hide: boolean;
    fileCache: FileState;
    onPaste: () => void;
    connectDropTarget?: ConnectDropTarget;
    isOver?: boolean;
    canDrop?: boolean;
}

interface InjectedProps extends SideViewProps{
    appState?: AppState;
}

const fileTarget: DropTargetSpec<InjectedProps> = {
    canDrop(props: InjectedProps) {
        // prevent drag and drop in same sideview for now
        return !props.fileCache.active && props.fileCache.status !== 'busy';
    },
    drop(props, monitor, component) {
        debugger;
        console.log('dropped element', props);
    }
};

const collect: DropTargetCollector<any> = (connect:DropTargetConnector, monitor:DropTargetMonitor) => {
    return {
        connectDropTarget: connect.dropTarget(),
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop()
    };
}

let id = 0;

@inject('appState')
@observer
export class SideViewClass extends React.Component<InjectedProps>{
    // static id = 0;
    viewId = 'view_' + id++;

    constructor(props:InjectedProps) {
        super(props);
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private onValidation = (dir:string):boolean => {
        return true;
    }

    private onClose = () => {
        // login cancelled
        const { fileCache } = this.props;
        // doesn't work: it keeps the previous fs
        fileCache.revertPath();
    }

    renderSideView() {
        const { fileCache, connectDropTarget } = this.props;
        const active = fileCache.active;

        let activeClass = classnames('sideview', { active: active, hidden: this.props.hide });

        const needLogin = fileCache.status === 'login';
        const busy = fileCache.status === 'busy';

        if (this.props.canDrop && this.props.isOver) {
            console.log('isOver', this.viewId);
        }

        return (
            connectDropTarget(
                <div id={this.viewId} className={activeClass}>
                    {needLogin && <LoginDialog isOpen={needLogin} onValidation={this.onValidation} onClose={this.onClose} />}
                    <Toolbar active={active && !busy} onPaste={this.props.onPaste} />
                    <FileTable hide={this.props.hide}/>
                    <Statusbar />
                    <Loader active={busy}></Loader>
            </div>)
        );
    }

    shouldComponentUpdate() {
        console.time('SideView Render' + this.viewId);
        return true;
    }

    componentDidUpdate() {
        console.timeEnd('SideView Render' + this.viewId);
    }

    render() {

        const { fileCache } = this.props;

        return (
            <Provider fileCache={fileCache}>
                {this.renderSideView()}
            </Provider>
        );
    }
}

export const SideView = DropTarget<InjectedProps>(ItemTypes.FILE, fileTarget, collect)(SideViewClass);
