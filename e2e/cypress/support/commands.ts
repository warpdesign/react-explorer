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

export function CDList(viewId = 0, path: string, fixture = 'files.json') {
    return cy.window().then((win) => {
        cy.fixture(fixture).then((json) => {
            if (win.appState && win.appState.caches) {
                win.appState.views[viewId].caches[0].updatePath(path);
                win.appState.views[viewId].caches[0].files.replace(json);
                return json;
            }
        });
    });
}

Cypress.Commands.add('CDAndList', CDList);