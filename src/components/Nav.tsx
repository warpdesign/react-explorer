import * as React from "react";
import { inject } from "mobx-react";
import {
    Navbar,
    Popover,
    Alignment,
    Button,
    Classes,
    Intent
} from "@blueprintjs/core";
import classnames from "classnames";
import { withNamespaces, WithNamespaces } from "react-i18next";
import { HamburgerMenu } from "./HamburgerMenu";
import { Badge } from "./Badge";
import { AppState } from "../state/appState";

interface InjectedProps extends WithNamespaces {
    appState: AppState;
}

@inject("appState")
class NavComponent extends React.Component<WithNamespaces> {
    appState: AppState = null;

    constructor(props: WithNamespaces) {
        super(props);

        this.appState = this.injected.appState;
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    showDownloadsTab = () => {
        this.appState.showDownloadsTab();
    };

    showExplorerTab = () => {
        this.appState.showExplorerTab();
    };

    navClick = () => {
        if (this.appState.isExplorer) {
            this.showDownloadsTab();
        } else {
            this.showExplorerTab();
        }
    };

    onOpenPrefs = () => {
        this.appState.isPrefsOpen = true;
    };

    onOpenShortcuts = () => {
        this.appState.isShortcutsOpen = true;
    };

    render() {
        const { t } = this.props;
        const isExplorer = this.appState.isExplorer;
        const count = this.appState.pendingTransfers;
        const badgeText = (count && count + "") || "";
        const badgeProgress = this.appState.totalTransferProgress;
        const downloadClass = classnames(Classes.MINIMAL, "download");

        return (
            <Navbar>
                <Navbar.Group align={Alignment.LEFT}>
                    <Navbar.Heading>
                        {t("APP_MENUS.ABOUT_TITLE")}
                    </Navbar.Heading>
                    <Navbar.Divider />
                    <Button
                        className={`${Classes.MINIMAL} data-cy-explorer-tab`}
                        icon="home"
                        text={t("NAV.EXPLORER")}
                        onClick={this.navClick}
                        intent={isExplorer ? Intent.PRIMARY : "none"}
                    />
                    <Button
                        style={{ position: "relative" }}
                        className={downloadClass}
                        icon="download"
                        onClick={this.navClick}
                        intent={!isExplorer ? Intent.PRIMARY : "none"}
                    >
                        {t("NAV.TRANSFERS")}
                        <Badge
                            intent="none"
                            text={badgeText}
                            progress={badgeProgress}
                        />
                    </Button>
                </Navbar.Group>
                <Navbar.Group align={Alignment.RIGHT}>
                    <Navbar.Divider />
                    <Popover
                        content={
                            <HamburgerMenu
                                onOpenShortcuts={this.onOpenShortcuts}
                                onOpenPrefs={this.onOpenPrefs}
                            />
                        }
                    >
                        <Button className={Classes.MINIMAL} icon="menu" />
                    </Popover>
                </Navbar.Group>
            </Navbar>
        );
    }
}

const Nav = withNamespaces()(NavComponent);

export { Nav };
