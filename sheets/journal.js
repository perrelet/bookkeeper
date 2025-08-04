class Journal extends withHeadedSheet(class {}) {

    static get(sheetName = `Import Journal`) {

        if (!this._journals) this._journals = {};

        if (!(sheetName in this._journals)) this._journals[sheetName] = new Journal(sheetName);

        return this._journals[sheetName];


    }

    constructor(sheetName) {

        super(sheetName);
        this.setSheet(sheetName);

    }

    txnExists(transactionId) {

        return this.rowExists(transactionId, `parent_id`);

        const lastRow = this.sheet.getLastRow();

        if (lastRow > 1) {

            const ids = this.sheet.getRange(2, this.headers.indexOf(`parent_id`) + 1, lastRow - 1, 1).getValues().flat();
            return ids.includes(transactionId);

        } else {

            return false;

        }

    }

    validate() {

        const entries = this.getData();

        // Accounts

        Account.accounts;

        for (const entry of entries) {

            if (!entry.account) throw new Error(`❌ Entry on row ${entry.row} is missing an account name.`);

            const account = Account.get(entry.account);

            if (!account) throw new Error(`❌ Account name not recognised '${entry.account}' on row ${entry.row}.`);

            //if (account.side == 'Debits') {
            //    if (entry.credit_cad) throw new Error(`❌ Mismatched debit account '${account.label}' used for credit entry (${entry.transaction_id}).`);
            //} else {
            //    if (entry.debit_cad) throw new Error(`❌ Mismatched credit account '${account.label}' used for debit entry (${entry.transaction_id}).`);
            //}

            // TODO: Ensure that sure no summary accounts have been posted too.

        }

        // Balance

        const txns = {};

        for (const entry of entries) {

            const debit  = parseFloat(entry.debit_cad) || 0;
            const credit = parseFloat(entry.credit_cad) || 0;

            if (!txns[entry.parent_id]) txns[entry.parent_id] = 0;
            txns[entry.parent_id] += debit - credit;

        }

        const invalid = Object.entries(txns).filter(([parent_id, balance]) => Math.abs(balance) > 0.005);

        if (invalid.length > 0) {
            throw new Error(`❌ Unbalanced transactions:\n` + invalid.map(([id, bal]) => ` - ${id}: ${bal}`).join('\n'));
        }

        SpreadsheetApp.getUi().alert(`✅ Everything looks good in ${this.sheet.getName()}.`);

    }

    /* generateIds () {

        if (this.headerIndex(`id`) === -1) throw new Error(`❌ Unable to generate IDs in ${this.sheet.getName()} because it is missing an 'ID' column.`);

        let entries = this.getData();
        let counter = {};

        for (let entry of entries) {


            if (!counter[entry.parent_id]) counter[entry.parent_id] = 0;
            counter[entry.parent_id]++;
            entry.id = `${entry.parent_id}-L${counter[entry.parent_id]}`;

        }

        const ids = entries.map(entry => entry.id);

        this.update(ids, 2, this.headerIndex(`id`) + 1);

    } */

    /* openInvoice() {

        this.sheet.activate();
        const entries = this.getData(this.getActive().getRow(), 1);

        Log.write(entries);

    } */

    suggestAccounts() {

        const row = this.getCurrentRow();
        
        if (row.description ?? null) {

            //Log.write((row.description, 'description'));
            //Log.write(this.findRowIndexes(row.description, 'description'));
            //Log.write(this.findRowIndex(row.description, 'description'));

            const data    = this.getData();
            const indexes = this.findRowIndexes(row.description, 'description');

            let accounts = {};

            for (const index of indexes) {

                const account = data[index]?.account ?? null;
                if (!account) continue;

                if (!accounts.hasOwnProperty(account)) accounts[account] = 0;
                accounts[account]++;

            }

            let msg = `Account entries for description '${row.description}':\n`;
            for (const account in accounts) msg += `· ${account}: ${accounts[account]}\n`;
            SpreadsheetApp.getUi().alert(msg);
            
        } else {

            SpreadsheetApp.getUi().alert(`Account column missing`);

        }

    }

}