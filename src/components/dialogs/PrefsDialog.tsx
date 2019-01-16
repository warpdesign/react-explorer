import * as React from "react";
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup, Label, Checkbox, Tabs, Tab } from "@blueprintjs/core";
import { debounce } from "../../utils/debounce";
import { withNamespaces, WithNamespaces } from "react-i18next";
import { SettingsState } from "../../state/settingsState";
import { inject } from "mobx-react";
import { PrefsPanel } from "../panels/PrefsPanel";

const DEBOUNCE_DELAY = 300;
const CTRL_KEY = 17;
const ENTER_KEY = 13;
const META_KEY = 91;
const ReadFolderKey = process.platform === 'darwin' && META_KEY || CTRL_KEY;

interface IPrefsProps extends WithNamespaces{
    isOpen: boolean;
}

interface InjectedProps extends IPrefsProps{
    settingsState: SettingsState;
}

@inject('settingsState')
class PrefsDialogClass extends React.Component<IPrefsProps>{
    constructor(props:any) {
        super(props);
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    onKeyUp = (e: KeyboardEvent) => {
        // if (e.keyCode === ReadFolderKey) {
        //     this.setState({ ctrlKey: false });
        // } else if (e.keyCode === ENTER_KEY) {
        //     const { valid, path } = this.state;
        //     valid && path.length && this.onCreate();
        // }
    }

    onKeyDown = (e: KeyboardEvent) => {
        // if (e.keyCode === ReadFolderKey) {
        //     this.setState({ ctrlKey: true });
        // } else if (e.keyCode === ENTER_KEY && this.state.ctrlKey) {
        //     const { valid, path } = this.state;
        //     valid && path.length && this.onCreate();
        // }
    }

    private isValid(path: string): boolean {
        return false;
        // const valid = this.props.onValidation(path);
        // console.log('valid', path, valid);
        // return valid;
    }

    private checkPath: (path: string) => any = debounce(
        (path: string) => {
            try {
                const isValid = this.isValid(path);
                this.setState({ valid: isValid });
            } catch(error) {
                console.log('error', error);
                this.setState({ valid: false });
            }
        }, DEBOUNCE_DELAY);

    private cancelClose = () => {
        console.log('handleClose');
        // this.props.onClose("", false);
    }

    private onCreate = () => {
        console.log('onCreate');
        // const { path, ctrlKey } = this.state;
        // if (this.isValid(path)) {
        //     this.props.onClose(path, ctrlKey);
        // } else {
        //     this.setState({ valid: false });
        // }
    }

    private onPathChange = (event: React.FormEvent<HTMLElement>) => {
        console.log('path change');
        // 1.Update date
        const path = (event.target as HTMLInputElement).value;
        this.setState({ path });
        // // 2. isValid ?
        this.checkPath(path);
    }

    componentDidMount() {
        document.addEventListener('keyup', this.onKeyUp);
        document.addEventListener('keydown', this.onKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('keydown', this.onKeyDown);
    }

    renderShortcuts() {
        return (<div />);
    }

    public render() {
        const { t } = this.props;

        return(
            <Dialog
            icon="cog"
            title={t('DIALOG.PREFS.TITLE')}
            isOpen={this.props.isOpen}
            autoFocus={true}
            enforceFocus={true}
            canEscapeKeyClose={true}
            usePortal={true}
            onClose={this.cancelClose}
        >
                <div className={Classes.DIALOG_BODY}>
                    <Tabs>
                        <Tab id="prefs" title={t('DIALOG.PREFS.TITLE')} panel={<PrefsPanel></PrefsPanel>} />
                        <Tab id="shortcuts" title={t('DIALOG.PREFS.SHORTCUTS')} panel={this.renderShortcuts()} />
                    </Tabs>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button intent={Intent.PRIMARY} onClick={this.onCreate}>
                            {t('COMMON.OK')}
                    </Button>
                </div>
            </div>
            </Dialog>
        )
    }
}

const PrefsDialog = withNamespaces()(PrefsDialogClass);

export { PrefsDialog };
