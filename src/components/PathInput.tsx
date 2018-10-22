import * as React from "react";
import { reaction } from 'mobx';
import { inject } from 'mobx-react';
import { InputGroup, Spinner, Icon, ControlGroup, Button, ButtonGroup, Popover } from '@blueprintjs/core';
import { AppState } from "../state/appState";
import { Directory, Fs, DirectoryType } from "../services/Fs";
import { debounce } from '../utils/debounce';
import { FileMenu } from "./FileMenu";

interface PathInputProps {
}

interface InjectedProps extends PathInputProps {
    appState: AppState;
    fileCache: Directory;
}

interface PathInputState {
    status: -1 | 0 | 1;
    path: string;
    history: string[],
    current: number,
    type: DirectoryType
}

enum KEYS {
    Escape = 27,
    Enter = 13
};

const DEBOUNCE_DELAY = 400;

@inject('appState', 'fileCache')
export class PathInput extends React.Component<{}, PathInputState> {
    private cache: Directory;
    private direction = 0;
    private input: HTMLInputElement | null = null;

    private checkPath: (event: React.FormEvent<HTMLElement>) => any = debounce(
        async (event: React.FormEvent<HTMLElement>) => {
            try {
                const exists = await Fs.pathExists(this.state.path);
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
            type: fileCache.type
        };

        this.cache = fileCache;

        this.installReaction();
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private installReaction() {
        const reaction1 = reaction(
            () => { return this.cache.path },
            path => {
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
    }

    private addPathToHistory(path: string) {
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
            const { appState } = this.injected;
            const path = history[current + dir];
            // appState.readDirectory(path, this.props.type);
            appState.updateCache(this.cache, path);
        }
    }

    private onBackward = (event: React.FormEvent<HTMLElement>) => {
        this.direction = -1;
        this.navHistory(this.direction, true);
    }

    private onForward = (event: React.FormEvent<HTMLElement>) => {
        this.direction = 1;
        this.navHistory(this.direction, true);
    }

    private onPathChange = (event: React.FormEvent<HTMLElement>) => {
        // 1.Update date
        const path = (event.target as HTMLInputElement).value;
        this.setState({ path });
        // 2. isValid ? => loadDirectory
        this.checkPath(event);
    }

    private onSubmit = () => {
        if (this.cache.path !== this.state.path && Fs.pathExists(this.state.path)) {
            const { appState } = this.injected;
            // appState.readDirectory(this.state.path, this.props.type);
            appState.updateCache(this.cache, this.state.path);
        }
    }

    private onKeyUp = (event: React.KeyboardEvent<HTMLElement>) => {
        console.log('path keyup');
        if (event.keyCode === KEYS.Escape) {
            // since React events are attached to the root document
            // event already has bubbled up so we must stop
            // its immediate propagation
            event.nativeEvent.stopImmediatePropagation();
            // restore current path from appState
            this.setState({ path: this.cache.path, status: 0 });
            // lose focus
            this.input.blur();
        } else if (event.keyCode === KEYS.Enter) {
            this.onSubmit();
        }
    }

    private onReload = () => {
        this.navHistory(0, true);
    }

    private refHandler = (input: HTMLInputElement) => {
        this.input = input;
    }

    public render() {
        const { current, history, status, path, type } = this.state;
        const canGoBackward = current > 0;
        const canGoForward = history.length > 1 && current < history.length - 1;
        const disabled = false;
        const loadingSpinner = false ? <Spinner size={Icon.SIZE_STANDARD} /> : undefined;
        const icon = type === DirectoryType.LOCAL && 'home' || 'globe';
        const intent = status === -1 ? 'danger' : 'none';

        return (
            <ControlGroup>
                <ButtonGroup style={{ minWidth: 120 }}>
                <Button disabled={!canGoBackward} onClick={this.onBackward} rightIcon="chevron-left"></Button>
                <Button disabled={!canGoForward} onClick={this.onForward} rightIcon="chevron-right"></Button>
                <Button onClick={this.onReload} rightIcon="repeat"></Button>
                    <Popover content={<FileMenu />}>
                        <Button rightIcon="caret-down" icon="cog" text="" />
                    </Popover>
                </ButtonGroup>
                <InputGroup
                        disabled={disabled}
                        leftIcon={icon}
                        onChange={this.onPathChange}
                        onKeyUp={this.onKeyUp}
                        placeholder="Enter Path to load"
                        rightElement={loadingSpinner}
                        value={path}
                        intent={intent}
                        inputRef={this.refHandler}
                />
                <Button rightIcon="arrow-right" disabled={status === -1} onClick={this.onSubmit} intent="primary" />
            </ControlGroup>
        )
    }
}
