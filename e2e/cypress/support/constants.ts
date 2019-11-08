/// <reference types="cypress"/>

export const isMac = Cypress.platform === "darwin";
export const MOD_KEY = isMac ? "{meta}" : "{ctrl}";
export const TAB_ICONS = [
    {regex: /^\/cy\/downloads$/, icon: "download"},
    {regex: /^\/cy\/music$/, icon: "music"},
    {regex: /^\/cy\/pictures$/, icon: "camera"},
    {regex: /^\/cy\/desktop$/, icon: "desktop"},
    {regex: /^\/cy\/documents$/, icon: "projects"},
    {regex: /^\/cy\/home$/, icon: "home"},
    {regex: /^\/cy\/videos$/, icon: "video"}
];
export const SHORTCUTS = ['cypress', 'Downloads', 'Images', 'Music', 'Documents', 'Desktop', 'Videos'];
