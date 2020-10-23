import * as React from 'react';
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup, Colors } from '@blueprintjs/core';
import { inject } from 'mobx-react';
import { FileState } from '../../state/fileState';
import { withNamespaces, WithNamespaces } from 'react-i18next';

interface LoginProps extends WithNamespaces {
    isOpen: boolean;
    onClose?: (user: string, password: string) => void;
    onValidation: (dir: string) => boolean;
}

interface InjectedProps extends LoginProps {
    fileCache: FileState;
}

type Error = {
    message: string;
    code: number;
};

interface LoginState {
    user?: string;
    password?: string;
    server?: string;
    port?: number;
    connecting?: boolean;
    error?: Error;
    busy?: boolean;
}

const ENTER_KEY = 13;

@inject('fileCache')
class LoginDialogClass extends React.Component<LoginProps, LoginState> {
    private input: HTMLInputElement | null = null;

    constructor(props: LoginProps) {
        super(props);

        const fileCache = this.injected.fileCache;

        const defaultState = {
            user: '',
            password: '',
            connecting: false,
            server: fileCache.server,
            error: null as Error,
            busy: false,
            port: 21,
        };

        this.state = Object.assign(defaultState, fileCache.credentials);
    }

    private get injected(): InjectedProps {
        return this.props as InjectedProps;
    }

    onKeyUp = (e: KeyboardEvent): void => {
        if (e.keyCode === ENTER_KEY) {
            // we assume anonymous login if no username specified
            if (this.canLogin()) {
                this.onLogin();
            }
        }
    };

    private cancelClose = (): void => {
        console.log('handleClose');
        if (!this.state.busy) {
            this.props.onClose('', '');
        }
    };

    private onLogin = (): void => {
        const { user, password, port, server } = this.state;
        const { fileCache } = this.injected;
        console.log('onLogin', user, '****');
        this.setState({ busy: true, error: null });

        fileCache.doLogin(server, { user, password, port }).catch((err) => {
            this.setState({ error: err, busy: false });
            this.input.focus();
        });
    };

    private onInputChange = (event: React.FormEvent<HTMLElement>): void => {
        const val = (event.target as HTMLInputElement).value;
        const name = (event.target as HTMLInputElement).name;
        const state: Partial<LoginState> = {};
        (state as any)[name] = val;

        this.setState(state);
    };

    private refHandler = (input: HTMLInputElement): void => {
        this.input = input;
    };

    private canLogin = (): boolean => {
        const { busy, user, password, server } = this.state;

        return !!server.length && !busy && !!(!user.length || (user.length && password.length));
    };

    componentDidMount(): void {
        this.setState({ error: null, busy: false });
        document.addEventListener('keyup', this.onKeyUp);
    }

    componentWillUnmount(): void {
        document.removeEventListener('keyup', this.onKeyUp);
    }

    // shouldComponentUpdate() {
    //     console.time('Login Render');
    //     return true;
    // }

    // componentDidUpdate() {
    //     console.timeEnd('Login Render');
    // }

    public render(): React.ReactNode {
        const { user, password, busy, error, port, server } = this.state;
        const { t } = this.props;

        if (error) {
            console.log(error.code, error.message);
        }

        return (
            <Dialog
                icon="globe-network"
                title={t('DIALOG.LOGIN.TITLE', { server: server })}
                isOpen={this.props.isOpen}
                autoFocus={true}
                enforceFocus={true}
                canEscapeKeyClose={true}
                usePortal={true}
                onClose={this.cancelClose}
                className="loginDialog"
            >
                <div className={Classes.DIALOG_BODY}>
                    {error && (
                        <p className="error" style={{ backgroundColor: Colors.RED4 }}>
                            {t('ERRORS.GENERIC', { error })}
                        </p>
                    )}
                    <FormGroup inline={true} labelFor="server" labelInfo={t('DIALOG.LOGIN.SERVER')}>
                        <InputGroup
                            onChange={this.onInputChange}
                            placeholder={t('DIALOG.LOGIN.SERVER_NAME')}
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
                        labelInfo={t('DIALOG.LOGIN.USERNAME')}
                        helperText={<span>{t('DIALOG.LOGIN.HINT_USERNAME')}</span>}
                    >
                        <InputGroup
                            onChange={this.onInputChange}
                            placeholder={t('DIALOG.LOGIN.USERINPUT')}
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
                        labelInfo={t('DIALOG.LOGIN.PASSWORD')}
                        helperText={t('DIALOG.LOGIN.HINT_PASSWORD')}
                    >
                        <InputGroup
                            onChange={this.onInputChange}
                            placeholder={t('DIALOG.LOGIN.PASSWORDINPUT')}
                            disabled={busy}
                            value={password}
                            id="password"
                            name="password"
                            type="password"
                            leftIcon="lock"
                        />
                    </FormGroup>
                    <FormGroup inline={true} labelFor="port" labelInfo={t('DIALOG.LOGIN.PORT')}>
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
                        <Button onClick={this.cancelClose} disabled={busy}>
                            {t('COMMON.CANCEL')}
                        </Button>
                        <Button
                            loading={busy}
                            intent={Intent.PRIMARY}
                            onClick={this.onLogin}
                            disabled={!this.canLogin()}
                        >
                            {t('DIALOG.LOGIN.LOGIN')}
                        </Button>
                    </div>
                </div>
            </Dialog>
        );
    }
}

const LoginDialog = withNamespaces()(LoginDialogClass);

export { LoginDialog };
