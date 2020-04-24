/// <reference types="cypress"/>

import { MOD_KEY, isMac } from "../support/constants";

describe("keyboard hotkeys", () => {
    function createStubs() {
        return cy.window().then(win => {
            const winState = win.appState.winStates[0];
            const views = winState.views;
            let count = 0;
            for (let view of views) {
                for (let cache of view.caches) {
                    cy.spy(cache, "navHistory")
                        .as('stub_navHistory' + count++);
                }
            }

            // activate splitView mode
            winState.splitView = true;
        });
    }

    before(() => {
        return cy.visit("http://127.0.0.1:8080");
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

    it("should show downloads and explorer tabs", () => {
        cy.triggerHotkey(`{alt}${MOD_KEY}l`).then(() => {
            cy.get(".downloads")
                .should("be.visible");
        });

        cy.triggerHotkey(`{alt}${MOD_KEY}e`).then(() => {
            cy.get(".downloads")
                .should("not.exist");
            cy.get(".sideview.active")
                .should("be.visible");
        });
    });

    it("should show next/previous view", () => {
        cy.triggerHotkey(`{ctrl}{shift}{rightarrow}`).then(() => {
            cy.get("#view_0")
                .should("not.have.class", "active");
            cy.get("#view_1")
                .should("have.class", "active");
        });

        cy.triggerHotkey(`{ctrl}{shift}{leftarrow}`).then(() => {
            cy.get("#view_1")
                .should("not.have.class", "active");
            cy.get("#view_0")
                .should("have.class", "active");
        });
    });

    it("should go forward history", () => {
        const hotkey = isMac ? `${MOD_KEY}{rightarrow}` : `{alt}{rightarrow}`;
        cy.triggerHotkey(hotkey);
        cy.get('@stub_navHistory0')
            .should('be.calledOnce')
            .should('be.calledWith', 1);
    });

    it("should go backward history", () => {
        const hotkey = isMac ? `${MOD_KEY}{leftarrow}` : `{alt}{leftarrow}`;
        cy.triggerHotkey(hotkey);
        cy.get('@stub_navHistory0')
            .should('be.calledOnce')
            .should('be.calledWith', -1);
    });
    // it("should open devtools", () => {
    //     cy.triggerHotkey(`{alt}${MOD_KEY}i`).then(() => {
    //         expect(ipcRenderer.send).to.be.calledOnce;
    //         expect(ipcRenderer.send).to.be.calledWith("openDevTools");
    //     });
    // });
});
