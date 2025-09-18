class AssetRegistry extends withHeadedSheet(class {}) {

    constructor(sheetName = ``) {

        super(sheetName);
        this.setSheet(sheetName);

    }

    confirm() {

        const ui = SpreadsheetApp.getUi();

        const response = ui.alert(
            '🤖 Add Assets',
            'Are you sure you want to add assets from the Journal?',
            ui.ButtonSet.YES_NO
        );

        return (response === ui.Button.YES);

    }

    findNewAssets(journalSheet = `Journal`) {

        if (!this.confirm()) return;

        const journal = Journal.get(journalSheet);
        const entries = journal.getData();
        //const cca   = new CCAClasses();

        let data = [];

        for (const entry of entries) {

            if (
                !entry.account.toLowerCase().includes("fixed assets") &&
                !entry.account.toLowerCase().includes("intangible assets")
            ) continue;

            if (!(entry.debit_cad > 0))            continue;
            if (this.assetExists(entry.parent_id)) continue;

            const account = Account.get(entry.account);
            if (!account) throw new Error(`❌ Account '${entry.account}' couldn't be found on row '${entry.row}' of ${journalSheet}.`);

            //Log.write(cca.getClass(46));

            data.push(this.newRow({
                'asset_id':    entry.parent_id,
                'purchased':   entry.date,
                'cost':        entry.debit_cad - (entry.itc_cad || 0),
                'account':     entry.account,
                'cca_class':   account.ccac,
                'description': entry.description,
                'journal_id':  entry.id,
                'notes':       entry.invoice,
            }));

        }

        this.append(data);

        if (data.length) {

            SpreadsheetApp.getUi().alert(`Found ${data.length} new assets in ${journal.sheet.getName()} and added them to ${this.sheet.getName()}`);

        } else {

            SpreadsheetApp.getUi().alert(`No new assets were found in ${journal.sheet.getName()}.`);

        }

    }

    assetExists(assetId) {

        return this.rowExists(assetId, `asset_id`);

    }

}