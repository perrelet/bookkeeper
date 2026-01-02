class Importer extends withHeadedSheet(class {}) {

    constructor(sheetName = ``) {

        super(sheetName);
        this.setSheet(sheetName);

    }

    confirm() {

        const ui = SpreadsheetApp.getUi();

        const response = ui.alert(
            '🤖 Import Data',
            'Are you sure you want to import data into the Journal?',
            ui.ButtonSet.YES_NO
        );

        return (response === ui.Button.YES);

    }

    import(targetSheet = `Import Journal`) {

        if (!this.confirm()) return;

        this.onStart(journal);

        this.onComplete(journal);

    }

    onStart(journal) {

        this.data = this.getData();
        this.entries = [];
        this.results = {
            'processed':  0,
            'added':      {},
            'skipped':    {},
            'duplicates': {},
        }

    }

    onComplete(journal) {

        let msg = `Import Completed ${this.sheet.getName()} -> ${journal.sheet.getName()}
            Parsed Transactions: ${this.results.processed}
            Added Transactions: ${Object.entries(this.results.added).length}
            Duplicate Transactions: ${Object.entries(this.results.duplicates).length}
            `;

        if (typeof this.results.skipped === 'object') {

            msg += `Skipped Transactions:`;
            for (const [key, value] of Object.entries(this.results.skipped)) {
                msg += `\n- ${key}: ${Object.entries(value).length}`;
            }

        } else {

            msg += `Skipped Transactions: ${Object.entries(this.results.skipped).length}`;

        }

        SpreadsheetApp.getUi().alert(msg);

    }

    skip (id, row, reason = null) {

        if (reason) {

            if (!this.results.skipped.hasOwnProperty(reason)) this.results.skipped[reason] = {};
            this.results.skipped[reason][id] = row;

        } else {

            this.results.skipped[id] = row;

        }

    }

}