/// <reference types="cypress"/>
import { Classes } from '@blueprintjs/core';
import { SHORTCUTS } from '../support/constants';

describe('left panel', () => {
    let favoritesState:any = null;

    const stubs: any = {
        cd: []
    };

    function createStubs() {
        stubs.cd = [];

        cy.window().then(win => {
            const views = win.appState.winStates[0].views;
            for (let view of views) {
                for (let cache of view.caches) {
                    const stub = cy.stub(cache, "cd", path => {
                        if (path.startsWith("/")) {
                            return Promise.resolve(path);
                        } else
                            return Promise.reject({
                                message: "",
                                code: 0
                            });
                    });
                    stubs.cd.push(stub);
                }
            }
        });
    }

    before(() => {
        cy.visit('http://127.0.0.1:8080', {
            onLoad: (win) => {
               favoritesState = win.appState.favoritesState;
            }
        });
    });

    beforeEach(() => {
        createStubs();
        // load files
        cy.CDAndList(0, "/");
        cy.get("#view_0 [data-cy-path]")
            .invoke("val", "/")
            .focus()
            .blur();
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
        cy.get('.favoritesPanel > ul > li:eq(0)')
        .as('shortcuts')
        .should('have.class', Classes.TREE_NODE_EXPANDED)
        .find(`.${Classes.TREE_NODE_CARET}`)
        .click();

        // check that it's no longer expanded and toggle it
        cy.get('@shortcuts')
        .should('not.have.class', Classes.TREE_NODE_EXPANDED)
        .find(`.${Classes.TREE_NODE_CARET}`)
        .click();

        // check that shortcuts is expanded again
        cy.get('@shortcuts')
        .should('have.class', Classes.TREE_NODE_EXPANDED);

        // same thing for the places
        cy.get('.favoritesPanel > ul > li:eq(1)')
        .as('places')
        .should('have.class', Classes.TREE_NODE_EXPANDED)
        .find(`.${Classes.TREE_NODE_CARET}`)
        .click();

        cy.get('@places')
        .should('not.have.class', Classes.TREE_NODE_EXPANDED)
        .find(`.${Classes.TREE_NODE_CARET}`)
        .click();

        cy.get('@places')
        .should('have.class', Classes.TREE_NODE_EXPANDED);
    });

    it(`should have all shortcuts`, () => {
        const length:number = favoritesState.shortcuts.length;
        cy.get('.favoritesPanel')
        .contains('Shortcuts')
        .should('be.visible');

        cy.get('.favoritesPanel > ul > li:eq(0) .bp3-tree-node-content-1')
        .as('shortcuts')
        .its('length')
        .should('equal', length);

        SHORTCUTS.forEach(shortcut => {
            cy.get('@shortcuts')
            .contains(shortcut)
            .should('be.visible');
        });
    });

    it(`should have all places`, () => {
        const length:number = favoritesState.places.length;
        cy.get('.favoritesPanel')
        .contains('Places')
        .should('be.visible');

        cy.get('.favoritesPanel > ul > li:eq(1) .bp3-tree-node-content-1')
        .as('shortcuts')
        .its('length')
        .should('equal', length);

        favoritesState.places.forEach((place:any) => {
            cy.get('@shortcuts')
            .contains(place.label)
            .should('be.visible');
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
        place.label = "New Volume";

        // wait 5 secs: this is the delay we wait before updating drive list
        cy.wait(5000);

        cy.get('.favoritesPanel > ul > li:eq(1) .bp3-tree-node-content-1')
        .as('shortcuts')
        .its('length')
        .should('equal', favoritesState.places.length);

        favoritesState.places.forEach((place:any) => {
            cy.get('@shortcuts')
            .contains(place.label)
            .should('be.visible');
        });
    });

    it('clicking on a volume should attempt to load its path', () => {
        const path = favoritesState.shortcuts[1].path;
        const label = SHORTCUTS[1];

        cy.get('.favoritesPanel > ul > li:eq(0) .bp3-tree-node-content-1')
        .contains(label)
        .click()
        .then(() => {
            expect(stubs.cd[0]).to.be.calledWith(path);
        });
    });

    it('should target the second view when active', () => {
        cy.toggleSplitView();

        // check that we are in split view
        cy.get('#view_0')
            .should('be.visible');

        cy.get('#view_1')
            .should('be.visible');

        cy.get('.favoritesPanel > ul > li:eq(0) .bp3-tree-node-content-1')
            .contains('cypress')
            .click()
            .then(() => {
                expect(stubs.cd[1]).to.be.called;
                expect(stubs.cd[0]).not.to.be.called;
            });

        // toggle back split view mode
        cy.toggleSplitView();
    });

    it('should target the second view when active', () => {
        cy.toggleSplitView();

        // check that we are in split view
        cy.get('#view_0')
            .should('be.visible');

        cy.get('#view_1')
            .should('be.visible');

        cy.getTab(0, 0)
            .click()
            .should('have.class', Classes.INTENT_PRIMARY);

        // check that first view is active
        cy.get('#view_0')
            .should('have.class', 'active');

        cy.get('.favoritesPanel > ul > li:eq(0) .bp3-tree-node-content-1')
            .contains('cypress')
            .click()
            .then(() => {
                expect(stubs.cd[0]).to.be.called;
                expect(stubs.cd[1]).not.to.be.called;
            });

        cy.toggleSplitView();
    });
});
