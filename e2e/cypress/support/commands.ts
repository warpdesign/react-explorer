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
            triggerHover: () => any;
            /**
             * Yields element
             *
             * @memberof Chainable
             * @example
             *    cy.toggleSplitView().then(els => ...)
             */
            toggleSplitView: () => any;
            // add missing call signatures from the documentation
            // see: https://github.com/cypress-io/cypress/issues/5617#event-2780995183
            rightclick(position: string, options?: any): any;
            rightclick(x: number, y: number, options?: any): any;
        }
    }
}

export function toggleSplitView() {
    return cy.get('.data-cy-toggle-splitview')
        .click();
}

export function addTab(viewId = 0) {
    return cy.get(`#view_${viewId} .tablist .addtab`)
        .click();
}

export function getTab(viewId = 0, tabIndex = 0) {
    return cy.get(`#view_${viewId} .tablist > button.tab`).eq(tabIndex);
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

// Cypress doesn't triggers css :hover events, see: https://github.com/cypress-io/cypress/issues/10
export function triggerHover(elements:any) {
    elements.each((index:any, element:any) => {
        fireEvent(element, 'mouseover');
    });
  
    function fireEvent(element:any, event:any) {
      if (element.fireEvent) {
        element.fireEvent('on' + event);
      } else {
        var evObj = document.createEvent('Events');
  
        evObj.initEvent(event, true, false);
  
        element.dispatchEvent(evObj);
      }
    }
    return elements;
};

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
Cypress.Commands.add("addTab", addTab);
Cypress.Commands.add("getTab", getTab);
Cypress.Commands.add("triggerHover", { prevSubject: true }, triggerHover);
Cypress.Commands.add("toggleSplitView", toggleSplitView);
