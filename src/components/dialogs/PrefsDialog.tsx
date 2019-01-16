import * as React from "react";
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup, MenuItem } from "@blueprintjs/core";
import { debounce } from "../../utils/debounce";
import { withNamespaces, WithNamespaces } from "react-i18next";
import { SettingsState } from "../../state/settingsState";
import { inject } from "mobx-react";
import { Select, ItemRenderer } from "@blueprintjs/select";

const DEBOUNCE_DELAY = 300;

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
            defaultFolder: settingsState.defaultFolder
        };
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private isValid(path: string): boolean {
        return false;
        // const valid = this.props.onValidation(path);
        // console.log('valid', path, valid);
        // return valid;
    }

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
        this.props.onClose();
    }

    onFolderChange = () => {
        // clear state.error
        // check path validity
        // if valid: update settings.defaultFolder
        // else show error
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
    }

    onThemeSelect = (newTheme: Theme) => {
        const { settingsState } = this.injected;
        this.setState({ darkMode: newTheme.code });
        settingsState.setActiveTheme(newTheme.code);
    }

    public render() {
        const { t } = this.props;
        const { defaultFolder, darkMode, lang } = this.state;
        const languageItems = this.getSortedLanguages();
        const selectedLanguage = languageItems.find((language) => language.code === lang);
        const themeItems = this.getThemeList();
        const selectedTheme = themeItems.find((theme) => theme.code === darkMode);
        const activeTheme = this.injected.settingsState.isDarkModeActive ? t('DIALOG.PREFS.DARK') : t('DIALOG.PREFS.BRIGHT');

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
                        labelFor="default-folder"
                        labelInfo={t('DIALOG.PREFS.DEFAULT_FOLDER')}
                    >
                        <InputGroup
                            onChange={this.onFolderChange}
                            value={defaultFolder}
                            leftIcon="folder-close"
                            placeholder={t('DIALOG.PREFS.DEFAULT_FOLDER')}
                            id="default-folder"
                            name="default-folder"
                            autoFocus
                        />
                    </FormGroup>
                    <FormGroup
                        inline={true}
                        labelInfo={t('DIALOG.PREFS.LANGUAGE')}>
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
