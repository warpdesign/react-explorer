import * as React from "react";
import { observer, inject } from 'mobx-react';
import { InputGroup, ControlGroup, Button, ButtonGroup, Popover, Intent, Alert, ProgressBar, Classes, Tooltip } from '@blueprintjs/core';
import { Directory } from "../services/Fs";

interface InjectedProps {
    fileCache: Directory;
}

@inject('fileCache')
@observer
export class Statusbar extends React.Component {
    private input: HTMLInputElement | null = null;

    constructor(props: any) {
        super(props);
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private refHandler = (input: HTMLInputElement) => {
        this.input = input;
    }

    public render() {
        const { fileCache } = this.injected;
        const disabled = !fileCache.selected.length;
        const numFiles = fileCache.files.length;
        const numSelected = fileCache.selected.length;

        const pasteButton = (
            <Tooltip content={`Copy ${numSelected} file(s) to the clipboard`} disabled={disabled}>
            <Button
                disabled={disabled}
                icon="duplicate"
                intent={!disabled && Intent.PRIMARY || Intent.NONE}
                minimal={true}
            />
        </Tooltip>);

        return (
            <ControlGroup>
                <InputGroup
                        disabled
                        leftIcon="home"
                        rightElement={pasteButton}
                        value={`${numFiles} File(s)`}
                        inputRef={this.refHandler}
                />
            </ControlGroup>
        )
    }
}