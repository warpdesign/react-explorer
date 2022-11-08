/// <reference types="cypress"/>

interface Window {
    appState: any;
    settingsState: any;
}

describe('app shortcuts', () => {
    before(() => {
        cy.visit('http://127.0.0.1:8080');
    });

    beforeEach(() => {
        cy.window().then((win) => {
            cy.log('appState', win.appState);
            const cache = win.appState.winStates[0].views[0].caches[0];
            cy.spy(cache, 'navHistory').as('navHistory');
        });
    });

    beforeEach(() => {
        cy.get('#view_0 [data-cy-path]').type('/{enter}').focus().blur();
    });

    it('alt + left should go backwards in history', () => {
        const key = Cypress.platform === 'darwin' ? '{meta}{leftarrow}' : '{alt}{leftarrow}';
        cy.get('body').type(key);
        cy.get('@navHistory').should('be.calledWithExactly', -1);
    });

    it('alt + right should go backwards in history', () => {
        const key = Cypress.platform === 'darwin' ? '{meta}{rightarrow}' : '{alt}{rightarrow}';
        cy.get('body').type(key);
        cy.get('@navHistory').should('be.calledWithExactly', 1);
    });

    it('changing settingsState.lang should update UI language', () => {
        cy.window().then((win) => {
            const currentLanguage = win.settingsState.lang;
            win.settingsState.setLanguage(currentLanguage === 'en' ? 'fr' : 'en');
            cy.get('.data-cy-explorer-tab').should('contain', currentLanguage === 'en' ? 'Explorateur' : 'Explorer');
        });
    });
});
