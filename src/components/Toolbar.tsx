import * as React from "react";
import { reaction } from 'mobx';
import { inject } from 'mobx-react';
import { InputGroup, ControlGroup, Button, ButtonGroup, Popover, Intent, Alert, ProgressBar, Classes } from '@blueprintjs/core';
import { AppState } from "../state/appState";
import { debounce } from '../utils/debounce';
import { FileMenu } from "./FileMenu";
import { MakedirDialog } from "./MakedirDialog";
import { Logger } from "./Log";
import { AppToaster, IToasterOpts } from "./AppToaster";
import { throttle } from "../utils/throttle";
import cpy = require("cpy");
import { FileState } from "../state/fileState";

interface PathInputProps {
}

interface InjectedProps extends PathInputProps {
    appState: AppState;
    fileCache: FileState;
}

interface PathInputState {
    status: -1 | 0 | 1;
    path: string;
    history: string[];
    current: number;
    selectedItems: number;
    isOpen: boolean;
    isDeleteOpen: boolean;
}

enum KEYS {
    Escape = 27,
    Enter = 13
};

const DEBOUNCE_DELAY = 400;

@inject('appState', 'fileCache')
export class Toolbar extends React.Component<{}, PathInputState> {
    private cache: FileState;
    private direction = 0;
    private input: HTMLInputElement | null = null;

    private checkPath: (event: React.FormEvent<HTMLElement>) => void = debounce(
        async (event: React.FormEvent<HTMLElement>) => {
            try {
                const exists = await this.cache.exists(this.state.path);
                this.setState({ status: exists ? 1 : -1 });
            } catch {
                this.setState({ status: -1 })
            }
        }, DEBOUNCE_DELAY);

    constructor(props: any) {
        super(props);

        const { fileCache } = this.injected;

        this.state = {
            status: 0,
            path: '',
            history: new Array(),
            current: -1,
            isOpen: false,
            isDeleteOpen: false,
            selectedItems: 0
        };

        this.cache = fileCache;

        // autorun(() => console.log('path modified', this.cache.path));
        // autorun(() => console.log('files modified', this.cache.files.length));

        this.installReactions();
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private installReactions() {
        const reaction1 = reaction(
            () => { return this.cache.path },
            path => {
                console.log('reaction 1');
                const status = 0;

                if (!this.direction) {
                    this.addPathToHistory(path);
                } else {
                    this.navHistory(this.direction);
                    this.direction = 0;
                }
                this.setState({ path, status });
            }
        );

        const reaction2 = reaction(
        () => { return this.cache.selected.length },
        selectedItems => {
            this.setState({ selectedItems });
            }
        );
    }

    private addPathToHistory(path: string) {
        const { fileCache } = this.injected;

        // do not add path during login
        if (fileCache.status === 'login') {
            return;
        }

        this.setState((state) => {
            {
                const { history, current } = state;
                return {
                    history: history.slice(0, current + 1).concat([path]),
                    current: current + 1
                };
            }
        });
    }

    private navHistory(dir = -1, updatePath = false) {
        const { history, current } = this.state;

        const length = history.length;
        let newCurrent = current + dir;

        if (newCurrent < 0) {
            newCurrent = 0;
        } else if (newCurrent >= length) {
            newCurrent = length - 1;
        }
        if (!updatePath) {
            this.setState({
                current: newCurrent
            });
        } else {
            const path = history[current + dir];
            console.log('opening path from history', path);
            this.cache.cd(path);
        }
    }

    private onBackward = (event: React.FormEvent<HTMLElement>) => {
        console.log(this.state.history);
        this.direction = -1;
        this.navHistory(this.direction, true);
    }

    private onForward = (event: React.FormEvent<HTMLElement>) => {
        this.direction = 1;
        this.navHistory(this.direction, true);
    }

    private onPathChange = (event: React.FormEvent<HTMLElement>) => {
        const path = (event.target as HTMLInputElement).value;
        this.setState({ path });
        this.checkPath(event);
    }

    private onSubmit = () => {
        try {
            if (this.cache.path !== this.state.path /*&& pathExists*/) {
                this.cache.cd(this.state.path);
            }
        } catch(err) {
            console.warn('error submiting: path probably does not exist');
        }
    }

    private onKeyUp = (event: React.KeyboardEvent<HTMLElement>) => {
        console.log('path keyup');
        if (event.keyCode === KEYS.Escape) {
            // since React events are attached to the root document
            // event already has bubbled up so we must stop
            // its immediate propagation
            event.nativeEvent.stopImmediatePropagation();
            // lose focus
            this.input.blur();
        } else if (event.keyCode === KEYS.Enter) {
            this.onSubmit();
        }
    }

    private onBlur = () => {
        this.setState({ path: this.cache.path, status: 0 });
    }

    private onReload = () => {
        this.navHistory(0, true);
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
            const { fileCache, appState } = this.injected;

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
        // try {
            const { appState } = this.injected;
            const source = appState.clipboard.source;
            const elements = appState.clipboard.elements.map((el) => el);
            console.log('copying', elements, 'to', this.state.path);
            const bytes = await this.cache.size(source, elements);
            console.log('size', bytes);
            let key = '';
            // only show toaster if (source=remote or bytes > 50*1024*1024)
            const timeout = setTimeout(() => {
                key = AppToaster.show(
                    this.renderCopyProgress(0)
                );
            }, 1000);
            console.time('copy');
            let i = 0;
            this.cache.copy(source, elements, this.state.path).on('progress', throttle((data:cpy.ProgressData) => {
                console.log('progress', i++);
                console.log('progress', data, 'percent', (data.completedSize * 100) / bytes);
                if (key) {
                    AppToaster.show(this.renderCopyProgress((data.completedSize * 100) / bytes), key);
                }
            }, 400)).then(() => {
                console.log('copy done');
                console.timeEnd('copy');
                if (key) {
                    // in case copy finishes between two throttles toaster could get stuck
                    AppToaster.show(this.renderCopyProgress(100), key);
                    key = '';
                }
                // do not show toaster if copy doesn't last more than 1 sec
                clearTimeout(timeout);
                console.log('need to refresh cache');
                this.cache.reload();
                // appState.refreshCache(this.cache);
            })
            .catch((err:Error) => {
                clearTimeout(timeout);
                // show error + log error
            });
        // } catch(err) {
        //     console.log('error copying files', err);
        // }
    }

    private onFileAction = (action: string) => {
        switch(action) {
            case 'makedir':
                Logger.log('Opening new folder dialog');
                this.setState({isOpen: true});
                break;

            case 'delete':
                this.setState({isDeleteOpen: true});
                break;

            case 'paste':
                this.copy();
                break;

            default:
                Logger.warn('action unknown', action);
        }
    }

    public render() {
        const { current, history, status, path, isOpen, isDeleteOpen, selectedItems } = this.state;
        const { fileCache } = this.injected;
        const canGoBackward = current > 0;
        const canGoForward = history.length > 1 && current < history.length - 1;
        // const loadingSpinner = false ? <Spinner size={Icon.SIZE_STANDARD} /> : undefined;
        const reloadButton = <Button className="small" onClick={this.onReload} minimal rightIcon="repeat"></Button>;
        const intent = status === -1 ? 'danger' : 'none';

        return (
            <ControlGroup>
                <ButtonGroup style={{ minWidth: 120 }}>
                    <Button disabled={!canGoBackward} onClick={this.onBackward} rightIcon="chevron-left"></Button>
                    <Button disabled={!canGoForward} onClick={this.onForward} rightIcon="chevron-right"></Button>
                    <Popover content={<FileMenu selectedItems={fileCache.selected} onFileAction={this.onFileAction} />}>
                        <Button rightIcon="caret-down" icon="cog" text="" />
                    </Popover>
                </ButtonGroup>
                <InputGroup
                        onChange={this.onPathChange}
                        onKeyUp={this.onKeyUp}
                        placeholder="Enter Path to load"
                        rightElement={reloadButton}
                        value={path}
                        intent={intent}
                        inputRef={this.refHandler}
                        onBlur={this.onBlur}
                />
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
                        Are you sure you want to delete {`${selectedItems}`} <b>file(s)/folder(s)</b>?<br />This action will <b>permanentaly</b> delete the selected elements.
                    </p>
                </Alert>
                <Button rightIcon="arrow-right" disabled={status === -1} onClick={this.onSubmit} intent="primary" />
            </ControlGroup>
        )
    }
}