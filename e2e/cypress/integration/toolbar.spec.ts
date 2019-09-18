/// <reference types="cypress"/>

interface Window {
    appState: any;
    foo: any,
    fooStub: any
}

describe('toolbar', () => {
    const stubs: any = {
        cd: []
    };

    function createStubs() {
        // console.log('createStubs', window, window.appState.caches);
        // stub cd/list
        stubs.cd = [];

        cy.window().then(win => {
            const views = win.appState.views;
            for (let view of views) {
                for (let cache of view.caches) {
                    const stub = cy.stub(cache, 'cd', (path) => {
                        if (path === '/') {
                            return Promise.resolve(path);
                        } else return Promise.reject({
                            message: '',
                            code: 0
                        });
                    });
                    stubs.cd.push(stub)
                }
            }
        });
    }

    before(() => {
        return cy.visit('http://127.0.0.1:8080');
    });

    beforeEach(() => {
        createStubs();
        cy.get('#view_0 [data-cy-path]').clear().focus();
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
        cy.get('#view_0 [data-cy-path]').type('/{enter}').then(() => {
            expect(stubs.cd[0]).to.be.called;
        });
    });

    it('enter path and escape clears path with previous value', () => {
        cy.get('#view_0 [data-cy-path]')
            .type('/var{esc}')
            .should('have.value', '').should(() => {
                expect(stubs.cd[0]).not.to.be.called;
            });
    });

    it('enter non valid path should show alert then focus input', () => {
        cy.get('#view_0 [data-cy-path]')
            .type(':{enter}');

        cy.get('.data-cy-alert').should('be.visible').find('.bp3-button').click().then(() => {
            cy.get('#view_0 [data-cy-path]').should('have.value', ':');
            expect(stubs.cd[0]).to.be.called;
        });
    });
});