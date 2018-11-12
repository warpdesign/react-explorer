import * as React from "react";
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup, Spinner } from "@blueprintjs/core";
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
    connecting: boolean;
    ctrlKey: boolean;
    error: string;
    busy: boolean;
}

const DEBOUNCE_DELAY = 300;
const CTRL_KEY = 17;
const ENTER_KEY = 13;

@inject('fileCache')
export class LoginDialog extends React.Component<ILoginProps, ILoginState>{
    constructor(props:any) {
        super(props);

        this.state = {
            username: '',
            password: '',
            connecting: false,
            ctrlKey: false,
            error: '',
            busy: false
        };
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    onKeyUp = (e: KeyboardEvent) => {
        if (e.keyCode === CTRL_KEY) {
            this.setState({ ctrlKey: false });
        } else if (e.keyCode === ENTER_KEY) {
            this.onLogin();
        }
    }

    onKeyDown = (e: KeyboardEvent) => {
        if (e.keyCode === CTRL_KEY) {
            this.setState({ ctrlKey: true });
        }
    }

    private cancelClose = () => {
        console.log('handleClose');
        if (!this.state.busy) {
            this.props.onClose("", "");
        }
    }

    private onLogin = () => {
        const { username, password } = this.state;
        const { fileCache } = this.injected;
        console.log('onLogin', username, '****');
        this.setState({ busy: true });

        fileCache.doLogin(username, password)
            .then(() => { debugger; this.setState({ error: '', busy: false }); })
            .catch((err) => {
                debugger;
                this.setState({ error: err, busy: false });
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
        // // 2. isValid ?
        // this.checkPath(path);
    }

    componentDidMount() {
        document.addEventListener('keyup', this.onKeyUp);
        document.addEventListener('keydown', this.onKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('keydown', this.onKeyDown);
    }

    public render() {
        const { username, password, busy, error, ctrlKey } = this.state;
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