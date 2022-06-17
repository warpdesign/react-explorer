/// <reference types="cypress"/>

import { TAB_ICONS } from '../support/constants';
import { Classes } from '@blueprintjs/core';

function matchPath(path: string) {
    const match = TAB_ICONS.find((obj) => obj.regex.test(path));
    return (match && match.icon) || 'folder-close';
}

describe('tablist', () => {
    function createStubs() {
        cy.window().then((win: any) => {
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
                    }).as(`stub_cd${count}`);

                    cy.spy(cache, 'reload').as(`stub_reload${count}`);

                    count++;
                }
            }

            // cy.stub(win.remote.Menu, 'buildFromTemplate')
            //     .as('stub_buildFromTemplate')
            //     .returns({
            //         // remote menu stubs
            //         popup: cy.stub().as('stub_popup'),
            //     });
            cy.stub(win.renderer, 'invoke').as('stub_invoke');
        });
    }

    before(() => {
        return cy.visit('http://127.0.0.1:8080');
    });

    beforeEach(() => {
        createStubs();
    });

    it('tablist should have path in title', () => {
        cy.CDAndList(0, '/');
        cy.get('#view_0 .tablist').contains('/').should('have.class', Classes.INTENT_PRIMARY);
    });

    describe('tablist should show tab icons for known user folders', () => {
        [
            '/',
            '/cy/downloads',
            '/cy/music',
            '/cy/pictures',
            '/cy/desktop',
            '/cy/documents',
            '/cy/home',
            '/cy/videos',
        ].forEach((path: string) => {
            it(`should show icon for ${path}`, () => {
                const iconName = matchPath(path);

                cy.log('iconName', iconName);
                cy.CDAndList(0, path);
                cy.get('.tablist').contains(path).find(`.${Classes.ICON}`).should('have.attr', 'icon', iconName);
            });
        });
    });

    it('right-click on tab icon should show the folder menu', () => {
        cy.CDAndList(0, '/');

        cy.get('#view_0 .tablist').contains('/').find('[icon]').rightclick();

        cy.get('@stub_invoke').should('be.calledOnce').and('be.calledWith', 'Menu:buildFromTemplate', []);

        // cy.get('@stub_popup').should('be.calledOnce');
    });

    it('right-click on the tab should show the tab menu', () => {
        cy.CDAndList(0, '/');

        cy.get('#view_0 .tablist').contains('/').find('.bp3-button-text').rightclick('right');

        cy.get('@stub_invoke')
            .should('be.calledOnce')
            .then((stub: any) => {
                // check we have the correct number of elements in the menu template
                // NOTE: I guess we can do a lot better than that!
                expect(stub.getCalls()[0].args[1].length).to.equal(8);
            });
    });

    it('close button should not be there with only one tab', () => {
        cy.get('#view_0 .tablist > button').eq(0).find('.closetab').should('not.exist');
    });

    it('should be able to add a new tab and close a tab', () => {
        cy.addTab(0);

        cy.get('#view_0 .tablist > button.tab').its('length').should('equal', 2);

        cy.get('#view_0 .tablist > button.tab').eq(1).find('.closetab').click({ force: true });

        cy.get('#view_0 .tablist > button.tab').its('length').should('equal', 1);
    });

    it('clicking on an inactive tab should activate it', () => {
        // check that first element is active
        cy.getTab(0, 0).should('have.class', Classes.INTENT_PRIMARY);

        cy.addTab(0);

        cy.getTab(0, 0).should('not.have.class', Classes.INTENT_PRIMARY);

        cy.getTab(0, 1).should('have.class', Classes.INTENT_PRIMARY);

        cy.getTab(0, 0).click().should('have.class', Classes.INTENT_PRIMARY);

        cy.getTab(0, 1).should('not.have.class', Classes.INTENT_PRIMARY);

        cy.getTab(0, 1).triggerHover();
    });

    // I haven't found a way to trigger the application of css :hover pseudo elements
    // there is an issue opened at least 4 (!) years ago about it:
    // https://github.com/cypress-io/cypress/issues/10
    // a workaround could be to use getComputedStyle() to calculate the generated styles
    // for the tab element
    // it('close button should have its opacity increase on mouseover', () => {
    //     cy.addTab(0);

    //     cy.getTab(0)
    //     .find('.closetab')
    //     .should('have.css', 'opacity')
    //     .and('be.equal', "0");

    //     cy.getTab(0)
    //     .triggerHover()
    //     .find('.closetab')
    //     .should('have.css', 'opacity')
    //     .and('be.eq', "1");

    //     cy.get('#view_0 .tablist > button.tab')
    //     .eq(1)
    //     .find('.closetab')
    //     .click({force: true});
    // });
});
