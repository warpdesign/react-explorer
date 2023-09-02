import sqlite3 from 'sqlite3'
type TagRow = {
    tag: string
}
export class TagManager {
    private db: sqlite3.Database

    constructor(dbPath: string) {
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Could not connect to database', err)
            } else {
                this.initializeTables()
            }
        })
    }

    private initializeTables(): void {
        // Create tables if they don't exist
        this.db.run(`CREATE TABLE IF NOT EXISTS file (
            fileurl TEXT,
            viewcount INTEGER
          )`)
        // this.db.run(`DROP TABLE file_tags`)
        this.db.run(`CREATE TABLE IF NOT EXISTS file_tags (
      fileurl TEXT,
      tag TEXT
    )`)
    }

    public incrementViewCount(fileurl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(`UPDATE file SET viewcount = viewcount + 1 WHERE fileurl = ?`, [fileurl], (err) => {
                // this.db.close();
                if (err) return reject(err)
                resolve()
            })
        })
    }

    public getAllTags(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const query = 'SELECT distinct ft.tag FROM file_tags as ft'

            this.db.all(query, [], (err, rows: TagRow[]) => {
                if (err) {
                    reject(err)
                    return
                }

                const tags = rows.map((row) => row.tag)
                resolve(tags)
            })
        })
    }

    public applyTagsToFiles(fileIds: string[], tagNames: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            // Start a transaction
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION')

                tagNames.forEach((tag) => {
                    // Insert or ignore the tag name into the tags table

                    fileIds.forEach((fileurl) => {
                        // Associate the tag with the file
                        const query = `
              INSERT INTO file_tags (fileurl, tag) VALUES (?,?)
            `

                        this.db.run(query, [fileurl, tag], (err) => {
                            if (err) {
                                // If there's an error, roll back the transaction
                                this.db.run('ROLLBACK')
                                reject(err)
                                return
                            }
                        })
                    })
                })

                // Commit the transaction
                this.db.run('COMMIT', (err) => {
                    if (err) {
                        reject(err)
                        return
                    }

                    resolve()
                })
            })
        })
    }

    // You can add other tag management methods here, such as applyTags, deleteTags, etc.
}
