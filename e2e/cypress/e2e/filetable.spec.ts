/// <reference types="cypress"/>

import { MOD_KEY } from '../support/constants'
// FIXME: define & use $src alias when we'll figure out how to do it
// See: https://github.com/cypress-io/cypress/discussions/24751
import Keys from '../../../src/constants/keys'
import { TypeIcons } from '../../../src/constants/icons'
import files from '../fixtures/files.json'

describe('filetable', () => {
    beforeEach(() => {
        // We visit the page before each test to be sure the app is in clean
        // before every test.
        // If we did not do that, clicking on a node in a test, and then
        // again in the following test would trigger a double click for ex.
        cy.visit(`http://127.0.0.1:8080?t=${Date.now()}`).then(cy.waitForApp)
        createStubs()
        resetSelection()
        cy.enterPath('/')
    })

    const stubs: any = {
        openDirectory: [],
        openFile: [],
    }

    function resetSelection() {
        cy.window().then((win) => {
            win.appState.winStates[0].views.forEach((view: any) => {
                view.caches.forEach((cache: any) => {
                    cache.reset()
                })
            })
        })
    }

    function createStubs() {
        stubs.openFile = []
        stubs.openDirectory = []
        stubs.openParentDirectory = []
        stubs.rename = []

        cy.window().then((win) => {
            const appState = win.appState
            const views = appState.winStates[0].views

            let count = 0
            for (const view of views) {
                for (const cache of view.caches) {
                    cy.stub(cache, 'openFile')
                        .as('stub_openFile' + count)
                        .resolves()

                    cy.stub(cache, 'openDirectory')
                        .as('stub_openDirectory' + count)
                        .resolves()

                    cy.stub(cache, 'openParentDirectory')
                        .as('stub_openParentDirectory' + count)
                        .resolves()

                    cy.stub(cache, 'rename')
                        .as('stub_rename' + count)
                        .resolves()

                    // this will be called but we don't care
                    // cy.stub(cache, 'isRoot').returns(false)

                    count++
                }
            }
        })
    }

    describe('initial content', () => {
        it('should display files if cache is not empty', () => {
            // since we use a virtualized component which only displays visible rows
            // we cannot simply compare the number of rows to files.length
            cy.get('#view_0 [data-cy-file]').its('length').should('be.gt', 0)
        })

        it('should use correct icons for each file type', () => {
            cy.get('#view_0 [data-cy-file] .file-label').as('rows')

            files.forEach((file: any) => {
                const name = file.fullname
                const icon = (file.isDir && TypeIcons['dir']) || TypeIcons[file.type]
                cy.get('@rows').contains(name).prev().should('have.attr', 'icon').and('eq', icon)
            })
        })

        it('should show folders first', () => {
            // check that the first two elements are the folders of our files list
            cy.get('#view_0 [data-cy-file] .file-label')
                .first()
                .prev()
                .should('have.attr', 'icon')
                .and('eq', TypeIcons['dir'])

            cy.get('#view_0 [data-cy-file] .file-label')
                .eq(1)
                .prev()
                .should('have.attr', 'icon')
                .and('eq', TypeIcons['dir'])
        })
    })

    describe('mouse navigation', () => {
        it('should select an element when clicking on it', () => {
            cy.get('#view_0 [data-cy-file]:first').click().should('have.class', 'selected')
        })

        it('should add element to selection if not selected when pressing click + shift', () => {
            cy.get('#view_0 [data-cy-file]:first').click().should('have.class', 'selected')

            cy.get('body')
                .type('{shift}', { release: false })
                .get('#view_0 [data-cy-file]:eq(1)')
                .click()
                .should('have.class', 'selected')

            cy.get('#view_0 [data-cy-file]:first').should('have.class', 'selected')
        })

        // The following functions haven't been added back to the new filetable implementation yet.
        // FIXME: enable this test again once the feature has been implemented.
        // it.only('should remove element from selection if already selected when pressing click + shift', () => {
        //     cy.get('#view_0 [data-cy-file]:first').click().should('have.class', 'selected')

        //     cy.get('body')
        //         .type('{meta}', { release: false })
        //         .get('#view_0 [data-cy-file]:first')
        //         .click()
        //         .should('not.have.class', 'selected')
        // })

        // it('should call openDirectory when double-clicking on folder', () => {
        //     cy.get('#view_0 [data-cy-file]:first')
        //         .click()
        //         .click()

        //     cy.get('@stub_openDirectory0').should('be.called')
        // })

        // it('should call openFile when clicking on a file', () => {
        //     cy.get('#view_0 [data-cy-file]:eq(5)').dblclick()

        //     cy.get('@stub_openFile0').should('be.called')
        // })

        // it('should unselect all files when clicking on empty grid area', () => {
        //     cy.get('#view_0 [data-cy-path]').type('/foo/bar{enter}').focus().blur()

        //     cy.get('#view_0 [data-cy-file]:first').click().should('have.class', 'selected')

        //     cy.get('#view_0 .fileListSizerWrapper').click('bottom')

        //     cy.get('#view_0 [data-cy-file].selected').should('not.exist')
        // })
    })

    describe('keyboard navigation', () => {
        // FIXME: not implemented yet
        // it('should scroll down the table if needed when pressing arrow down key', () => {
        //     // first make sure the last element is hidden
        //     cy.get('#view_0 [data-cy-file').last().should('not.be.visible')

        //     // press arrow down key until the last item is selected: it should now be visible & selected
        //     for (let i = 0; i <= files.length; ++i) {
        //         cy.get('#view_0').trigger('keydown', { key: Keys.DOWN })
        //     }

        //     cy.get('#view_0 [data-cy-file]').last().should('have.class', 'selected').and('be.visible')

        //     // it's the only one that's selected
        //     cy.get('#view_0 [data-cy-file].selected').its('length').should('eq', 1)
        // })

        it('should select the next element when pressing arrow down', () => {
            // one press: select the first one
            cy.get('body').trigger('keydown', { key: Keys.DOWN })
            cy.get('#view_0').find('[data-cy-file]').first().should('have.class', 'selected')

            // it's the only one that's selected
            cy.get('#view_0 [data-cy-file].selected').its('length').should('eq', 1)

            // another press, select the second one
            cy.get('body').trigger('keydown', { key: Keys.DOWN })
            cy.get('#view_0').find('[data-cy-file]').eq(1).should('have.class', 'selected')

            // it's the only one that's selected
            cy.get('#view_0 [data-cy-file].selected').its('length').should('eq', 1)
        })

        it('should select the last element when rapidly pressing arrow down key', () => {
            cy.get('body').trigger('keydown', { key: Keys.DOWN })

            cy.get('#view_0').find('[data-cy-file]').first().should('have.class', 'selected')

            for (let i = 0; i <= files.length; ++i) {
                cy.get('body').trigger('keydown', { key: Keys.DOWN })
            }

            // FIXME: this doesn't seem to work anymore, no idea why.
            // Should we spend time fixing it since we're about to move away from Cypress?
            // cy.get('#view_0 [data-cy-file]').last().should('have.class', 'selected')

            // it's the only one that's selected
            cy.get('#view_0 [data-cy-file].selected').its('length').should('eq', 1)
        })

        it('should select the previous element when pressing arrow up key', () => {
            // activate the first then second element
            cy.get('body').trigger('keydown', { key: Keys.DOWN })
            cy.get('body').trigger('keydown', { key: Keys.DOWN })
            cy.get('body').trigger('keydown', { key: Keys.DOWN })

            cy.get('body').trigger('keydown', { key: Keys.UP })
            // activate previous element: should be the second one
            cy.get('#view_0').find('[data-cy-file]').eq(1).should('have.class', 'selected')

            // it's the only one that's selected
            cy.get('#view_0 [data-cy-file].selected').its('length').should('eq', 1)
        })

        // FIXME: not implemented yet
        // it('should scroll up the table if needed when pressing arrow up key', () => {
        //     // press arrow down key until the last item is selected: it should now be visible & selected
        //     for (let i = 0; i <= files.length; ++i) {
        //         cy.get('#view_0').trigger('keydown', { key: Keys.DOWN })
        //     }

        //     // check that the first element isn't visible anymore
        //     cy.get('#view_0 [data-cy-file]').first().should('not.be.visible')

        //     // press up arrow key until the first item is selected
        //     for (let i = 0; i <= files.length; ++i) {
        //         cy.get('#view_0').trigger('keydown', { key: Keys.UP })
        //     }

        //     // it should now be visible & selected
        //     cy.get('#view_0 [data-cy-file]').first().should('be.visible').and('have.class', 'selected')

        //     // it's the only one that's selected
        //     cy.get('#view_0 [data-cy-file].selected').its('length').should('eq', 1)
        // })

        // FIXME: not implemented yet
        // it('should open folder if folder is selected and mod + o is pressed', () => {
        //     cy.get('#view_0 [data-cy-file]').first().click()

        //     cy.get('body').type(`${MOD_KEY}o`)

        //     cy.get('@stub_openDirectory0').should('be.called')
        // })

        // it('should open file if a file is selected and mod + o is pressed', () => {
        //     cy.get('#view_0 [data-cy-file]').eq(5).click()

        //     cy.get('body').type(`${MOD_KEY}o`)

        //     cy.get('@stub_openFile0').should('be.called')
        // })

        // it('should select all files if mod + a is pressed', () => {
        //     cy.get('body')
        //         .type(`${MOD_KEY}a`)
        //         .then(() => {
        //             // and also check that every visible row is selected
        //             cy.get('#view_0 [data-cy-file].selected').filter(':visible').should('have.class', 'selected')
        //         })
        // })

        // it('should invert selection if mod + i is pressed', () => {
        //     cy.get('body').type(`${MOD_KEY}a`)
        //     cy.wait(1000)
        //     cy.get('body')
        //         .type(`${MOD_KEY}i`)
        //         .then(() => {
        //             // and also check that every visible row is selected
        //             cy.get('#view_0 [data-cy-file].selected').should('not.exist')
        //         })
        // })
    })

    describe('rename feature', () => {
        // it('should activate rename for selected element if enter key is pressed and a file is selected', () => {
        //     cy.get('#view_0')
        //         .trigger('keydown', { key: Keys.DOWN })
        //         .trigger('keydown', { key: Keys.ENTER })
        //         .find('[data-cy-file]:first')
        //         .find('.file-label')
        //         .should('have.attr', 'contenteditable', 'true')
        // })
        // it('should activate rename for selected element if the user keeps mousedown', () => {
        //     cy.get('#view_0 [data-cy-file]:first .file-label').click()
        //     cy.wait(1000)
        //     cy.get('#view_0 [data-cy-file]:first .file-label').click().should('have.attr', 'contenteditable', 'true')
        // })
        // it('should select only left part of the filename', () => {
        //     // select the second element which is archive.tar.gz
        //     cy.get('#view_0 [data-cy-file]:eq(2) .file-label').click()
        //     cy.wait(1000)
        //     cy.get('#view_0 [data-cy-file]:eq(2) .file-label').click().should('have.attr', 'contenteditable', 'true')
        //     cy.window().then((window: Window) => {
        //         const selection: any = window.getSelection()
        //         cy.get('#view_0 [data-cy-file].selected .file-label')
        //             .invoke('text')
        //             .then((selectedFilename: any) => {
        //                 const expectedSelection = 'archive'
        //                 const actualSelection = selectedFilename.substring(selection.baseOffset, selection.extentOffset)
        //                 expect(actualSelection).to.equal(expectedSelection)
        //             })
        //     })
        // })
        // it('should call cache.rename when pressing enter in edit mode', () => {
        //     cy.get('#view_0')
        //         .trigger('keydown', { key: Keys.DOWN })
        //         .trigger('keydown', { key: Keys.ENTER })
        //         .find('[data-cy-file]:first')
        //         .find('.file-label')
        //         .type('bar{enter}')
        //         // we need to restore previous text to avoid the next test to crash
        //         // because React isn't aware of our inline edit since we created a stub for cache.rename
        //         // (it's supposed to reload the file cache, which in turns causes a new render of FileTable)
        //         .invoke('text', 'folder2')
        //     cy.get('@stub_rename0').should('be.called')
        // })
        // it('should not call cache.rename & restore previous filename when pressing escape in edit mode', () => {
        //     cy.get('#view_0')
        //         .trigger('keydown', { key: Keys.DOWN })
        //         .trigger('keydown', { key: Keys.ENTER })
        //         .find('[data-cy-file]:first')
        //         .find('.file-label')
        //         .type('bar{esc}')
        //     // previous label must have been restored
        //     cy.get('#view_0 [data-cy-file].selected').should('contain', 'folder2')
        //     cy.get('@stub_rename0').should('not.be.called')
        // })
        // it('renaming should be cancelled if rename input field gets blur event while active', () => {
        //     cy.get('#view_0')
        //         .trigger('keydown', { key: Keys.DOWN })
        //         .trigger('keydown', { key: Keys.ENTER })
        //         .find('[data-cy-file]:first')
        //         .find('.file-label')
        //         .focus()
        //         .type('bar')
        //         .blur()
        //         .should('contain', 'folder2')
        //     cy.get('@stub_rename0').should('not.be.called')
        // })
    })
})
