import * as React from 'react';
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup } from '@blueprintjs/core';
import { debounce } from '../../utils/debounce';
import { withNamespaces, WithNamespaces } from 'react-i18next';
import { metaKeyCode } from '../../utils/platform';

interface MakedirProps extends WithNamespaces {
    isOpen: boolean;
    parentPath: string;
    onClose?: (dirName: string, navigate: boolean) => void;
    onValidation: (dir: string) => boolean;
}

interface MakedirState {
    path: string;
    ctrlKey: boolean;
    valid: boolean;
}

const DEBOUNCE_DELAY = 300;

const ENTER_KEY = 13;

class MakedirDialogClass extends React.Component<MakedirProps, MakedirState> {
    mounted = false;

    constructor(props: MakedirProps) {
        super(props);

        this.state = {
            path: '',
            ctrlKey: false,
            valid: true,
        };
    }

    onKeyUp = (e: KeyboardEvent): void => {
        if (e.keyCode === metaKeyCode) {
            this.setState({ ctrlKey: false });
        } else if (e.keyCode === ENTER_KEY) {
            const { valid, path } = this.state;
            valid && path.length && this.onCreate();
        }
    };

    onKeyDown = (e: KeyboardEvent): void => {
        if (e.keyCode === metaKeyCode) {
            this.setState({ ctrlKey: true });
        } else if (e.keyCode === ENTER_KEY && this.state.ctrlKey) {
            const { valid, path } = this.state;
            valid && path.length && this.onCreate();
        }
    };

    private isValid(path: string): boolean {
        const valid = this.props.onValidation(path);
        return valid;
    }

    private checkPath: (path: string) => void = debounce((path: string): void => {
        // prevent memleak in case debounce callback is called
        // after the dialog has been closed
        if (!this.mounted) {
            return;
        }

        try {
            const isValid = this.isValid(path);
            this.setState({ valid: isValid });
        } catch (error) {
            console.log('error', error);
            this.setState({ valid: false });
        }
    }, DEBOUNCE_DELAY);

    private cancelClose = (): void => {
        this.props.onClose('', false);
    };

    private onCreate = (): void => {
        const { path, ctrlKey } = this.state;
        if (this.isValid(path)) {
            this.props.onClose(path, ctrlKey);
        } else {
            this.setState({ valid: false });
        }
    };

    private onPathChange = (event: React.FormEvent<HTMLElement>): void => {
        const path = (event.target as HTMLInputElement).value;
        this.setState({ path });
        this.checkPath(path);
    };

    componentDidMount(): void {
        this.mounted = true;
        document.addEventListener('keyup', this.onKeyUp);
        document.addEventListener('keydown', this.onKeyDown);
    }

    componentWillUnmount(): void {
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('keydown', this.onKeyDown);
        this.mounted = false;
    }

    // shouldComponentUpdate() {
    //     console.time('MakedirDialog Render');
    //     return true;
    // }

    // componentDidUpdate() {
    //     console.timeEnd('MakedirDialog Render');
    // }

    public render(): React.ReactNode {
        const { path, valid, ctrlKey } = this.state;
        const { t } = this.props;

        const intent = (!valid && 'danger') || 'none';
        const helperText = (!valid && <span>{t('DIALOG.MAKEDIR.NOT_VALID')}</span>) || <span>&nbsp;</span>;
        let { parentPath } = this.props;

        let sep = '';
        if (parentPath.match(/\//)) {
            sep = '/';
        } else {
            sep = '\\';
        }

        if (!parentPath.endsWith(sep)) {
            parentPath += sep;
        }

        return (
            <Dialog
                icon="folder-new"
                title={t('COMMON.MAKEDIR')}
                isOpen={this.props.isOpen}
                autoFocus={true}
                enforceFocus={true}
                canEscapeKeyClose={true}
                usePortal={true}
                onClose={this.cancelClose}
                className="makedirDialog"
            >
                <div className={Classes.DIALOG_BODY}>
                    <p>{t('DIALOG.MAKEDIR.TITLE')}</p>
                    <FormGroup
                        helperText={helperText}
                        inline={true}
                        labelFor="directory-input"
                        labelInfo={`${parentPath}`}
                    >
                        <InputGroup
                            onChange={this.onPathChange}
                            placeholder={t('DIALOG.MAKEDIR.NAME')}
                            value={path}
                            id="directory-input"
                            name="directory-input"
                            intent={intent}
                            autoFocus
                        />
                    </FormGroup>
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button onClick={this.cancelClose}>{t('COMMON.CANCEL')}</Button>

                        <Button intent={Intent.PRIMARY} onClick={this.onCreate} disabled={!path.length || !valid}>
                            {(!ctrlKey && t('DIALOG.MAKEDIR.CREATE')) || t('DIALOG.MAKEDIR.CREATE_READ')}
                        </Button>
                    </div>
                </div>
            </Dialog>
        );
    }
}

const MakedirDialog = withNamespaces()(MakedirDialogClass);

export { MakedirDialog };
