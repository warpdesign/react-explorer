import * as React from "react";
import { reaction, IReactionDisposer } from 'mobx';
import { inject, observer } from 'mobx-react';
import { InputGroup, ControlGroup, Button, ButtonGroup, Popover, Intent, Alert, ProgressBar, Classes, HotkeysTarget, Hotkeys, Hotkey, Tooltip, Position } from '@blueprintjs/core';
import { AppState } from "../state/appState";
import { FileMenu } from "./FileMenu";
import { MakedirDialog } from "./dialogs/MakedirDialog";
import { AppAlert } from './AppAlert';
import { Logger } from "./Log";
import { AppToaster, IToasterOpts } from "./AppToaster";
import { FileState } from "../state/fileState";
import { withNamespaces, WithNamespaces } from "react-i18next";

interface IProps extends WithNamespaces {
    onPaste: () => void;
    active: boolean;
}

interface InjectedProps extends IProps {
    appState: AppState;
    fileCache: FileState;
}

interface PathInputState {
    status: -1 | 0 | 1;
    path: string;
    isOpen: boolean;
    isDeleteOpen: boolean;
}

enum KEYS {
    Escape = 27,
    Enter = 13
};

@inject('appState', 'fileCache')
@HotkeysTarget
@observer
export class ToolbarClass extends React.Component<IProps, PathInputState> {
    private cache: FileState;
    private input: HTMLInputElement | null = null;
    private disposer: IReactionDisposer;

    constructor(props: any) {
        super(props);

        const { fileCache } = this.injected;

        this.state = {
            status: 0,
            path: fileCache.path,
            isOpen: false,
            isDeleteOpen: false
        };

        this.cache = fileCache;

        this.installReactions();
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    // reset status once path has been modified from outside this component
    private installReactions() {
        this.disposer = reaction(
            () => { return this.cache.path },
            path => {
                this.setState({ path, status: 0 });
            }
        );
    }

    private onBackward = (event: React.FormEvent<HTMLElement>) => {
        console.log(this.cache.history);
        this.cache.navHistory(-1);
    }

    private onForward = (event: React.FormEvent<HTMLElement>) => {
        console.log(this.cache.history);
        this.cache.navHistory(1);
    }

    private onPathChange = (event: React.FormEvent<HTMLElement>) => {
        const path = (event.target as HTMLInputElement).value;
        this.setState({ path });
        // this.checkPath(event);
    }

    private onSubmit = () => {
        if (this.cache.path !== this.state.path) {
            this.input.blur();
            const path = this.state.path;
            this.cache.cd(this.state.path)
                .catch((err: any) => {
                    AppAlert.show(`${err.message} (${err.code})`, {
                        intent: 'danger'
                    }).then(() => {
                        // we restore the wrong path entered and focus the input:
                        // in case the user made a simple typo he doesn't want
                        // to type it again
                        this.setState({ path });
                        this.input.focus();
                    });
                });
        }
    }

    private onKeyUp = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.keyCode === KEYS.Escape) {
            // since React events are attached to the root document
            // event already has bubbled up so we must stop
            // its immediate propagation
            event.nativeEvent.stopImmediatePropagation();
            // lose focus
            this.input.blur();
            // workaround for Cypress bug https://github.com/cypress-io/cypress/issues/1176
            // this.onBlur();
        } else if (event.keyCode === KEYS.Enter) {
            this.onSubmit();
        }
    }

    private onBlur = () => {
        console.log('onblur');
        this.setState({ path: this.cache.path, status: 0 });
    }

    private onReload = () => {
        this.cache.reload();
    }

    private refHandler = (input: HTMLInputElement) => {
        this.input = input;
    }

    private makedir = async (dirName: string, navigate: boolean) => {
        this.setState({isOpen: false});
        Logger.log('yo! lets create a directory :)', dirName, navigate);
        try {
            const dir = await this.cache.makedir(this.state.path, dirName);

            if (!navigate) {
                this.cache.reload();
            } else {
                this.cache.cd(dir);
            }
        } catch(err) {
            AppToaster.show({
                message: `Error creating folder: ${err}`,
                icon: 'error',
                intent: Intent.DANGER,
                timeout: 4000
            });
        }
    }

    private deleteCancel = () => {
        this.setState({ isDeleteOpen: false });
    }

    private delete = async () => {
        Logger.log('delete selected files');
        try {
            const { fileCache } = this.injected;

            await this.cache.delete(this.state.path, fileCache.selected);
            console.log('need to refresh cache');
            this.cache.reload();
            // appState.refreshCache(this.cache);
        } catch(err) {
            AppToaster.show({
                message: `Error deleting files: ${err}`,
                icon: 'error',
                intent: Intent.DANGER,
                timeout: 4000
            });
        }

        this.setState({ isDeleteOpen: false });
    }

    private renderCopyProgress(percent: number): IToasterOpts {
            return {
            icon: "cloud-upload",
            message: (
                <ProgressBar
                    className={percent >= 100 && Classes.PROGRESS_NO_STRIPES}
                    intent={percent < 100 ? Intent.PRIMARY : Intent.SUCCESS}
                    value={percent / 100}
                />
            ),
            timeout: percent < 100 ? 0 : 2000
        }
    }


    private copy = async () => {
        // TODO: attempt to copy
        const { appState, fileCache } = this.injected;
        appState.prepareClipboardTransferTo(fileCache);
    }

    private onMakedir = () => {
        const { appState, fileCache } = this.injected;

        if (appState.getActiveCache() === fileCache) {
            this.setState({ isOpen: true });
        }
    }

    private onDelete = () => {
        const { appState, fileCache } = this.injected;

        if (appState.getActiveCache() === fileCache) {
            this.setState({ isDeleteOpen: true });
        }
    }

    private onFileAction = (action: string) => {
        switch(action) {
            case 'makedir':
                Logger.log('Opening new folder dialog');
                this.onMakedir();
                break;

            case 'delete':
                this.onDelete();
                break;

            case 'paste':
                this.props.onPaste();
                break;

            default:
                Logger.warn('action unknown', action);
        }
    }

    public onActivatePath = () => {
        console.log('shortcut');
        if (this.props.active) {
            console.log('isactive');
            this.input.focus();
        } else {
            console.log('not active');
        }
    }

    public onFocus = () => {
        this.input.select();
    }

    public componentWillUnmount() {
        this.disposer();
    }

    // shouldComponentUpdate() {
    //     console.time('Toolbar Render');
    //     return true;
    // }

    // componentDidUpdate() {
    //     console.timeEnd('Toolbar Render');
    // }

    public renderHotkeys() {
        const { t } = this.props;

        return <Hotkeys>
            <Hotkey
                global={true}
                combo="mod+l"
                label={t('SHORTCUT.ACTIVE_VIEW.FOCUS_PATH')}
                onKeyDown={this.onActivatePath}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}
            />
            <Hotkey
                global={true}
                combo="mod+n"
                label={t('COMMON.MAKEDIR')}
                onKeyDown={this.onMakedir}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}
            />
            <Hotkey
                global={true}
                combo="mod+d"
                label={t('SHORTCUT.ACTIVE_VIEW.DELETE')}
                onKeyDown={this.onDelete}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}
            />
        </Hotkeys>;
    }

    private renderTooltip() {
        return (
            <div>
                <p>
                    Enter any local or <em>remote</em> path to show its content.<br /><br />
                Supported types:
                </p>
                <ul>
                    <li>/Users/nico/</li>
                    <li>ftp://ftp.foo.net</li>
                    <li>ftp://user@pass:ftp.foo.net:21</li>
                </ul>
            </div>
        )
    }

    public render() {
        const { status, path, isOpen, isDeleteOpen } = this.state;
        const { fileCache } = this.injected;
        const { selected, history, current } = fileCache;

        const canGoBackward = current > 0;
        const canGoForward = history.length > 1 && current < history.length - 1;
        // const loadingSpinner = false ? <Spinner size={Icon.SIZE_STANDARD} /> : undefined;
        const reloadButton = <Button className="small" onClick={this.onReload} minimal rightIcon="repeat"></Button>;
        const intent = status === -1 ? 'danger' : 'none';

        return (
            <ControlGroup>
                <ButtonGroup style={{ minWidth: 120 }}>
                    <Button data-cy-backward disabled={!canGoBackward} onClick={this.onBackward} rightIcon="chevron-left"></Button>
                    <Button data-cy-forward disabled={!canGoForward} onClick={this.onForward} rightIcon="chevron-right"></Button>
                    <Popover content={<FileMenu selectedItems={selected} onFileAction={this.onFileAction} />}>
                        <Button rightIcon="caret-down" icon="cog" text="" />
                    </Popover>
                </ButtonGroup>
                {/* <Tooltip content={this.renderTooltip()} position={Position.RIGHT} hoverOpenDelay={1000}> */}
                <InputGroup
                        data-cy-path
                        onChange={this.onPathChange}
                        onKeyUp={this.onKeyUp}
                        placeholder="Enter Path to load"
                        rightElement={reloadButton}
                        value={path}
                        intent={intent}
                        inputRef={this.refHandler}
                        onBlur={this.onBlur}
                        onFocus={this.onFocus}
                    />
                {/* </Tooltip> */}
                {isOpen &&
                    <MakedirDialog isOpen={isOpen} onClose={this.makedir} onValidation={fileCache.isDirectoryNameValid} parentPath={path}></MakedirDialog>
                }

                <Alert
                    cancelButtonText="Cancel"
                    confirmButtonText="Delete"
                    icon="trash"
                    intent={Intent.DANGER}
                    isOpen={isDeleteOpen}
                    onConfirm={this.delete}
                    onCancel={this.deleteCancel}
                >
                    <p>
                        Are you sure you want to delete {`${selected.length}`} <b>file(s)/folder(s)</b>?<br />This action will <b>permanentaly</b> delete the selected elements.
                    </p>
                </Alert>
                <Button rightIcon="arrow-right" disabled={status === -1} onClick={this.onSubmit} />
            </ControlGroup>
        )
    }
}

const Toolbar = withNamespaces()(ToolbarClass);

export { Toolbar };
