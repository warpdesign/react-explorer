import * as React from "react";
import { inject, Provider, observer } from 'mobx-react';
import { Toolbar } from './Toolbar';
import { Statusbar } from './Statusbar';
import { FileList } from './FileList';
import { AppState } from "../state/appState";
import { LoginDialog } from "./LoginDialog";
import { FileState } from "../state/fileState";
import { HotkeysTarget, Hotkeys, Hotkey, Intent } from "@blueprintjs/core";
import * as process from 'process';
import { remote } from 'electron';
import { AppToaster } from "./AppToaster";
import { Loader } from "./Loader";

interface SideViewProps {
    hide: boolean;
    active: boolean;
}

interface InjectedProps extends SideViewProps{
    appState: AppState;
}

interface SideViewState{
    fileCache: FileState;
}

@inject('appState')
@HotkeysTarget
@observer
export class SideView extends React.Component<SideViewProps, SideViewState>{
    static id = 0;
    viewId = 'view_' + SideView.id++;

    static defaultProps = {
        active: false
    }

    private fileListBusy = false;

    constructor(props:SideViewProps) {
        super(props);

        const { appState } = this.injected;
        const cache: FileState = appState.addCache(process.platform === "win32" ? remote.app.getPath('temp') : '/tmp/react-explorer');

        this.state = {
            fileCache: cache
        };
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private onValidation = (dir:string):boolean => {
        return true;
    }

    private onClose = () => {
        // login cancelled
        const { fileCache } = this.state;
        // doesn't work: it keeps the previous fs
        fileCache.revertPath();
    }

    private onCopy = () => {
        const { hide, active } = this.props;

        if (active && !hide) {
            const { appState } = this.injected;
            const { fileCache } = this.state;

            const num = appState.setClipboard(fileCache);

            AppToaster.show({
                message: `${num} element(s) copied to the clipboard`,
                icon: "tick",
                intent: Intent.SUCCESS
            });
        }
    }

    private onPaste = ():void => {
        const { hide, active } = this.props;

        if (active && !hide) {
            console.log('** onpaste');
            const { appState } = this.injected;
            const { fileCache } = this.state;

            appState.prepareClipboardTransferTo(fileCache);
        }
    }

    private onExit = (): void => {
        console.log('need to handle exit !');
    }

    public renderHotkeys() {
        return <Hotkeys>
            <Hotkey
                global={true}
                combo="meta + c"
                label="Copy selected files to clipboard"
                onKeyDown={this.onCopy}
            />
            <Hotkey
                global={true}
                combo="meta + v"
                label="Paste selected files into current folder"
                onKeyDown={this.onPaste}
            />
            <Hotkey
                global={true}
                combo="meta + q"
                label="Exits React FTP"
                onKeyDown={this.onExit}
                preventDefault={true}
                stopPropagation={true}
            />
        </Hotkeys>;
    }

    onFileRender = () => {
        // console.log('rendering filelist');
        // console.time('rendering filelist');
        this.fileListBusy = true;
    }

    onFileUpdate = () => {
        // console.timeEnd('rendering filelist');
        this.fileListBusy = false;
    }

    renderSideView() {
        const { fileCache } = this.state;
        const { active } = this.props;

        const activeClass = active && ' active' || '';
        const needLogin = fileCache.status === 'login';
        // Blueprint's Tree (or React ?) seems to take a long time rendering
        // the Tree object (1-2secs is needed for a directory of 700 files)
        // so we make sure to keep the loader while the render is in progress
        const busy = fileCache.status === 'busy' || this.fileListBusy;

        if (!this.props.hide) {
            return (
                <div id={this.viewId} className={`sideview${activeClass}`}>
                    {needLogin && <LoginDialog isOpen={needLogin} onValidation={this.onValidation} onClose={this.onClose} />}
                    <Toolbar onPaste={this.onPaste} />
                    <FileList onRender={this.onFileRender} onUpdate={this.onFileUpdate} />
                    <Statusbar />
                    <Loader active={busy}></Loader>
                </div>
            );
        } else {
            return (<div />);
        }
    }

    shouldComponentUpdate() {
        console.time('SideView Render');
        return true;
    }

    componentDidUpdate() {
        console.timeEnd('SideView Render');
    }

    render() {

        const { fileCache } = this.state;

        return (
            <Provider fileCache={fileCache}>
                {this.renderSideView()}
            </Provider>
        );
    }
}