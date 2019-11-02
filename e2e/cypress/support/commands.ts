declare global {
    namespace Cypress {
        interface Chainable {
            /**
             * Yields "json object"
             *
             * @returns {typeof object}
             * @memberof Chainable
             * @example
             *    cy.CDAndList('/').then(json => ...)
             */
            CDAndList: typeof CDList;
            /**
             * Yields document.body
             *
             * @returns {typeof Body}
             * @memberof Chainable
             * @example
             *    cy.triggerHotkey('{meta}f').then(body => ...)
             */
            triggerHotkey: typeof triggerHotkey;
            /**
             * Yields document
             *
             * @returns {typeof Document}
             * @memberof Chainable
             * @example
             *    cy.triggerFakeCombo('CmdOrCtrl+Shift+C').then(doc => ...)
             */                        
            triggerFakeCombo: typeof triggerFakeCombo
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

export function triggerHotkey(hotkey: string, options = {}) {
    return cy.get("body").type(hotkey, options);
}

export function triggerFakeCombo(combo: string, data = { title: "hey!"}) {
    cy.log('triggering', { combo, data });
    return cy.document()
        .trigger('menu_accelerator', { combo, data } );
}

Cypress.Commands.add("CDAndList", CDList);
Cypress.Commands.add("triggerHotkey", triggerHotkey);
Cypress.Commands.add("triggerFakeCombo", triggerFakeCombo);
