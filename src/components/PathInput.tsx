import * as React from "react";
import { reaction } from 'mobx';
import { observer, inject } from 'mobx-react';
import { InputGroup, Spinner, Icon, ControlGroup, Button } from '@blueprintjs/core';
import { AppState } from "../state/appState";
import { Cache, Fs } from "../services/Fs";

interface PathInputProps {
    type: string;
}

interface InjectedProps extends PathInputProps {
    appState: AppState;
}

interface PathInputState {
    status: -1 | 0 | 1;
    path: string;
    history: string[],
    current: number
}

function debounce(a: any, b: any, c?: any) { var d: any, e: any; return function () { function h() { d = null, c || (e = a.apply(f, g)) } var f = this, g = arguments; return clearTimeout(d), d = setTimeout(h, b), c && !d && (e = a.apply(f, g)), e } };

@inject('appState')
@observer
export class PathInput extends React.Component<PathInputProps, PathInputState> {
    private cache: Cache;
    private direction = 0;

    constructor(props: any) {
        super(props);
        this.state = {
            status: 0,
            path: '',
            history: new Array(),
            current: -1
        };
        const { appState } = this.injected;

        this.cache = props.type === 'local' ? appState.localCache : appState.remoteCache;

        this.installReaction();
        this.checkPath = debounce(
            (event: React.FormEvent<HTMLElement>) => {
                // event.persist();
                if (Fs.pathExists(this.state.path)) {
                    this.setState({ status: 1 });
                } else {
                    console.log('directory doesn\'t exists!');
                    this.setState({ status: -1 });
                }
            }, 400);
    }

    get injected() {
        return this.props as InjectedProps;
    }

    checkPath: (event: React.FormEvent<HTMLElement>) => any;

    installReaction() {
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

    addPathToHistory(path: string) {
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

    navHistory(dir = -1, updatePath = false) {
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
            appState.readDirectory(path, this.props.type);
        }
    }

    onBackward(event: React.FormEvent<HTMLElement>) {
        this.direction = -1;
        this.navHistory(this.direction, true);
    }

    onForward(event: React.FormEvent<HTMLElement>) {
        this.direction = 1;
        this.navHistory(this.direction, true);
    }

    onPathChange(event: React.FormEvent<HTMLElement>) {
        // 1.Update date
        const path = (event.target as HTMLInputElement).value;
        this.setState({ path });
        // 2. isValid ? => loadDirectory
        this.checkPath(event);
    }

    onSubmit() {
        if (this.cache.path !== this.state.path && Fs.pathExists(this.state.path)) {
            const { appState } = this.injected;
            appState.readDirectory(this.state.path, this.props.type);
        }
    }

    render() {
        const { current, history, status, path } = this.state;
        const canGoBackward = current > 0;
        const canGoForward = history.length > 1 && current < history.length - 1;
        const disabled = false;
        const loadingSpinner = false ? <Spinner size={Icon.SIZE_STANDARD} /> : undefined;
        const icon = this.props.type === 'local' && 'home' || 'globe';
        const intent = status === -1 ? 'danger' : 'none';

        return (
            <ControlGroup>
                <Button disabled={!canGoBackward} onClick={this.onBackward.bind(this)} rightIcon="chevron-left"></Button>
                <Button disabled={!canGoForward} onClick={this.onForward.bind(this)} rightIcon="chevron-right"></Button>
                <InputGroup
                        disabled={disabled}
                        leftIcon={icon}
                        onChange={this.onPathChange.bind(this)}
                        placeholder="Enter Path to load"
                        rightElement={loadingSpinner}
                        value={path}
                        intent={intent}
                />
                <Button rightIcon="arrow-right" disabled={status === -1} onClick={this.onSubmit.bind(this)} intent="primary" />
            </ControlGroup>
        )
    }
}
