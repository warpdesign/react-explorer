/// <reference types="cypress"/>

interface Window {
    appState: any;
}

describe("toolbar", () => {
    function createStubs() {
        cy.window().then(win => {
            const views = win.appState.winStates[0].views;
            let count = 0;
            for (let view of views) {
                for (let cache of view.caches) {
                    cy.stub(cache, "cd", path => {
                        if (path.startsWith("/")) {
                            return Promise.resolve(path);
                        } else
                            return Promise.reject({
                                message: "",
                                code: 0
                            });
                    })
                        .as(`stub_cd${count}`);

                    cy.spy(cache, "reload")
                        .as(`stub_reload${count}`);

                    count++;
                }
            }
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
            .focus();
    });

    it("nav buttons are disabled", () => {
        cy.get("#view_0 [data-cy-backward]")
            .should("be.disabled");
        cy.get("#view_0 [data-cy-forward]")
            .should("be.disabled");

        cy.get("#view_1 [data-cy-backward]")
            .should("be.disabled");
        cy.get("#view_1 [data-cy-forward]")
            .should("be.disabled");
    });

    it("type path and enter calls cd", () => {
        cy.get("#view_0 [data-cy-path]")
            .type("/other_folder{enter}");

        cy.get('@stub_cd0')
            .should('be.called');

        cy.get(".data-cy-alert")
            .should("be.visible")
            .find(".bp3-button")
            .click();
    });

    it("type path and escape clears path with previous value", () => {
        cy.get("#view_0 [data-cy-path]")
            .as("input")
            .invoke("val")
            .as('previous_value');

        cy.get("@input")
            .type("/sdfdsgsdg{esc}");

        cy.get('@previous_value').then(value => {
            cy.get("@input").should("have.value", value);
        });

        cy.get('@stub_cd0')
            .should('not.be.called');
    });

    it("type non valid path should show alert then focus input", () => {       
        cy.get("#view_0 [data-cy-path]")
            .type(":{enter}");

        cy.get(".data-cy-alert")
            .should("be.visible")
            .find(".bp3-button")
            .click();

        cy.get("#view_0 [data-cy-path]")
            .should("have.value", ":");

        cy.get('@stub_cd0')
            .should('be.called');
    });

    it("path should get updated when fileState is updated", () => {
        cy.window().then(win => {
            win.appState.winStates[0].views[0].caches[0].updatePath("/newPath");
            cy.get("#view_0 [data-cy-path]")
                .should("have.value", "/newPath");
        });
    });

    it("clicking on reload should reload path", () => {
        cy.get("#view_0 .data-cy-reload")
            .click();

        cy.get('@stub_reload0')
            .should('be.called');
    });
});
