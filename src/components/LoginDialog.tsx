import * as React from "react";
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup, Colors} from "@blueprintjs/core";
import { inject } from "mobx-react";
import { FileState } from "../state/fileState";

interface ILoginProps {
    isOpen: boolean;
    onClose?: (user: string, password: string) => void
    onValidation: (dir: string) => boolean
};

interface InjectedProps extends ILoginProps {
    fileCache: FileState;
}

type Error = {
    message: string;
    code: number
};

interface ILoginState {
    user: string;
    password: string;
    server: string;
    port: number;
    connecting: boolean;
    error: Error;
    busy: boolean;
}

const ENTER_KEY = 13;

@inject('fileCache')
export class LoginDialog extends React.Component<ILoginProps, ILoginState> {
    private input: HTMLInputElement | null = null;

    constructor(props:any) {
        super(props);

        const fileCache = this.injected.fileCache;

        const defaultState = {
            user: '',
            password: '',
            connecting: false,
            server: fileCache.server,
            error: null as Error,
            busy: false,
            port: 21
        };

        this.state = Object.assign(defaultState, fileCache.credentials);
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    onKeyUp = (e: KeyboardEvent) => {
        if (e.keyCode === ENTER_KEY) {
            // we assume anonymous login if no username specified
            if (this.canLogin()) {
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
        const { user, password, port, server } = this.state;
        const { fileCache } = this.injected;
        console.log('onLogin', user, '****');
        this.setState({ busy: true, error: null });

        fileCache.doLogin(server, { user, password, port })
            .catch((err) => {
                this.setState({ error: err, busy: false });
                this.input.focus();
            });
    }

    private onInputChange = (event: React.FormEvent<HTMLElement>) => {
        const val = (event.target as HTMLInputElement).value;
        const name = (event.target as HTMLInputElement).name;
        console.log('input change', val);
        const state:any = {};
        state[name] = val;

        this.setState(state);
    }

    private refHandler = (input: HTMLInputElement) => {
        this.input = input;
    }

    private canLogin = () => {
        const { busy, user, password, server } = this.state;

        return server.length && !busy && !!(!user.length || (user.length && password.length));
    }

    componentDidMount() {
        this.setState({ error: null, busy: false });
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
        const { user, password, busy, error, port, server } = this.state;

        if (error) {
            console.log(error.code, error.message);
        }

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
            className="loginDialog"
        >
                <div className={Classes.DIALOG_BODY}>
                    {error && (<p className="error" style={{ backgroundColor: Colors.RED4 }}>{error.message} (code {error.code})</p>)}
                    <FormGroup
                        inline={true}
                        labelFor="server"
                        labelInfo="server"
                    >
                        <InputGroup
                            onChange={this.onInputChange}
                            placeholder="Enter server"
                            disabled={busy}
                            value={server}
                            id="server"
                            name="server"
                            leftIcon="globe"
                        />
                    </FormGroup>
                <FormGroup
                    inline={true}
                    labelFor="user"
                    labelInfo="username"
                    helperText={(<span>Leave empty for <em>anonymous</em> login</span>)}
                >
                    <InputGroup
                        onChange={this.onInputChange}
                            placeholder="Enter username"
                            disabled={busy}
                            value={user}
                            inputRef={this.refHandler}
                        id="user"
                        name="user"
                        leftIcon="person"
                        autoFocus
                    />
                    </FormGroup>
                    <FormGroup
                        inline={true}
                        labelFor="password"
                        labelInfo="password"
                        helperText="Required for non-anonymous login"
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
                        <Button loading={busy} intent={Intent.PRIMARY} onClick={this.onLogin} disabled={!this.canLogin()}>
                        {'Login'}
                    </Button>
                </div>
            </div>
            </Dialog>
        )
    }
}