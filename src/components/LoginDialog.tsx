import * as React from "react";
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup } from "@blueprintjs/core";
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
    valid: boolean;
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
            valid: true
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

    // private isValid(path: string): boolean {
    //     const valid = this.props.onValidation(path);
    //     console.log('valid', path, valid);
    //     return valid;
    // }

    // private checkPath: (path: string) => any = debounce(
    //     (path: string) => {
    //         try {
    //             const isValid = this.isValid(path);
    //             this.setState({ valid: isValid });
    //         } catch(error) {
    //             console.log('error', error);
    //             this.setState({ valid: false });
    //         }
    //     }, DEBOUNCE_DELAY);

    private cancelClose = () => {
        console.log('handleClose');
        this.props.onClose("", "");
    }

    private onLogin = () => {
        const { username, password } = this.state;
        const { fileCache } = this.injected;
        console.log('onLogin', username, password);
        fileCache.login(username, password).then(() => {
            fileCache.cd(fileCache.path);
        });
        // TODO: display spinner, and remove it on then/catch
        // TODO: fileCache.list() on login success
        // this.props.onClose(username, password);
        // if (this.isValid(username)) {
        //     this.props.onClose(username, ctrlKey);
        // } else {
        //     this.setState({ valid: false });
        // }
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
        const { username, password, connecting, valid, ctrlKey } = this.state;
        const { fileCache } = this.injected;
        const server = fileCache.server;
        const intent = !valid && 'danger' || 'none';
        const helperText = !valid && (<span>Folder name not valid</span>) || (<span>&nbsp;</span>);

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
                <FormGroup
                    helperText={helperText}
                    inline={true}
                    labelFor="username"
                    labelInfo="username"
                >
                    <InputGroup
                        onChange={this.onInputChange}
                        placeholder="Enter username"
                        value={username}
                        id="username"
                        name="username"
                        intent={intent}
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
                            value={password}
                            id="password"
                            name="password"
                            intent={intent}
                            type="password"
                            leftIcon="lock"
                        />
                    </FormGroup>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button onClick={this.cancelClose}>Cancel</Button>

                        <Button intent={Intent.PRIMARY} onClick={this.onLogin} disabled={!username.length || !password.length}>
                        {!ctrlKey && 'Login' || 'Create & read folder'}
                    </Button>
                </div>
            </div>
            </Dialog>
        )
    }
}