import * as React from "react";
import { withNamespaces, WithNamespaces } from "react-i18next";
import { FormGroup, InputGroup, MenuItem, Button } from "@blueprintjs/core";
import { Select, ItemRenderer } from "@blueprintjs/select";
import { SettingsState } from "../../state/settingsState";
import { inject } from "mobx-react";

interface InjectedProps extends WithNamespaces{
    settingsState: SettingsState
}

interface IState {
    defaultFolder: string;
    darkMode: boolean | 'auto';
    lang: string;
}

interface Language{
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
class PrefsPanelClass extends React.Component<WithNamespaces, IState>{
    constructor(props:any) {
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

    getSortedLanguages():Array<Language> {
        const { t } = this.props;
        const auto = [{ code: "auto", "lang": t('COMMON.AUTO') }];
        const languages = t('LANG', { returnObjects: true }).sort((lang1:Language, lang2:Language) => {
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

    render() {
        const { t } = this.props;
        const { defaultFolder, darkMode, lang } = this.state;
        const languageItems = this.getSortedLanguages();
        const selectedLanguage = languageItems.find((language) => language.code === lang);
        const themeItems = this.getThemeList();
        const selectedTheme = themeItems.find((theme) => theme.code === darkMode);
        const activeTheme = this.injected.settingsState.isDarkModeActive ? t('DIALOG.PREFS.DARK') : t('DIALOG.PREFS.BRIGHT');

        return (<form>
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
        </form>);
    }
}

const PrefsPanel = withNamespaces()(PrefsPanelClass);

export { PrefsPanel };
