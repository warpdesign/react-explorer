/// <reference types="cypress"/>

import { TAB_ICONS } from '../support/constants';
import { Classes } from '@blueprintjs/core';

interface Window {
    appState: any;
}

function matchPath(path: string) {
    const match = TAB_ICONS.find(obj => obj.regex.test(path));
    return match && match.icon || 'folder-close';
}

describe("tablist", () => {
    const stubs: any = {
        cd: []
    };

    function createStubs() {
        stubs.cd = [];
        stubs.reload = [];

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
                    stubs.reload.push(cy.spy(cache, "reload"));
                }
            }
        });
    }

    before(() => {
        return cy.visit("http://127.0.0.1:8080");
    });

    beforeEach(() => {
        createStubs();
    });

    it('tablist should have path in title', () => {
        cy.CDAndList(0, "/");
        cy.get('.tablist').contains('/').should('have.class', Classes.INTENT_PRIMARY);
    });

    describe('tablist should show tab icons for known user folders', () => {
        ['/', '/cy/downloads', '/cy/music', '/cy/pictures', '/cy/desktop', '/cy/documents', '/cy/home', '/cy/videos']
        .forEach((path:string) => {
            it(`should show icon for ${path}`, () => {
                const iconName = matchPath(path);

                cy.log('iconName', iconName);
                cy.CDAndList(0, path);
                cy.get('.tablist')
                .contains(path)
                .find(`.${Classes.ICON}`)
                .should('have.attr', 'icon', iconName);
            });
        });
    });

    it('right-click on tab icon should show the folder menu', () => {
        cy.CDAndList(0, "/");
        cy.get('.tablist')
        .contains('/')
        .rightclick();

        // TODO: need to mock electron.remote.Menu...
    });

    it('right-click on the tab should show the tab menu', () => {

    });
});
