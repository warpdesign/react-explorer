import * as React from 'react'
import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import { IconGlobe, IconLock, IconUser } from '@tabler/icons-react'
import { inject } from 'mobx-react'
import { WithTranslation, withTranslation } from 'react-i18next'

import Keys from '$src/constants/keys'
import { FileState } from '$src/state/fileState'

interface LoginProps extends WithTranslation {
    isOpen: boolean
    onClose?: (user: string, password: string) => void
    onValidation: (dir: string) => boolean
}

interface InjectedProps extends LoginProps {
    fileCache: FileState
}

type Error = {
    message: string
    code: number
}

interface LoginState {
    user?: string
    password?: string
    server?: string
    port?: number
    connecting?: boolean
    error?: Error
    busy?: boolean
}

class LoginDialogClass extends React.Component<LoginProps, LoginState> {
    private input: HTMLInputElement | null = null

    constructor(props: LoginProps) {
        super(props)

        const fileCache = this.injected.fileCache

        const defaultState = {
            user: '',
            password: '',
            connecting: false,
            server: fileCache.server,
            error: null as Error,
            busy: false,
            port: 21,
        }

        this.state = Object.assign(defaultState, fileCache.credentials)
    }

    private get injected(): InjectedProps {
        return this.props as InjectedProps
    }

    onKeyUp = (e: KeyboardEvent): void => {
        if (e.key === Keys.ENTER) {
            // we assume anonymous login if no username specified
            if (this.canLogin()) {
                this.onLogin()
            }
        }
    }

    private cancelClose = (): void => {
        console.log('handleClose')
        if (!this.state.busy) {
            this.props.onClose('', '')
        }
    }

    private onLogin = (): void => {
        const { user, password, port, server } = this.state
        const { fileCache } = this.injected
        console.log('onLogin', user, '****')
        this.setState({ busy: true, error: null })

        fileCache.doLogin(server, { user, password, port }).catch((err) => {
            this.setState({ error: err, busy: false })
            this.input.focus()
        })
    }

    private onInputChange = (event: React.FormEvent<HTMLElement>): void => {
        const val = (event.target as HTMLInputElement).value
        const name = (event.target as HTMLInputElement).name
        const state: Partial<LoginState> = {}
        ;(state as any)[name] = val

        this.setState(state)
    }

    private refHandler = (input: HTMLInputElement): void => {
        this.input = input
    }

    private canLogin = (): boolean => {
        const { busy, user, password, server } = this.state

        return !!server.length && !busy && !!(!user.length || (user.length && password.length))
    }

    componentDidMount(): void {
        this.setState({ error: null, busy: false })
        document.addEventListener('keyup', this.onKeyUp)
    }

    componentWillUnmount(): void {
        document.removeEventListener('keyup', this.onKeyUp)
    }

    // shouldComponentUpdate() {
    //     console.time('Login Render');
    //     return true;
    // }

    // componentDidUpdate() {
    //     console.timeEnd('Login Render');
    // }

    public render(): React.ReactNode {
        const { user, password, busy, error, port, server } = this.state
        const { t } = this.props

        if (error) {
            console.log(error.code, error.message)
        }

        return (
            <Modal
                opened={this.props.isOpen}
                onClose={this.cancelClose}
                title={t('DIALOG.LOGIN.TITLE', { server: server })}
                closeOnEscape={true}
                trapFocus={true}
                className="loginDialog"
            >
                <Stack gap="md">
                    {error && <Alert color="red">{t('ERRORS.GENERIC', { error })}</Alert>}
                    <TextInput
                        label={t('DIALOG.LOGIN.SERVER')}
                        placeholder={t('DIALOG.LOGIN.SERVER_NAME')}
                        leftSection={<IconGlobe size={16} />}
                        onChange={this.onInputChange}
                        disabled={busy}
                        value={server}
                        id="server"
                        name="server"
                    />
                    <TextInput
                        label={t('DIALOG.LOGIN.USERNAME')}
                        placeholder={t('DIALOG.LOGIN.USERINPUT')}
                        description={t('DIALOG.LOGIN.HINT_USERNAME')}
                        leftSection={<IconUser size={16} />}
                        onChange={this.onInputChange}
                        disabled={busy}
                        value={user}
                        ref={this.refHandler}
                        id="user"
                        name="user"
                        autoFocus
                    />
                    <TextInput
                        label={t('DIALOG.LOGIN.PASSWORD')}
                        placeholder={t('DIALOG.LOGIN.PASSWORDINPUT')}
                        description={t('DIALOG.LOGIN.HINT_PASSWORD')}
                        leftSection={<IconLock size={16} />}
                        onChange={this.onInputChange}
                        disabled={busy}
                        value={password}
                        id="password"
                        name="password"
                        type="password"
                    />
                    <TextInput
                        label={t('DIALOG.LOGIN.PORT')}
                        leftSection={<IconLock size={16} />}
                        onChange={this.onInputChange}
                        disabled={busy}
                        value={port?.toString() || '21'}
                        id="port"
                        name="port"
                        type="number"
                    />
                    <Group justify="flex-end" mt="md">
                        <Button onClick={this.cancelClose} disabled={busy} variant="default">
                            {t('COMMON.CANCEL')}
                        </Button>
                        <Button loading={busy} onClick={this.onLogin} disabled={!this.canLogin()}>
                            {t('DIALOG.LOGIN.LOGIN')}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        )
    }
}

const LoginDialog = withTranslation()(inject('fileCache')(LoginDialogClass))

export { LoginDialog }
