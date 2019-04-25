import * as React from "react";
import { observer, inject } from 'mobx-react';
import { InputGroup, ControlGroup, Button, ButtonGroup, Popover, Intent, Alert, ProgressBar, Classes, Tooltip, IconName } from '@blueprintjs/core';
import { AppState } from "../state/appState";
import { AppToaster } from "./AppToaster";
import { withNamespaces, WithNamespaces } from 'react-i18next';
import classnames from 'classnames';
import { ViewState } from "../state/viewState";

interface IProps extends WithNamespaces {

};

interface InjectedProps extends IProps {
    viewState: ViewState;
    appState: AppState
}

@inject('viewState', 'appState')
@observer
export class StatusbarClass extends React.Component<IProps> {
    constructor(props: IProps) {
        super(props);
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private onClipboardCopy = () => {
        const { appState, viewState } = this.injected;
        const { t } = this.props;

        const num = appState.setClipboard(viewState.getVisibleCache());

        AppToaster.show({
            message: t('COMMON.CP_COPIED', { count: num }),
            icon: "tick",
            intent: Intent.NONE
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
        const { viewState } = this.injected;
        const fileCache = viewState.getVisibleCache();
        const disabled = !fileCache.selected.length;
        const numDirs = fileCache.files.filter((file) => file.fullname !== '..' && file.isDir).length;
        const numFiles = fileCache.files.filter((file) => !file.isDir).length;
        const numSelected = fileCache.selected.length;
        const iconName = fileCache.getFS().icon as IconName;
        const offline = classnames('status-bar', { offline: fileCache.status === 'offline' });
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
                    className={offline}
                />
            </ControlGroup>
        )
    }
}

const Statusbar = withNamespaces()(StatusbarClass);

export { Statusbar };
