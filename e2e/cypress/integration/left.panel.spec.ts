/// <reference types="cypress"/>
import { Classes } from '@blueprintjs/core';
import { SHORTCUTS, isMac } from '../support/constants';

const MODIFIER = isMac ? '{alt}' : '{ctrl}';

describe('left panel', () => {
    let favoritesState: any = null;

    function createStubs() {
        cy.window().then((win) => {
            const views = win.appState.winStates[0].views;
            let count = 0;
            for (const view of views) {
                for (const cache of view.caches) {
                    cy.stub(cache, 'cd', (path) => {
                        if (path.startsWith('/')) {
                            return Promise.resolve(path);
                        } else
                            return Promise.reject({
                                message: '',
                                code: 0,
                            });
                    }).as('stub_cd' + count++);
                }
            }
        });
    }

    before(() => {
        cy.visit('http://127.0.0.1:8080', {
            onLoad: (win) => {
                favoritesState = win.appState.favoritesState;
            },
        });
    });

    beforeEach(() => {
        createStubs();
        // load files
        cy.CDAndList(0, '/');
        cy.get('#view_0 [data-cy-path]').invoke('val', '/').focus().blur();

        cy.get('.favoritesPanel > ul > li:eq(0)').as('shortcuts');

        cy.get('.favoritesPanel > ul > li:eq(1)').as('places');
    });

    it('should be visible and expanded', () => {
        cy.get('.favoritesPanel > ul > li')
            .should('be.visible')
            .and('have.class', Classes.TREE_NODE_EXPANDED)
            .its('length')
            .should('equal', 2);
    });

    it('clicking on section should toggle elements', () => {
        // check that shortcuts node is expanded and toggle it
        cy.get('@shortcuts')
            .should('have.class', Classes.TREE_NODE_EXPANDED)
            .find(`.${Classes.TREE_NODE_CARET}`)
            .click();

        // check that it's no longer expanded and toggle it
        cy.get('@shortcuts')
            .should('not.have.class', Classes.TREE_NODE_EXPANDED)
            .find(`.${Classes.TREE_NODE_CARET}`)
            .click();

        // check that shortcuts is expanded again
        cy.get('@shortcuts').should('have.class', Classes.TREE_NODE_EXPANDED);

        // same thing for the places
        cy.get('@places').should('have.class', Classes.TREE_NODE_EXPANDED).find(`.${Classes.TREE_NODE_CARET}`).click();

        cy.get('@places')
            .should('not.have.class', Classes.TREE_NODE_EXPANDED)
            .find(`.${Classes.TREE_NODE_CARET}`)
            .click();

        cy.get('@places').should('have.class', Classes.TREE_NODE_EXPANDED);
    });

    it(`should have all shortcuts`, () => {
        const length: number = favoritesState.shortcuts.length;
        cy.get('.favoritesPanel').contains('Shortcuts').should('be.visible');

        cy.get('@shortcuts').find('.bp3-tree-node-content-1').its('length').should('equal', length);

        SHORTCUTS.forEach((shortcut) => {
            cy.get('@shortcuts').contains(shortcut).should('be.visible');
        });
    });

    it(`should have all places`, () => {
        const length: number = favoritesState.places.length;
        cy.get('.favoritesPanel').contains('Places').should('be.visible');

        cy.get('@places').find('.bp3-tree-node-content-1').its('length').should('equal', length);

        favoritesState.places.forEach((place: any) => {
            cy.get('@places').contains(place.label).should('be.visible');
        });
    });

    it('should be updated when the list is updated', () => {
        // we only test place change because the list of shortcuts
        // is currently hardcoded and isn't supposed to change
        const places = favoritesState.places;
        const place = places[0];
        const newPlace = Object.assign({}, place);
        newPlace.path = '/Volumes/newpath';

        // add a new one
        favoritesState.places.push(newPlace);
        // update the first drive's label
        place.label = 'New Volume';

        // wait 5 secs: this is the delay we wait before updating drive list
        cy.wait(5000);

        cy.get('@places').find('.bp3-tree-node-content-1').its('length').should('equal', favoritesState.places.length);

        favoritesState.places.forEach((place: any) => {
            cy.get('@places').contains(place.label).should('be.visible');
        });
    });

    it('clicking on a volume should attempt to load its path', () => {
        const path = favoritesState.shortcuts[1].path;
        const label = SHORTCUTS[1];

        cy.get('.favoritesPanel > ul > li:eq(0) .bp3-tree-node-content-1').contains(label).click();

        cy.get('@stub_cd0').should('be.calledWith', path);
    });

    it('should target the second view when active', () => {
        cy.toggleSplitView();

        // check that we are in split view
        cy.get('#view_0').should('be.visible');

        cy.get('#view_1').should('be.visible');

        cy.get('@shortcuts').contains('cypress').click();

        cy.get('@stub_cd1').should('be.calledWith', '/cy/home');

        cy.get('@stub_cd0').should('not.be.called', '/cy/home');

        // toggle back split view mode
        cy.toggleSplitView();
    });

    it('should target the first view when active', () => {
        cy.toggleSplitView();

        // check that we are in split view
        cy.get('#view_0').should('be.visible');

        cy.get('#view_1').should('be.visible');

        cy.getTab(0, 0).click().should('have.class', Classes.INTENT_PRIMARY);

        // check that first view is active
        cy.get('#view_0').should('have.class', 'active');

        cy.get('@shortcuts').contains('cypress').click();

        cy.get('@stub_cd0').should('be.calledWith', '/cy/home');

        cy.get('@stub_cd1').should('not.be.called');

        cy.toggleSplitView();
    });

    it('should make favorite active if activeCache.path === favorite.path', () => {
        cy.CDAndList(0, '/cy/documents');
        cy.get('.favoritesPanel').contains('Documents').parents('li').should('have.class', Classes.TREE_NODE_SELECTED);
    });

    it('should not make favorite active if activeCache.path !== favorite.path', () => {
        cy.get(`.favoritesPanel > ul > li li.${Classes.TREE_NODE_SELECTED}`).should('not.exist');
    });

    it('should not update path is filecache is busy', () => {
        cy.window().then((win) => {
            const views = win.appState.winStates[0].views;
            const cache = views[0].caches[0];
            cache.status = 'busy';
        });

        cy.get('@shortcuts').contains('cypress').click();

        cy.get('@stub_cd0').should('not.be.called');
    });

    describe('click on favorites with alt/ctrl key down', () => {
        it('should show&activate second view, open a new tab, if splitview is off', () => {
            cy.get('#view_0').should('be.visible');

            cy.get('#view_1').should('not.be.visible');

            cy.get('body').type(MODIFIER, { release: false });

            cy.get('@shortcuts').contains('cypress').click();

            cy.get('@stub_cd0').should('not.be.called');
            cy.get('@stub_cd1').should('not.be.called');

            // check that a new tab has been created,
            // is active, and has the correct path
            cy.getTab(1, 1).should('have.class', Classes.INTENT_PRIMARY).contains('/cy/home').should('exist');

            cy.get('#view_1').should('have.class', 'active');

            // toggle back split view mode
            cy.toggleSplitView();
        });

        it('should activate second view, open a new tab, if splitview is on', () => {
            cy.get('.data-cy-toggle-splitview').click();

            // activate view one because splitview will activate the second view
            cy.getTab(0, 0).click();

            cy.get('#view_0').should('be.visible');

            cy.get('body').type(MODIFIER, { release: false });

            cy.get('@shortcuts').contains('cypress').click();

            cy.get('@stub_cd0').should('not.be.called');
            cy.get('@stub_cd1').should('not.be.called');

            // check that a new tab has been created,
            // is active, and has the correct path
            cy.getTab(1, 1).should('have.class', Classes.INTENT_PRIMARY).contains('/cy/home').should('exist');

            cy.get('#view_1').should('have.class', 'active');

            // toggle back split view mode
            cy.toggleSplitView();
        });

        it('should activate first view, open a new tab, if splitview is on and second view is active', () => {
            cy.get('.data-cy-toggle-splitview').click();

            // activate view one because splitview will activate the second view
            cy.getTab(1, 0).click();

            cy.get('#view_1').should('be.visible');

            cy.get('body').type(MODIFIER, { release: false });

            cy.get('@shortcuts').contains('cypress').click();

            cy.get('@stub_cd0').should('not.be.called');
            cy.get('@stub_cd1').should('not.be.called');

            // check that a new tab has been created,
            // is active, and has the correct path
            cy.getTab(0, 1).should('have.class', Classes.INTENT_PRIMARY).contains('/cy/home').should('exist');

            cy.get('#view_0').should('have.class', 'active');

            // toggle back split view mode
            cy.toggleSplitView();
        });
    });
});
