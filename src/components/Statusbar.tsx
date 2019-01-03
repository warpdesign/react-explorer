import * as React from "react";
import { observer, inject } from 'mobx-react';
import { InputGroup, ControlGroup, Button, ButtonGroup, Popover, Intent, Alert, ProgressBar, Classes, Tooltip, IconName } from '@blueprintjs/core';
import { AppState } from "../state/appState";
import { AppToaster } from "./AppToaster";
import { FileState } from "../state/fileState";
import { withNamespaces, WithNamespaces } from 'react-i18next';

interface IProps extends WithNamespaces{

};

interface InjectedProps extends IProps {
    fileCache: FileState;
    appState: AppState
}

@inject('fileCache', 'appState')
@observer
export class StatusbarClass extends React.Component<IProps> {
    constructor(props: IProps) {
        super(props);
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private onClipboardCopy = () => {
        const { fileCache, appState } = this.injected;
        const { t } = this.props;

        const num = appState.setClipboard(fileCache);

        AppToaster.show({
            message: t('COMMON.CP_COPIED', {count: num}),
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
        const iconName = fileCache.getFS().icon as IconName;
        const offline = fileCache.status === 'offline' && 'offline' || '';
        const { t } = this.props;

        const pasteButton = (
            <Tooltip content={t('STATUS.CPTOOLTIP', { count: numSelected })} disabled={disabled}>
                <Button
                data-cy-paste-bt
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
                    leftIcon={iconName}
                    rightElement={pasteButton}
                    value={`${t('STATUS.FILES', { count: numFiles })}, ${t('STATUS.FOLDERS', { count: numDirs })}`}
                    className={`status-bar ${offline}`}
                />
            </ControlGroup>
        )
    }
}

const Statusbar = withNamespaces()(StatusbarClass);

export { Statusbar };