import * as React from "react";
import { Dialog, Classes, Button, KeyCombo } from "@blueprintjs/core";
import { withNamespaces, WithNamespaces } from "react-i18next";
import { isMac } from "../../utils/platform";

interface IShortcutsProps extends WithNamespaces {
    isOpen: boolean;
    onClose: () => void
};

class ShortcutsDialogClass extends React.Component<IShortcutsProps>{
    constructor(props: any) {
        super(props);
    }

    buildList() {
        const { t } = this.props;

        return [
            // group: t('SHORTCUT.GROUP.GLOBAL'),
            [
                { combo: "alt + mod + l", label: t('SHORTCUT.MAIN.DOWNLOADS_TAB') },
                { combo: "alt + mod + e", label: t('SHORTCUT.MAIN.EXPLORER_TAB') },
                { combo: "ctrl + alt + right", label: t('SHORTCUT.MAIN.NEXT_VIEW') },
                { combo: "ctrl + alt + left", label: t('SHORTCUT.MAIN.PREVIOUS_VIEW') },
                { combo: "mod + r", label: t('SHORTCUT.MAIN.RELOAD_VIEW') },
                // { combo: isMac && "mod + left" || "alt + left", label: t('SHORTCUT.ACTIVE_VIEW.BACKWARD_HISTORY') },
                // { combo: isMac && "mod + right" || "alt + right", label: t('SHORTCUT.ACTIVE_VIEW.FORWARD_HISTORY') },
                { combo: "escape", label: t('SHORTCUT.LOG.TOGGLE') },
                { combo: "mod + s", label: t('SHORTCUT.MAIN.KEYBOARD_SHORTCUTS') },
                { combo: "mod + ,", label: t('SHORTCUT.MAIN.PREFERENCES') },
                { combo: "alt + mod + i", label: t('SHORTCUT.OPEN_DEVTOOLS') },
                { combo: "mod + q", label: t('SHORTCUT.MAIN.QUIT') },
                { combo: "mod + alt + shift + v", label: t('NAV.SPLITVIEW') }
            ],
            // group: t('SHORTCUT.GROUP.ACTIVE_VIEW')
            [
                { combo: isMac && "mod + left" || "alt + left", label: t('SHORTCUT.ACTIVE_VIEW.BACKWARD_HISTORY') },
                { combo: isMac && "mod + right" || "alt + right", label: t('SHORTCUT.ACTIVE_VIEW.FORWARD_HISTORY') },
                { combo: "meta + c", label: t('SHORTCUT.ACTIVE_VIEW.COPY') },
                { combo: "meta + v", label: t('SHORTCUT.ACTIVE_VIEW.PASTE') },
                { combo: "mod + shift + c", label: t('SHORTCUT.ACTIVE_VIEW.COPY_PATH') },
                { combo: "mod + shift + n", label: t('SHORTCUT.ACTIVE_VIEW.COPY_FILENAME') },
                { combo: "mod + o", label: t('SHORTCUT.ACTIVE_VIEW.OPEN_FILE') },
                { combo: "mod + a", label: t('SHORTCUT.ACTIVE_VIEW.SELECT_ALL') },
                { combo: "mod + i", label: t('SHORTCUT.ACTIVE_VIEW.SELECT_INVERT') },
                { combo: "mod + l", label: t('SHORTCUT.ACTIVE_VIEW.FOCUS_PATH') },
                { combo: "mod + n", label: t('COMMON.MAKEDIR') },
                { combo: "mod + d", label: t('SHORTCUT.ACTIVE_VIEW.DELETE') },
                { combo: "mod + k", label: t('SHORTCUT.ACTIVE_VIEW.OPEN_TERMINAL') },
                { combo: "backspace", label: t('SHORTCUT.ACTIVE_VIEW.PARENT_DIRECTORY') }
            ],
            [
                { combo: "ctrl + tab", label: t('APP_MENUS.SELECT_NEXT_TAB') },
                { combo: "ctrl + shift + tab", label: t('APP_MENUS.SELECT_PREVIOUS_TAB') },
                { combo: "mod + t", label: t('APP_MENUS.NEW_TAB') },
                { combo: "mod + w", label: t('SHORTCUT.TABS.CLOSE_ACTIVE_TAB') },
            ]
        ]
    }

    private onClose = () => {
        this.props.onClose();
    }

    public render() {
        const { t } = this.props;
        const shortcuts = this.buildList();

        return (
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
                        <h4 className={Classes.HEADING}>
                            {t('SHORTCUT.GROUP.ACTIVE_VIEW')}
                        </h4>
                        {shortcuts[1].map((shortcut) => (
                            <div key={shortcut.combo} className={Classes.HOTKEY}>
                                <div className={Classes.HOTKEY_LABEL}>{shortcut.label}</div>
                                <KeyCombo combo={shortcut.combo}></KeyCombo>
                            </div>
                        ))}
                        <h4 className={Classes.HEADING}>
                            {t('SHORTCUT.GROUP.TABS')}
                        </h4>
                        {shortcuts[2].map((shortcut) => (
                            <div key={shortcut.combo} className={Classes.HOTKEY}>
                                <div className={Classes.HOTKEY_LABEL}>{shortcut.label}</div>
                                <KeyCombo combo={shortcut.combo}></KeyCombo>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button onClick={this.onClose} className="data-cy-close">
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
