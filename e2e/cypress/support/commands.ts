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
            CDAndList: typeof CDList;
            triggerHotkey: typeof triggerHotkey;
        }
    }
}

export function CDList(viewId = 0, path: string, fixture = "files.json") {
    return cy.window().then(win => {
        cy.fixture(fixture).then(json => {
            if (win.appState && win.appState.caches) {
                const fileCache = win.appState.winStates[0].views[viewId].caches[0];
                fileCache.updatePath(path);
                fileCache.files.replace(json);
                fileCache.setStatus("ok");
                return json;
            }
        });
    });
}

export function triggerHotkey(hotkey: string) {
    return cy.get("body").type(hotkey);
}

Cypress.Commands.add("CDAndList", CDList);
Cypress.Commands.add("triggerHotkey", triggerHotkey);
