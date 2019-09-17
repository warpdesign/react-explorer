/// <reference types="cypress"/>

interface Window {
    appState: any;
}

describe('toolbar', () => {
    const stubs: any = {
        cd: []
    };

    beforeEach(() => {
        cy.visit('http://127.0.0.1:8080').then((win) => {
            const views = win.appState.views;
            // stub cd/list
            stubs.cd = [];


            for (let view of views) {
                let viewId = 0;
                for (let cache of view.caches) {
                    let cacheId = 0;
                    const stub = cy.stub(cache, 'cd', (path) => {
                        if (path === '/') return Promise.resolve(path); else return Promise.reject({
                            message: '',
                            code: 0
                        })
                    });
                    stubs.cd.push(stub)
                    cacheId++;
                }
                viewId++;
            }
            // cy.stub(caches[0], 'list', (path) => {
            //     cy.log('getting list !')
            //     return new Promise((resolve, reject) => {

            //     })
            // }).as('list');
        });
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
        cy.get('#view_0 [data-cy-path]').focus().type('/{enter}').then(() => {
            expect(stubs.cd[0]).to.be.called;
        });
    });

    it('enter path and escape clears path with previous value', () => {
        cy.get('#view_0 [data-cy-path]')
            .focus()
            .type('/var{esc}')
            .should('have.value', '');

        expect(stubs.cd[0]).not.to.be.called;
    });

    it.only('enter non valid path should show alert then focus input', () => {
        cy.get('#view_0 [data-cy-path]')
            .focus()
            .type(':{enter}');

        cy.get('.data-cy-alert').should('be.visible').find('.bp3-button').click().then(($el) => {
            cy.get('#view_0 [data-cy-path]').should('have.value', ':');
            expect(stubs.cd[0]).to.be.called;
        });
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