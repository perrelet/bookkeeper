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
            'added':      {},
            'skipped':    {},
            'duplicates': {},
        }

    }

    onComplete(journal) {

        SpreadsheetApp.getUi().alert(`Import Completed ${this.sheet.getName()} -> ${journal.sheet.getName()}
            Parsed Transactions: ${this.data.length}
            Added Transactions: ${Object.entries(this.results.added).length}
            Duplicate Transactions: ${Object.entries(this.results.duplicates).length}
            Skipped Transactions: ${Object.entries(this.results.skipped).length}`);

    }

}