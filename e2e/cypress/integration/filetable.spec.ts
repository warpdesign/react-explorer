/// <reference types="cypress"/>

const TYPE_ICONS: { [key: string]: string } = {
    'img': 'media',
    'any': 'document',
    'snd': 'music',
    'vid': 'mobile-video',
    'exe': 'application',
    'arc': 'compressed',
    'doc': 'align-left',
    'cod': 'code',
    'dir': 'folder-close'
};

enum KEYS {
    Backspace = 8,
    Enter = 13,
    Escape = 27,
    Down = 40,
    Up = 38,
    PageDown = 34,
    PageUp = 33
};

describe('filetable', () => {
    before(() => {
        cy.visit('http://127.0.0.1:8080');
    });

    let files: any;

    beforeEach(() => {
        cy.get('#view_0 [data-cy-path]').type('/{enter}').focus().blur();
        // load files
        cy.CDAndList(0, '/').then((array: any) => {
            files = array;
        });
    })

    describe('initial content', () => {
        it('should display files if cache is not empty', () => {
            // since we use a virtualized component which only displays visible rows
            // we cannot simply compare the number of rows to files.length
            cy.get('#view_0 [data-cy-file]').its('length').should('be.gt', 0);
        });

        it('files should have the correct icons', () => {
            cy.get('#view_0 [data-cy-file] .file-label').as('rows');

            files.forEach((file: any) => {
                const name = file.fullname;
                const icon = file.isDir && TYPE_ICONS['dir'] || TYPE_ICONS[file.type];
                cy.get('@rows')
                    .contains(name)
                    .prev()
                    .should('have.attr', 'icon').and('eq', icon);
            });
        });

        it('folders should appear first', () => {
            // check that the first two elements are the folders of our files list
            cy.get('#view_0 [data-cy-file] .file-label').first()
                .prev()
                .should('have.attr', 'icon').and('eq', TYPE_ICONS['dir']);

            cy.get('#view_0 [data-cy-file] .file-label').eq(1)
                .prev()
                .should('have.attr', 'icon').and('eq', TYPE_ICONS['dir']);
        });
    });

    describe('keyboard navigation', () => {
        it('arrow down should select the next element', () => {
            // one press: select the first one
            cy.get('#view_0').trigger('keydown', { keyCode: KEYS.Down })
                .find('[data-cy-file]').first()
                .should('have.class', 'selected');

            // it's the only one that's selected
            cy.get('#view_0 [data-cy-file].selected').its('length').should('be', 1);

            // another press, select the second one
            cy.get('#view_0').trigger('keydown', { keyCode: KEYS.Down })
                .find('[data-cy-file]').eq(1)
                .should('have.class', 'selected');

            // it's the only one that's selected
            cy.get('#view_0 [data-cy-file].selected').its('length').should('be', 1);
        });

        it('repeating arrow down should end up selecting the last element', () => {
            cy.get('#view_0').trigger('keydown', { keyCode: KEYS.Down })
                .find('[data-cy-file]').first()
                .should('have.class', 'selected');

            for (let i = 0; i <= files.length; ++i) {
                cy.get('#view_0').trigger('keydown', { keyCode: KEYS.Down });
            }

            cy.get('#view_0 [data-cy-file]').last()
                .should('have.class', 'selected');

            // it's the only one that's selected
            cy.get('#view_0 [data-cy-file].selected').its('length').should('be', 1);
        });

        it('using arrow down should scroll down the table if needed', () => {
            // first make sure the last element is hidden
            cy.get('#view_0 [data-cy-file').last().should('not.be.visible');

            // press arrow down key until the last item is selected: it should now be visible & selected
            for (let i = 0; i <= files.length; ++i) {
                cy.get('#view_0').trigger('keydown', { keyCode: KEYS.Down });
            }

            cy.get('#view_0 [data-cy-file]').last()
                .should('have.class', 'selected')
                .and('be.visible');

            // it's the only one that's selected
            cy.get('#view_0 [data-cy-file].selected').its('length').should('be', 1);
        });

        it('arrow up should select the previous element', () => {
            // select second element
            cy.get('#view_0').trigger('keydown', { keyCode: KEYS.Down });
            cy.get('#view_0').trigger('keydown', { keyCode: KEYS.Down });

            // select first element
            cy.get('#view_0').trigger('keydown', { keyCode: KEYS.Up })
                .find('[data-cy-file]').eq(1)
                .should('have.class', 'selected');

            // it's the only one that's selected
            cy.get('#view_0 [data-cy-file].selected').its('length').should('be', 1);
        });

        it('using arrow down should scroll up the table if needed', () => {
            // press arrow down key until the last item is selected: it should now be visible & selected
            for (let i = 0; i <= files.length; ++i) {
                cy.get('#view_0').trigger('keydown', { keyCode: KEYS.Down });
            }

            // check that the first element isn't visible anymore
            cy.get('#view_0 [data-cy-file]').first()
                .should('not.be.visible');

            // press up arrow key until the first item is selected
            for (let i = 0; i <= files.length; ++i) {
                cy.get('#view_0').trigger('keydown', { keyCode: KEYS.Up });
            }

            // it should now be visible & selected
            cy.get('#view_0 [data-cy-file]').first()
                .should('be.visible')
                .and('have.class', 'selected');

            // it's the only one that's selected
            cy.get('#view_0 [data-cy-file].selected').its('length').should('be', 1);
        });
    });

    describe('rename feature', () => {
        it('enter key should activate rename for selected element', () => {
            cy.get('#view_0')
                .trigger('keydown', { keyCode: KEYS.Down })
                .trigger('keydown', { keyCode: KEYS.Enter })
                .find('[data-cy-file]:first')
                .find('.file-label')
                .should('have.attr', 'contenteditable', 'true');
        });

        it('long mousedown should activate rename for selected element', () => {
            cy.get('#view_0 [data-cy-file]:first .file-label').click();
            cy.wait(1000);
            cy.get('#view_0 [data-cy-file]:first .file-label').click()
                .should('have.attr', 'contenteditable', 'true');
        });

        it('only left part of the filename should be selected', () => {
            // select the second element which is archive.tar.gz
            cy.get('#view_0 [data-cy-file]:eq(2) .file-label').click();
            cy.wait(1000);
            cy.get('#view_0 [data-cy-file]:eq(2) .file-label').click()
                .should('have.attr', 'contenteditable', 'true');

            cy.window().then((window: Window) => {
                const selection: any = window.getSelection();
                cy.get('#view_0 [data-cy-file].selected .file-label').invoke('text').then((selectedFilename: any) => {
                    const expectedSelection = 'archive';
                    const actualSelection = selectedFilename.substr(selection.baseOffset, selection.extentOffset);
                    expect(actualSelection).to.equal(expectedSelection);
                });
            });
        });
    });
});
