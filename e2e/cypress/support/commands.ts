declare global {
    namespace Cypress {
        interface Chainable {
            /**
             * Yields "foo"
             *
             * @returns {typeof foo}
             * @memberof Chainable
             * @example
             *    cy.foo().then(f = ...) // f is "foo"
             */
            CDAndList: typeof CDList

        }
    }
}

export function CDList(path: string, fixture = 'files.json') {
    return cy.window().then((win) => {
        cy.fixture(fixture).then((json) => {
            cy.log('plop', win.appState.caches);
            if (win.appState && win.appState.caches) {
                cy.log('yeah');
                win.appState.caches[0].updatePath(path);
                win.appState.caches[0].files.replace(json);
            }
        });
    });
}

Cypress.Commands.add('CDAndList', CDList);