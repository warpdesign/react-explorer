import * as React from "react";
import { Dialog, Classes, Button, KeyCombo } from "@blueprintjs/core";
import { withNamespaces, WithNamespaces } from "react-i18next";

interface IShortcutsProps extends WithNamespaces {
    isOpen: boolean;
    onClose: () => void
 };

class ShortcutsDialogClass extends React.Component<IShortcutsProps>{
    constructor(props:any) {
        super(props);
    }

    buildList() {
        const { t } = this.props;

        return [
            // group: t('SHORTCUT.GROUP.GLOBAL'),
            [
                {
                    combo: "alt + mod + l",
                    label: t('SHORTCUT.MAIN.DOWNLOADS_TAB')
                }
            ]
        ]
    }

    private onClose = () => {
        this.props.onClose();
    }

    public render() {
        const { t } = this.props;
        const shortcuts = this.buildList();

        return(
            <Dialog
            icon="lightbulb"
            title={t('NAV.SHORTCUTS')}
            isOpen={this.props.isOpen}
            autoFocus={true}
            enforceFocus={true}
            canEscapeKeyClose={true}
            usePortal={true}
            onClose={this.onClose}
            className="shortcutsDialog"
        >
            <div className={`${Classes.DIALOG_BODY}`}>
                    <div className="bp3-hotkey-column">
                        <h4 className={Classes.HEADING}>
                            {t('SHORTCUT.GROUP.GLOBAL')}
                        </h4>
                        {shortcuts[0].map((shortcut) => (
                            <div key={shortcut.combo} className={Classes.HOTKEY}>
                                <div className={Classes.HOTKEY_LABEL}>{shortcut.label}</div>
                                <KeyCombo combo={shortcut.combo}></KeyCombo>
                            </div>
                        ))}
                    </div>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button onClick={this.onClose}>
                            {t('COMMON.CLOSE')}
                    </Button>
                </div>
            </div>
            </Dialog>
        )
    }
}

const ShortcutsDialog = withNamespaces()(ShortcutsDialogClass);

export { ShortcutsDialog };
