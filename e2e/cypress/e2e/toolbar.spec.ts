/// <reference types="cypress"/>

interface Window {
    appState: any
}

describe('toolbar', () => {
    function createStubs() {
        cy.window().then((win) => {
            const views = win.appState.winStates[0].views
            let count = 0
            for (const view of views) {
                for (const cache of view.caches) {
                    cy.stub(cache, 'cd', (path) => {
                        if (path.startsWith('/')) {
                            return Promise.resolve(path)
                        } else
                            return Promise.reject({
                                message: '',
                                code: 0,
                            })
                    }).as(`stub_cd${count}`)

                    cy.spy(cache, 'reload').as(`stub_reload${count}`)

                    count++
                }
            }
        })
    }

    before(() => {
        return cy.visit('http://127.0.0.1:8080').then(cy.waitForApp)
    })

    beforeEach(() => {
        createStubs()
        // load files
        cy.CDAndList(0, '/')
        cy.get('#view_0 [data-cy-path]').invoke('val', '/').focus()
    })

    it('nav buttons should be disabled', () => {
        cy.get('#view_0 [data-cy-backward]').should('be.disabled')
        cy.get('#view_0 [data-cy-forward]').should('be.disabled')
    })

    it('should restore previous input value when typing a new path and pressing escape', () => {
        cy.get('#view_0 [data-cy-path]').as('input').invoke('val').as('previous_value')

        // has already been called in beforeEach()
        cy.get('@stub_cd0').should('be.calledOnce')

        cy.get('@input').type('/sdfdsgsdg{esc}')

        cy.get('@previous_value').then((value) => {
            cy.get('@input').should('have.value', value)
        })

        cy.get('@stub_cd0').should('be.calledOnce')
    })

    it('should show an alert then focus input when typing a non valid path', () => {
        cy.get('#view_0 [data-cy-path]').type(':{enter}')

        cy.get('.data-cy-alert').should('be.visible').find('.bp5-button').click()

        cy.get('#view_0 [data-cy-path]').should('have.value', ':')

        cy.get('@stub_cd0').should('be.called')
    })

    it('should update the path when the fileState is updated', () => {
        cy.window().then((win) => {
            win.appState.winStates[0].views[0].caches[0].updatePath('/newPath')
            cy.get('#view_0 [data-cy-path]').should('have.value', '/newPath')
        })
    })

    it('should reload path when clicking on reload button', () => {
        cy.get('#view_0 .data-cy-reload').click()

        cy.get('@stub_reload0').should('be.called')
    })
})
