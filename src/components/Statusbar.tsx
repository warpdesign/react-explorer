import * as React from "react";
import { observer, inject } from 'mobx-react';
import { InputGroup, ControlGroup, Button, ButtonGroup, Popover, Intent, Alert, ProgressBar, Classes, Tooltip } from '@blueprintjs/core';
import { AppState } from "../state/appState";
import { AppToaster } from "./AppToaster";
import { FileState } from "../state/fileState";

interface InjectedProps {
    fileCache: FileState;
    appState: AppState
}

@inject('fileCache', 'appState')
@observer
export class Statusbar extends React.Component {
    constructor(props: any) {
        super(props);
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private onClipboardCopy = () => {
        const { fileCache, appState } = this.injected;

        const num = appState.setClipboard(fileCache);

        AppToaster.show({
            message: `${num} element(s) copied to the clipboard`,
            icon: "tick",
            intent: Intent.SUCCESS
        });
    }

    // shouldComponentUpdate() {
    //     console.time('Statusbar Render');
    //     return true;
    // }

    // componentDidUpdate() {
    //     console.timeEnd('Statusbar Render');
    // }

    public render() {
        const { fileCache } = this.injected;
        const disabled = !fileCache.selected.length;
        const numDirs = fileCache.files.filter((file) => file.fullname !== '..' && file.isDir).length;
        const numFiles = fileCache.files.filter((file) => !file.isDir).length;
        const numSelected = fileCache.selected.length;

        const pasteButton = (
            <Tooltip content={`Copy ${numSelected} file(s) to the clipboard`} disabled={disabled}>
            <Button
                disabled={disabled}
                icon="clipboard"
                intent={!disabled && Intent.PRIMARY || Intent.NONE}
                onClick={this.onClipboardCopy}
                minimal={true}
            />
        </Tooltip>);

        return (
            <ControlGroup>
                <InputGroup
                        disabled
                        leftIcon="database"
                        rightElement={pasteButton}
                        value={`${numFiles} File(s), ${numDirs} Folder(s)`}
                />
            </ControlGroup>
        )
    }
}