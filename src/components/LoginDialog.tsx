import * as React from "react";
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup} from "@blueprintjs/core";
import { inject } from "mobx-react";
import { FileState } from "../state/fileState";

interface ILoginProps {
    isOpen: boolean;
    onClose?: (username: string, password: string) => void
    onValidation: (dir: string) => boolean
};

interface InjectedProps extends ILoginProps {
    fileCache: FileState;
}

interface ILoginState {
    username: string;
    password: string;
    port: number;
    connecting: boolean;
    error: string;
    busy: boolean;
}

const ENTER_KEY = 13;

@inject('fileCache')
export class LoginDialog extends React.Component<ILoginProps, ILoginState> {
    private input: HTMLInputElement | null = null;

    constructor(props:any) {
        super(props);

        this.state = {
            username: '',
            password: '',
            connecting: false,
            error: '',
            busy: false,
            port: 21
        };
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    onKeyUp = (e: KeyboardEvent) => {
        if (e.keyCode === ENTER_KEY) {
            const { busy, username, password } = this.state;
            if (!busy && username.length && password.length) {
                this.onLogin();
            }
        }
    }

    private cancelClose = () => {
        console.log('handleClose');
        if (!this.state.busy) {
            this.props.onClose("", "");
        }
    }

    private onLogin = () => {
        const { username, password, port } = this.state;
        const { fileCache } = this.injected;
        console.log('onLogin', username, '****');
        this.setState({ busy: true });

        fileCache.doLogin(username, password, port)
            .catch((err) => {
                this.setState({ error: err, busy: false });
                this.input.focus();
            });
    }

    private onInputChange = (event: React.FormEvent<HTMLElement>) => {
        console.log('input change');
        // 1.Update date
        const val = (event.target as HTMLInputElement).value;
        const name = (event.target as HTMLInputElement).name;
        const state:any = {};
        state[name] = val;

        this.setState(state);
    }

    private refHandler = (input: HTMLInputElement) => {
        this.input = input;
    }

    componentDidMount() {
        this.setState({ error: '', busy: false });
        document.addEventListener('keyup', this.onKeyUp);
    }

    componentWillUnmount() {
        document.removeEventListener('keyup', this.onKeyUp);
    }

    // shouldComponentUpdate() {
    //     console.time('Login Render');
    //     return true;
    // }

    // componentDidUpdate() {
    //     console.timeEnd('Login Render');
    // }

    public render() {
        const { username, password, busy, error, port } = this.state;
        const { fileCache } = this.injected;
        const server = fileCache.server;

        return(
            <Dialog
            icon="globe-network"
            title={`Login to ${server}`}
            isOpen={this.props.isOpen}
            autoFocus={true}
            enforceFocus={true}
            canEscapeKeyClose={true}
            usePortal={true}
            onClose={this.cancelClose}
        >
                <div className={Classes.DIALOG_BODY}>
                    {error && (<h4 className={Classes.INTENT_DANGER}>Login error</h4>)}
                <FormGroup
                    inline={true}
                    labelFor="username"
                    labelInfo="username"
                >
                    <InputGroup
                        onChange={this.onInputChange}
                            placeholder="Enter username"
                            disabled={busy}
                            value={username}
                            inputRef={this.refHandler}
                        id="username"
                        name="username"
                        leftIcon="person"
                        autoFocus
                    />
                    </FormGroup>
                    <FormGroup
                        inline={true}
                        labelFor="password"
                        labelInfo="password"
                    >
                        <InputGroup
                            onChange={this.onInputChange}
                            placeholder="Enter password"
                            disabled={busy}
                            value={password}
                            id="password"
                            name="password"
                            type="password"
                            leftIcon="lock"
                        />
                    </FormGroup>
                    <FormGroup
                        inline={true}
                        labelFor="port"
                        labelInfo="port"
                    >
                        <InputGroup
                            onChange={this.onInputChange}
                            disabled={busy}
                            value={port.toString()}
                            id="port"
                            name="port"
                            type="number"
                            leftIcon="lock"
                        />
                    </FormGroup>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button onClick={this.cancelClose} disabled={busy}>Cancel</Button>
                        <Button loading={busy} intent={Intent.PRIMARY} onClick={this.onLogin} disabled={busy || !username.length || !password.length}>
                        {'Login'}
                    </Button>
                </div>
            </div>
            </Dialog>
        )
    }
}