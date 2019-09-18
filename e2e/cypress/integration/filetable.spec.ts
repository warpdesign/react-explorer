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

describe('filetable', () => {
    before(() => {
        cy.visit('http://127.0.0.1:8080');
    });

    let files: any;

    beforeEach(() => {
        cy.get('#view_0 [data-cy-path]').type('/{enter}');
        // load files
        cy.CDAndList(0, '/').then((array: any) => {
            files = array;
        });
    })

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

    it('files should be display folders first', () => {
        // check that the first two elements are the folders of our files list
        cy.get('#view_0 [data-cy-file] .file-label').first()
            .prev()
            .should('have.attr', 'icon').and('eq', TYPE_ICONS['dir']);

        cy.get('#view_0 [data-cy-file] .file-label').eq(1)
            .prev()
            .should('have.attr', 'icon').and('eq', TYPE_ICONS['dir']);
    });
});