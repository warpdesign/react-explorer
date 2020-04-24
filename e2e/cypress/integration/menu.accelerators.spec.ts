/// <reference types="cypress"/>

import { Classes } from "@blueprintjs/core";

/**
 * NOTE: Combos are events that are supposed to be sent from the main process
 * after a menu (or its associated shortcut) has been selected.
 * 
 * Since we are running inside the browser (Electron testing support is coming soon,
 * see: https://www.cypress.io/blog/2019/09/26/testing-electron-js-applications-using-cypress-alpha-release/),
 * we are sending fake combo events to simulate the user selecting a menu item or pressing the associated
 * accelerator combo.
 */
describe("combo hotkeys", () => {
    let caches:any;

    function resetSelection() {
        cy.window().then(win => {
            win.appState.winStates[0].views.forEach((view: any) => {
                caches = 
                view.caches.forEach((cache: any) => {
                    cache.reset();
                });
            });
        });
    }

    function createStubs() {
        cy.window().then(win => {
            const { appState } = win;
            const winState = appState.winStates[0];
            const view = winState.views[0];
            
            winState.splitView = true;

            // stub copy/paste functions
            cy.stub(appState, 'copySelectedItemsPath')
                .as('copySelectedItemsPath');
            // stub reload view
            cy.stub(appState, 'refreshActiveView')
                .as('refreshActiveView');
            // stub first cache.openTerminal
            cy.stub(view.caches[0], 'openTerminal')
                .as('openTerminal');
            // stub first view.cycleTab
            cy.stub(view, 'cycleTab')
                .as('cycleTab');
            // stub first view.addCache
            cy.stub(view, 'addCache')
                .as('addCache');
            // stub first view.closeTab
            cy.stub(view, 'closeTab')
                .as('closeTab');
            // stub first win.toggleSplitView
            cy.spy(winState, 'toggleSplitViewMode')
                .as('toggleSplitViewMode');
        });
    }

    function getCaches() {
        cy.window().then(win => {
            caches = win.appState.winStates[0].views[0].caches;
        });
    }

    before(() => {
        return cy.visit("http://127.0.0.1:8080");
    });

    beforeEach(() => {
        createStubs();
        resetSelection();
        getCaches();
        // load files
        cy.CDAndList(0, "/");
        cy.get("#view_0 [data-cy-path]")
            .invoke("val", "/")
            .focus()
            .blur();
    });

    it("should not show toast message on copy path if no file selected", () => {
        // no selection: triggering fake combo should not show toast message
        cy.triggerFakeCombo("CmdOrCtrl+Shift+C");

        cy.get(`.${Classes.TOAST}`)
            .should('not.be.visible');

        cy.get('@copySelectedItemsPath')
        .should('be.calledWith', caches[0], false);
    });

    it("should copy file path to cb & show toast message if a file is selected", () => {
        // select first element
        cy.get("#view_0 [data-cy-file]:first")
            .click();

        cy.triggerFakeCombo("CmdOrCtrl+Shift+C");

        cy.get('@copySelectedItemsPath')
            .should('be.calledWith', caches[0], false);

        cy.get(`.${Classes.TOAST}`)
            .should('be.visible')
            .find('button')
            .click();
    });

    it("should not show toast message on copy filename if no file selected", () => {
        // no selection: triggering fake combo should not show toast message
        cy.triggerFakeCombo("CmdOrCtrl+Shift+N");

        cy.get(`.${Classes.TOAST}`)
            .should('not.be.visible');

        cy.get('@copySelectedItemsPath')
            .should('be.calledWith', caches[0], true);
    });

    it("should copy file filename & show toast message if a file is selected", () => {
        // select first element
        cy.get("#view_0 [data-cy-file]:first")
            .click();

        cy.triggerFakeCombo("CmdOrCtrl+Shift+N");

        cy.get('@copySelectedItemsPath')
            .should('be.calledWith', caches[0], true);

        cy.get(`.${Classes.TOAST}`)
            .should('be.visible')
            .find('button')
            .click();
    });

    it("should open shortcuts dialog", () => {
        cy.triggerFakeCombo("CmdOrCtrl+S");

        cy.get('.shortcutsDialog')
            .should('be.visible');

        // close dialog
        cy.get(`.${Classes.DIALOG_FOOTER} .data-cy-close`)
            .click();

        // wait for dialog to be closed otherwise
        // it could still be visible in next it()
        cy.get('.shortcutsDialog')
            .should('not.be.visible');
    });

    it("should open prefs dialog", () => {
        cy.triggerFakeCombo("CmdOrCtrl+,");

        cy.get('.data-cy-prefs-dialog')
            .should('be.visible');

        // close dialog
        cy.get(`.${Classes.DIALOG_FOOTER} .data-cy-close`)
            .click();

        // wait for dialog to be closed otherwise
        // it could still be visible in next it()
        cy.get('.shortcutsDialog')
            .should('not.be.visible');
    });

    it("should reload file view", () => {
        cy.triggerFakeCombo("CmdOrCtrl+R");

        cy.get('@refreshActiveView')
            .should('be.calledOnce');
    });

    it("should open terminal", () => {
        cy.triggerFakeCombo("CmdOrCtrl+K");

        cy.get('@openTerminal')
            .should('be.calledOnce');
    });

    it("should activate next tab", () => {
        cy.triggerFakeCombo("Ctrl+Tab");

        cy.get('@cycleTab')
            .should('be.calledOnce')
            .should('be.calledWith', 1);
    });

    it("should activate previous tab", () => {
        cy.triggerFakeCombo("Ctrl+Shift+Tab");

        cy.get('@cycleTab')
            .should('be.calledOnce')
            .should('be.calledWith', -1);
    });

    it("should open a new tab", () => {
        cy.triggerFakeCombo("CmdOrCtrl+T");

        cy.get('@addCache')
            .should('be.calledOnce');
    });

    it("should close tab", () => {
        cy.triggerFakeCombo("CmdOrCtrl+W");

        cy.get('@closeTab')
            .should('be.calledOnce');
    });

    it("should toggle split view", () => {
        // initial state: split view active
        cy.get("#view_1")
            .should("not.have.class", "active")
            .and('be.visible');

            cy.get("#view_0")
            .should("have.class", "active")
            .and('be.visible');

        // de-activate split view
        cy.triggerFakeCombo("CmdOrCtrl+Shift+Alt+V");

        // check status: we should have only one call
        cy.get('@toggleSplitViewMode')
            .should('be.calledOnce');

        cy.get("#view_0")
            .should('be.visible')
            .and('have.class', 'active');

        cy.get("#view_1")
            .should('not.be.visible');

        // re-activate split view
        cy.triggerFakeCombo("CmdOrCtrl+Shift+Alt+V");

        // check status: should have two calls now
        cy.get('@toggleSplitViewMode')
            .should('be.calledTwice');

        cy.get("#view_0")
            .should('be.visible')
            .and('not.have.class', 'active');

        cy.get("#view_1")
            .should('be.visible')
            .and('have.class', 'active');
    });
});
