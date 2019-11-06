/// <reference types="cypress"/>
import { Classes } from '@blueprintjs/core';

describe('app shortcuts', () => {
    before(() => {
        cy.visit('http://127.0.0.1:8080');
    });

    beforeEach(() => {
        // load files
        cy.CDAndList(0, "/");
        cy.get("#view_0 [data-cy-path]")
            .invoke("val", "/")
            .focus()
            .blur();
    });

    it('explorer tab should be active', () => {
        cy.get('.data-cy-explorer-tab')
        .should('have.class', Classes.INTENT_PRIMARY)

        cy.get(".downloads").should("not.exist");
        cy.get(".sideview.active").should("be.visible");
        cy.get(".favoritesPanel").should("be.visible");
    });

    it('click on nav tabs should activate each tab', () => {
        cy.get('.data-cy-downloads-tab')
        .click()
        .should('have.class', Classes.INTENT_PRIMARY)
        .then(() => {
            cy.get('.data-cy-explorer-tab')
            .should('not.have.class', Classes.INTENT_PRIMARY);

            cy.get(".downloads").should("exist");
            cy.get(".sideview.active").should("not.be.visible");
            cy.get(".favoritesPanel").should("not.be.visible");
        });

        cy.get('.data-cy-explorer-tab')
        .click()
        .should('have.class', Classes.INTENT_PRIMARY)
        .then(() => {
            cy.get('.data-cy-downloads-tab')
            .should('not.have.class', Classes.INTENT_PRIMARY);

            cy.get(".downloads").should("not.exist");
            cy.get(".sideview.active").should("be.visible");
            cy.get(".favoritesPanel").should("be.visible");
        });
    });

    it('click on split should toggle split view', () => {
        cy.get('.data-cy-toggle-splitview')
        .click()
        .should('have.class', Classes.INTENT_PRIMARY)
        .should('have.class', Classes.ACTIVE);

        cy.get('#view_1')
        .should('be.visible');

        cy.get('.data-cy-toggle-splitview')
        .click()
        .should('not.have.class', Classes.INTENT_PRIMARY)
        .should('not.have.class', Classes.ACTIVE);

        cy.get('#view_1')
        .should('not.be.visible');
    });

    it('click on app menu should toggle app menu', () => {
        cy.get('.data-cy-toggle-app-menu')
        .click()
        .should('have.class', Classes.ACTIVE);

        cy.get('.data-cy-app-menu')
        .should('be.visible');

        cy.get('.data-cy-toggle-app-menu')
        .click()
        .should('not.have.class', Classes.ACTIVE);

        cy.get('.data-cy-app-menu')
        .should('not.be.visible');
    });
});
