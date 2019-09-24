/// <reference types="cypress"/>

interface Window {
    appState: any;
}

describe('toolbar', () => {
    const stubs: any = {
        cd: []
    };

    function createStubs() {
        stubs.cd = [];
        stubs.reload = [];

        cy.window().then(win => {
            const views = win.appState.views;
            for (let view of views) {
                for (let cache of view.caches) {
                    const stub = cy.stub(cache, 'cd', (path) => {
                        if (path.startsWith('/')) {
                            return Promise.resolve(path);
                        } else return Promise.reject({
                            message: '',
                            code: 0
                        });
                    });
                    stubs.cd.push(stub)
                    stubs.reload.push(cy.spy(cache, 'reload'));
                }
            }
        });
    }

    before(() => {
        return cy.visit('http://127.0.0.1:8080');
    });

    beforeEach(() => {
        createStubs();
        // load files
        cy.CDAndList(0, '/');
        cy.get('#view_0 [data-cy-path]').invoke('val', '/').focus();
    });

    it('nav buttons are disabled', () => {
        cy.get('#view_0 [data-cy-backward]').should('be.disabled');
        cy.get('#view_0 [data-cy-forward]').should('be.disabled');

        cy.get('#view_1 [data-cy-backward]').should('be.disabled');
        cy.get('#view_1 [data-cy-forward]').should('be.disabled');
    });

    it('type path and enter calls cd', () => {
        cy.get('#view_0 [data-cy-path]').type('/other_folder{enter}').then(() => {
            expect(stubs.cd[0]).to.be.called;
        });
    });

    it('type path and escape clears path with previous value', () => {
        cy.get('#view_0 [data-cy-path]').as('input')
            .invoke('val').then(val => {
                cy.log('got val', val);
                cy.get('@input').type('/var{esc}').then(input => {
                    cy.get('@input').should('have.value', val);
                    expect(stubs.cd[0]).not.to.be.called;
                });
            });
    });

    it('type non valid path should show alert then focus input', () => {
        cy.get('#view_0 [data-cy-path]')
            .type(':{enter}');

        cy.get('.data-cy-alert').should('be.visible').find('.bp3-button').click().then(() => {
            cy.get('#view_0 [data-cy-path]').should('have.value', ':');
            expect(stubs.cd[0]).to.be.called;
        });
    });

    it('path should get updated when fileState is updated', () => {
        cy.window().then(win => {
            win.appState.views[0].caches[0].updatePath('/newPath');
            cy.get('#view_0 [data-cy-path]').should('have.value', '/newPath');
        });
    });

    it('clicking on reload should reload path', () => {
        cy.get('#view_0 .data-cy-reload')
            .click().then(() => {
                expect(stubs.reload[0]).to.be.called;
            });
    });
});
