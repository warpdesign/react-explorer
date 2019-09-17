/// <reference types="cypress"/>

interface Window {
    appState: any;
}

// let win:Window;

describe('sideview initial state', () => {
    const stubs: any = {
        cd: []
    };

    beforeEach(() => {
        cy.visit('http://127.0.0.1:8080').then((win) => {
            const views = win.appState.views;
            cy.log('appState views', views);
        });
    });

    it('left view should be active', () => {
        cy.get('#view_0').should('have.class', 'active');
    });
});