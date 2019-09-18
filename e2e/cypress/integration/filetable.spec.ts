/// <reference types="cypress"/>

interface Window {
    appState: any;
}

describe('toolbar', () => {
    before(() => {
        cy.visit('http://127.0.0.1:8080');
    });

    it('should display files if cache is not empty', () => {
        cy.get('#view_0 [data-cy-path]').type('/{enter}');
        // load files
        cy.CDAndList(0, '/');
        // check some files are displayed
        cy.get('#view_0 [data-cy-file]').its('length').should('be.gt', 0);
    });
});