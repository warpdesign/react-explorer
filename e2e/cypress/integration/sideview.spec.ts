/// <reference types="cypress"/>

interface Window {
    appState: any;
}

// let win:Window;

describe('sideview initial state', () => {
    beforeEach(() => {
        cy.visit('http://127.0.0.1:8080').then((win) => {
            const caches = win.appState.caches;
            cy.log('appState', caches);
            // stub cd/list
            cy.stub(caches[0], 'cd', (path) => Promise.resolve(path)).as('cd');
            // cy.stub(caches[0], 'list', (path) => {
            //     cy.log('getting list !')
            //     return new Promise((resolve, reject) => {

            //     })
            // }).as('list');
        });
    });

    it('left view should be active', () => {
        cy.get('#view_0').should('have.class', 'active');
    });

    it('nav buttons are disabled', () => {
        cy.get('#view_0 [data-cy-backward]').should('be.disabled');
        cy.get('#view_0 [data-cy-forward]').should('be.disabled');
        cy.get('#view_0 [data-cy-paste-bt]').should('be.disabled');

        cy.get('#view_1 [data-cy-backward]').should('be.disabled');
        cy.get('#view_1 [data-cy-forward]').should('be.disabled');
        cy.get('#view_1 [data-cy-paste-bt]').should('be.disabled');
    });

    it('enter path and enter calls cd', () => {
        cy.get('#view_0 [data-cy-path]').type('/{enter}');
        // expect(stub_cd).to.be.called;
        cy.get('@cd').should('be.called');
    });

    it('enter path and escape', () => {
        cy.get('#view_0 [data-cy-path]')
            .type('/{esc}')
            .should('have.value', '');

        cy.get('@cd').should('not.be.called');
    });

    it('loads path as root', () => {
        cy.get('#view_0 [data-cy-path]').type('/{enter}');
        cy.CDAndList('/');
        // cy.window().then((win) => {
        //     cy.fixture('files.json').then((json) => {
        //         cy.log('plop', win.appState.caches);
        //         if (win.appState && win.appState.caches) {
        //             cy.log('yeah');
        //             win.appState.caches[0].files.replace(json);
        //         }
        //     });
        // });


        // TODO: check that we have files
    });
});