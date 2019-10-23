/// <reference types="cypress"/>

import { MOD_KEY } from "../support/constants";

describe("keyboard hotkeys", () => {
    before(() => {
        cy.visit("http://127.0.0.1:8080");
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
});
