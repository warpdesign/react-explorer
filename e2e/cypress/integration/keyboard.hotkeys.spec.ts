/// <reference types="cypress"/>

import { MOD_KEY, isMac } from "../support/constants";

describe("keyboard hotkeys", () => {
    const stubs: any = {
        navHistory: []
    };

    function createStubs() {
        stubs.navHistory = [];

        cy.window().then(win => {
            const views = win.appState.winStates[0].views;
            for (let view of views) {
                for (let cache of view.caches) {
                    stubs.navHistory.push(cy.spy(cache, "navHistory"));
                }
            }

            // activate splitView mode
            const winState = win.appState.winStates[0];
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
            cy.get(".downloads").should("be.visible");
        });

        cy.triggerHotkey(`{alt}${MOD_KEY}e`).then(() => {
            cy.get(".downloads").should("not.exist");
            cy.get(".sideview.active").should("be.visible");
        });
    });

    it("should show next/previous view", () => {
        cy.triggerHotkey(`{ctrl}{shift}{rightarrow}`).then(() => {
            cy.get("#view_0").should("not.have.class", "active");
            cy.get("#view_1").should("have.class", "active");
        });

        cy.triggerHotkey(`{ctrl}{shift}{leftarrow}`).then(() => {
            cy.get("#view_1").should("not.have.class", "active");
            cy.get("#view_0").should("have.class", "active");
        });
    });

    it("should go forward history", () => {
        const hotkey = isMac ? `${MOD_KEY}{rightarrow}` : `{alt}{rightarrow}`;
        cy.triggerHotkey(hotkey).then(() => {
            expect(stubs.navHistory[0]).to.be.calledOnce;
            expect(stubs.navHistory[0]).to.be.calledWith(1);
        });
    });

    it("should go backward history", () => {
        const hotkey = isMac ? `${MOD_KEY}{leftarrow}` : `{alt}{leftarrow}`;
        cy.triggerHotkey(hotkey).then(() => {
            expect(stubs.navHistory[0]).to.be.calledOnce;
            expect(stubs.navHistory[0]).to.be.calledWith(-1);
        });
    });

    it("should not change view in single view mode", () => {
        cy.get("#view_0").should("have.class", "active");
        cy.get("#view_1").should("not.have.class", "active");

        cy.get('.data-cy-toggle-splitview')
        .click();

        cy.triggerHotkey(`{ctrl}{shift}{rightarrow}`).then(() => {
            cy.get("#view_1").should("not.have.class", "active");
            cy.get("#view_0").should("have.class", "active");
        });
    });
    // it("should open devtools", () => {
    //     cy.triggerHotkey(`{alt}${MOD_KEY}i`).then(() => {
    //         expect(ipcRenderer.send).to.be.calledOnce;
    //         expect(ipcRenderer.send).to.be.calledWith("openDevTools");
    //     });
    // });
});
