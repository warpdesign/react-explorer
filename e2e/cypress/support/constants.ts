/// <reference types="cypress"/>

export const isMac = Cypress.platform === "darwin";
export const MOD_KEY = isMac ? "{meta}" : "{ctrl}";
