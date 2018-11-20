import * as React from "react";
import { inject, Provider, observer } from 'mobx-react';
import { Toolbar } from './Toolbar';
import { Statusbar } from './Statusbar';
import { FileList } from './FileList';
import { AppState } from "../state/appState";
import { LoginDialog } from "./LoginDialog";
import { FileState } from "../state/fileState";
import { HotkeysTarget, Hotkeys, Hotkey, Intent } from "@blueprintjs/core";
import { AppToaster } from "./AppToaster";

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

    constructor(props:SideViewProps) {
        super(props);

        const { appState } = this.injected;
        const cache: FileState = appState.addCache('/tmp/react-explorer');

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

    private onPaste = () => {
        const { hide, active } = this.props;

        if (active && !hide) {
            const { appState } = this.injected;
            const { fileCache } = this.state;

            appState.prepareTransfer(fileCache);
        }
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
        </Hotkeys>;
    }

    renderSideView() {
        const { fileCache } = this.state;
        const { active } = this.props;

        const activeClass = active && ' active' || '';
        const needLogin = fileCache.status === 'login';

        if (!this.props.hide) {
            return (<div id={this.viewId} className={`sideview${activeClass}`}>
                {needLogin && <LoginDialog isOpen={needLogin} onValidation={this.onValidation} onClose={this.onClose} />}
                <Toolbar />
                <FileList />
                <Statusbar />
            </div>);
        } else {
            return (<div />);
        }
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