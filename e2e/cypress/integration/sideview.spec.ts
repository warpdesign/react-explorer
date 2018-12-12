/// <reference types="cypress"/>

describe('sideview initial state', () => {
    it('left view should be active', () => {
        cy.visit('http://127.0.0.1:8080')
        cy.get('#view_0').should('have.class', 'active');
        //
        cy.get('#view_0 [data-cy-backward]').should('be.disabled');
        cy.get('#view_0 [data-cy-forward]').should('be.disabled');
        cy.get('#view_0 [data-cy-paste-bt]').should('be.disabled');

        cy.get('#view_1 [data-cy-backward]').should('be.disabled');
        cy.get('#view_1 [data-cy-forward]').should('be.disabled');
        cy.get('#view_1 [data-cy-paste-bt]').should('be.disabled');
    });
});