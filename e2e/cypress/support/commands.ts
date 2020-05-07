declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
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
            triggerFakeCombo: typeof triggerFakeCombo;
            /**
             * Yields tab
             *
             * @returns {typeof Button}
             * @memberof Chainable
             * @example
             *    cy.addTab(0).then(button => ...)
             */
            addTab: typeof addTab;
            /**
             * Yields tab
             *
             * @returns {typeof Button}
             * @memberof Chainable
             * @example
             *    cy.getTab(0, 0).then(tab => ...)
             */
            getTab: typeof getTab;
            /**
             * Yields elements
             *
             * @memberof Chainable
             * @example
             *    cy.triggerHover().then(els => ...)
             */
            triggerHover: () => Chainable<HTMLElement>;
            /**
             * Yields element
             *
             * @memberof Chainable
             * @example
             *    cy.toggleSplitView().then(els => ...)
             */
            toggleSplitView: () => Chainable<HTMLElement>;
            // add missing call signatures from the documentation
            // see: https://github.com/cypress-io/cypress/issues/5617#event-2780995183
            rightclick(position: string, options?: any): Chainable<HTMLElement>;
            rightclick(x: number, y: number, options?: any): Chainable<HTMLElement>;
        }
    }
}

export function toggleSplitView(): Chainable<HTMLElement> {
    return cy.get('.data-cy-toggle-splitview').click();
}

export function addTab(viewId = 0): Chainable<HTMLElement> {
    return cy.get(`#view_${viewId} .tablist .addtab`).click();
}

export function getTab(viewId = 0, tabIndex = 0): Chainable<HTMLElement> {
    return cy.get(`#view_${viewId} .tablist > button.tab`).eq(tabIndex);
}

export function CDList(viewId = 0, path: string, splice = 0, fixture = 'files.json'): Chainable<undefined> {
    return cy.window().then((win) => {
        cy.fixture(fixture).then((json) => {
            if (win.appState && win.appState.caches) {
                const files = json.splice(splice);
                const fileCache = win.appState.winStates[0].views[viewId].caches[0];
                fileCache.updatePath(path);
                fileCache.files.replace(files);
                fileCache.setStatus('ok');
                return files;
            }
        });
    });
}

// Cypress doesn't triggers css :hover events, see: https://github.com/cypress-io/cypress/issues/10
export function triggerHover(elements: any) {
    function fireEvent(element: HTMLElement, event: string): void {
        const evObj = document.createEvent('Events');

        evObj.initEvent(event, true, false);

        element.dispatchEvent(evObj);
    }

    elements.each((index: number, element: HTMLElement) => {
        fireEvent(element, 'mouseover');
    });

    return elements;
}

export function triggerHotkey(hotkey: string, options = {}): Chainable<HTMLElement> {
    return cy.get('body').type(hotkey, options);
}

export function triggerFakeCombo(combo: string, data = { title: 'hey!' }): Chainable<HTMLElement> {
    cy.log('triggering', { combo, data });
    return cy.document().trigger('menu_accelerator', { combo, data });
}

Cypress.Commands.add('CDAndList', CDList);
Cypress.Commands.add('triggerHotkey', triggerHotkey);
Cypress.Commands.add('triggerFakeCombo', triggerFakeCombo);
Cypress.Commands.add('addTab', addTab);
Cypress.Commands.add('getTab', getTab);
Cypress.Commands.add('triggerHover', { prevSubject: true }, triggerHover);
Cypress.Commands.add('toggleSplitView', toggleSplitView);
