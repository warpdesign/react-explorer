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
}

function debounce(a: any, b: any, c?: any) { var d: any, e: any; return function () { function h() { d = null, c || (e = a.apply(f, g)) } var f = this, g = arguments; return clearTimeout(d), d = setTimeout(h, b), c && !d && (e = a.apply(f, g)), e } };

@inject('appState')
@observer
export class PathInput extends React.Component<PathInputProps, PathInputState> {
    private cache: Cache;

    constructor(props: any) {
        super(props);
        this.state = {
            status: 0,
            path: ''
        };
        const { appState } = this.injected;

        this.cache = props.type === 'local' ? appState.localCache : appState.remoteCache;

        this.installReaction();
        this.checkPath = debounce(
            (event: React.FormEvent<HTMLElement>) => {
                // event.persist();
                if (Fs.pathExists(this.state.path)) {
                    this.setState({ status: 1 });
                    // const { appState } = this.injected;
                    // appState.readDirectory(this.state.path, this.props.type);
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
            path => { const status = 0; this.setState({path, status}); }
        );
    }

    onPathChange(event: React.FormEvent<HTMLElement>) {
        // TODO:
        // 1.Update date
        const path = (event.target as HTMLInputElement).value;
        this.setState({ path });
        this.checkPath(event);
        // 2. isValid ? => loadDirectory
        // this.updateStore((event.target as HTMLInputElement).value);
    }

    onSubmit() {
        if (this.cache.path !== this.state.path && Fs.pathExists(this.state.path)) {
            const { appState } = this.injected;
            appState.readDirectory(this.state.path, this.props.type);
        }
    }

    // updateStore(val:string) {
    //     console.log('state change, updating store', val);
    //     this.props.fileCache.path = val;
    // }

    render() {
        const disabled = false;
        const loadingSpinner = false ? <Spinner size={Icon.SIZE_STANDARD} /> : undefined;
        const icon = this.props.type === 'local' && 'home' || 'globe';
        const { appState } = this.injected;
        const path = '';
        const intent = this.state.status === -1 ? 'danger' : 'none';

        return (
            <ControlGroup>
                <InputGroup
                        disabled={disabled}
                        leftIcon={icon}
                        onChange={this.onPathChange.bind(this)}
                        placeholder="Enter Path to load"
                        rightElement={loadingSpinner}
                        value={this.state.path}
                        intent={intent}
                />
                <Button rightIcon="arrow-right" disabled={this.state.status === -1} onClick={this.onSubmit.bind(this)} />
            </ControlGroup>
        )
    }
}
