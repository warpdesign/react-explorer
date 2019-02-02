import * as React from "react";
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup, MenuItem, Tooltip } from "@blueprintjs/core";
import { debounce } from "../../utils/debounce";
import { withNamespaces, WithNamespaces } from "react-i18next";
import { SettingsState } from "../../state/settingsState";
import { inject } from "mobx-react";
import { Select, ItemRenderer } from "@blueprintjs/select";
import { FsLocal, FolderExists } from "../../services/FsLocal";
import { remote, ipcRenderer } from "electron";

const DEBOUNCE_DELAY = 300;
const HOME_DIR = remote.app.getPath('home');

interface IPrefsProps extends WithNamespaces{
    isOpen: boolean;
    onClose: Function;
}

interface InjectedProps extends IPrefsProps{
    settingsState: SettingsState;
}

interface IState {
    defaultFolder: string;
    darkMode: boolean | 'auto';
    lang: string;
    isFolderValid: boolean;
    defaultTerminal: string;
}

interface Language {
    lang: string;
    code: string;
};

interface Theme {
    name: string;
    code: boolean | 'auto';
};

const LanguageSelect = Select.ofType<Language>();
const ThemeSelect = Select.ofType<Theme>();

@inject('settingsState')
class PrefsDialogClass extends React.Component<IPrefsProps, IState>{
    constructor(props:IPrefsProps) {
        super(props);

        const { settingsState } = this.injected;

        this.state = {
            lang: settingsState.lang,
            darkMode: settingsState.darkMode,
            defaultFolder: settingsState.defaultFolder,
            isFolderValid: FsLocal.canread(settingsState.defaultFolder) && FolderExists(settingsState.defaultFolder),
            defaultTerminal: settingsState.defaultTerminal
        };
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private checkPath: () => any = debounce(
        () => {
            const { defaultFolder } = this.state;
            const { settingsState } = this.injected;
            const isFolderValid = FsLocal.canread(defaultFolder) && FolderExists(defaultFolder);
            if (defaultFolder !== settingsState.defaultFolder) {
                this.setState({ isFolderValid });
                // need to save settings
                if (isFolderValid) {
                    settingsState.setDefaultFolder(defaultFolder);
                    settingsState.saveSettings();
                }
            }
        }, DEBOUNCE_DELAY);

    private cancelClose = () => {
        console.log('handleClose');
        this.props.onClose();
    }

    onFolderChange = (event: React.FormEvent<HTMLElement>) => {
        const path = (event.target as HTMLInputElement).value;
        // set error since path will be checked async
        this.setState({ defaultFolder:path });
        this.checkPath();
    }

    renderLanguageItem: ItemRenderer<Language> = (lang, { handleClick, modifiers }) => {
        return (
            <MenuItem
                active={modifiers.active}
                key={lang.code}
                label={lang.code}
                onClick={handleClick}
                text={lang.lang}
            />
        );
    };

    renderThemeItem: ItemRenderer<Theme> = (theme, { handleClick, modifiers }) => {
        return (
            <MenuItem
                active={modifiers.active}
                key={theme.code.toString()}
                onClick={handleClick}
                text={theme.name}
            />
        );
    };

    getSortedLanguages(): Array<Language> {
        const { t } = this.props;
        const auto = [{ code: "auto", "lang": t('COMMON.AUTO') }];
        const languages = t('LANG', { returnObjects: true }).sort((lang1: Language, lang2: Language) => {
            if (lang1.lang < lang2.lang) {
                return -1
            } else return lang1.lang > lang2.lang ? 1 : 0;
        });

        return auto.concat(languages);
    }

    getThemeList(): Array<Theme> {
        const { t } = this.props;

        return [
            {
                code: "auto",
                name: t('COMMON.AUTO')
            },
            {
                code: true,
                name: t('DIALOG.PREFS.DARK')
            },
            {
                code: false,
                name: t('DIALOG.PREFS.BRIGHT')
            }
        ]
    }

    onLanguageSelect = (newLang: Language) => {
        const { settingsState } = this.injected;
        this.setState({ lang: newLang.code });
        settingsState.setLanguage(newLang.code);
        settingsState.saveSettings();
    }

    onThemeSelect = (newTheme: Theme) => {
        const { settingsState } = this.injected;
        this.setState({ darkMode: newTheme.code });
        settingsState.setActiveTheme(newTheme.code);
        settingsState.saveSettings();
    }

    onResetPrefs = () => {
        const { settingsState } = this.injected;
        settingsState.resetSettings();
        this.setState({
            lang: settingsState.lang,
            darkMode: settingsState.darkMode,
            defaultFolder: settingsState.defaultFolder,
            defaultTerminal: settingsState.defaultTerminal
        });
    }

    onTerminalChange = (event: React.FormEvent<HTMLElement>) => {
        const { settingsState } = this.injected;
        const terminal = (event.target as HTMLInputElement).value;
        this.setState({ defaultTerminal: terminal });
        settingsState.setDefaultTerminal(terminal);
        settingsState.saveSettings();
    }

    testTerminal = () => {
        const { settingsState } = this.injected;
        const path = settingsState.getTerminalCommand(HOME_DIR);
        ipcRenderer.send('openTerminal', path);
    }

    public render() {
        const { t } = this.props;
        const { isFolderValid, defaultFolder, defaultTerminal, darkMode, lang } = this.state;
        const languageItems = this.getSortedLanguages();
        const selectedLanguage = languageItems.find((language:Language) => language.code === lang);
        const themeItems = this.getThemeList();
        const selectedTheme = themeItems.find((theme:Theme) => theme.code === darkMode);
        const activeTheme = this.injected.settingsState.isDarkModeActive ? t('DIALOG.PREFS.DARK') : t('DIALOG.PREFS.BRIGHT');
        const intent: Intent = isFolderValid ? Intent.NONE : Intent.DANGER;
        const testTerminalButton = (<Tooltip content={t('DIALOG.PREFS.TEST_TERMINAL')}>
            <Button
                icon="play"
                intent={Intent.PRIMARY}
                minimal={true}
                onClick={this.testTerminal}
            />
        </Tooltip>);

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
                    <FormGroup
                        inline={true}
                        labelInfo={t('DIALOG.PREFS.LANGUAGE')}
                        >
                        <LanguageSelect filterable={false} activeItem={selectedLanguage} items={languageItems} itemRenderer={this.renderLanguageItem} onItemSelect={this.onLanguageSelect}>
                            <Button
                                icon="flag"
                                rightIcon="caret-down"
                                text={`${selectedLanguage.lang}`}
                            />
                        </LanguageSelect>
                    </FormGroup>

                    <FormGroup
                        inline={true}
                        labelInfo={t('DIALOG.PREFS.THEME')}>
                        <ThemeSelect filterable={false} activeItem={selectedTheme} items={themeItems} itemRenderer={this.renderThemeItem} onItemSelect={this.onThemeSelect}>
                            <Button
                                icon="contrast"
                                rightIcon="caret-down"
                                text={selectedTheme.code === 'auto' ? `${selectedTheme.name} (${activeTheme})` : `${selectedTheme.name}`}
                            />
                        </ThemeSelect>
                    </FormGroup>

                    <FormGroup
                        inline={true}
                        labelFor="default-folder"
                        labelInfo={t('DIALOG.PREFS.DEFAULT_FOLDER')}
                        helperText={isFolderValid ? (<span>&nbsp;</span>) : (<span>{t('DIALOG.PREFS.INVALID_FOLDER')}</span>)}
                        intent={intent}
                    >
                        <InputGroup
                            onChange={this.onFolderChange}
                            value={defaultFolder}
                            leftIcon="folder-close"
                            placeholder={t('DIALOG.PREFS.DEFAULT_FOLDER')}
                            id="default-folder"
                            name="default-folder"
                            title={defaultFolder}
                        />
                    </FormGroup>

                    <FormGroup
                        inline={true}
                        labelFor="default-terminal"
                        labelInfo={t('DIALOG.PREFS.DEFAULT_TERMINAL')}
                        helperText={t('DIALOG.PREFS.DEFAULT_TERMINAL_HELP')}
                    >
                        <InputGroup
                            onChange={this.onTerminalChange}
                            value={defaultTerminal}
                            rightElement={testTerminalButton}
                            leftIcon="console"
                            placeholder={t('DIALOG.PREFS.DEFAULT_TERMINAL')}
                            id="default-terminal"
                            name="default-terminal"
                            title={defaultTerminal}
                        />
                    </FormGroup>

                    <FormGroup></FormGroup>

                    <FormGroup
                        inline={true}
                        intent="danger"
                        helperText={t('DIALOG.PREFS.RESET_HELP')}>
                            <Button
                                icon="trash"
                                intent="primary"
                                text={t('DIALOG.PREFS.RESET')}
                                onClick={this.onResetPrefs}
                            />
                    </FormGroup>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button onClick={this.cancelClose}>
                            {t('COMMON.CLOSE')}
                    </Button>
                </div>
            </div>
            </Dialog>
        )
    }
}

const PrefsDialog = withNamespaces()(PrefsDialogClass);

export { PrefsDialog };
