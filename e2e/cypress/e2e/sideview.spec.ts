/// <reference types="cypress"/>

describe('sideview initial state', () => {
    before(() => {
        cy.visit('http://127.0.0.1:8080').then(cy.waitForApp)
    })

    it('left view should be active', () => {
        cy.get('#view_0').should('have.class', 'active')
    })
})
