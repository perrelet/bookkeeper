class Invoices extends withHeadedSheet(class {}) {

    constructor (sheetName = `Invoices`) {

        super(sheetName);
        this.setSheet(sheetName);

    }

    invoiceExists (invoiceId) {

        return this.rowExists(invoiceId, `id`);

    }

    findEntry (valueFuzz = 0.15, dateFuzz = 7) {

        const invoice = this.getCurrentRow();

        if (!invoice.hasOwnProperty(`paid`)) throw new Error(`❌ Please open the 'Invoices' sheet and retry.`);
        if (invoice.entry_id != ``)          throw new Error(`❌ Invoice already has a entry_id.`);

        const round      = n => Math.round(parseFloat(n) * 100) / 100;
        const paidDate   = new Date(invoice.paid);
        const journal    = Journal.get(`Journal`);
        const entries    = journal.getData();
        const revAccount = Account.get(8000.1).label;
        const taxAccount = Account.get(2680.1).label;

        let matches  = [];
        let taxFound = false;

        for (const entry of entries) {
            
            if (entry.currency && invoice.currency && (entry.currency != invoice.currency))     continue;
            if (Math.abs((new Date(entry.date) - paidDate) / (1000 * 60 * 60 * 24)) > dateFuzz) continue;

            const entryValue = round(entry.original_amount || entry.credit_cad);

            if (entry.account == revAccount) {

                if (
                    (Math.abs(entryValue - round(invoice.total)) <= valueFuzz) ||
                    (invoice.tax_total && (Math.abs(entryValue - round(invoice.total - invoice.tax_total)) <= valueFuzz))
                ) {

                    matches.push(entry);

                }

            } else if (invoice.tax_total && (entry.account == taxAccount)) {

                if (Math.abs(entryValue - round(invoice.tax_total)) <= valueFuzz) taxFound = true;

            }

        }

        const ui = SpreadsheetApp.getUi();

        switch (matches.length) {

            case 0:
                ui.alert(`❌ No matching journal entries found`);
                return;

            case 1:

                const entry = matches[0];

                var msg = ``;
                for (const [key, value] of Object.entries(entry)) msg += `${key}: ${value}\n`
                msg += `\nWould you like to use this entry?`;
                
                if (ui.alert(
                    '✅ Found 1 matching journal entry',
                    msg,
                    ui.ButtonSet.YES_NO
                ) !== ui.Button.YES) return;
                
                this.sheet.getRange(this.sheet.getActiveRange().getRow(), 1).setValue(entry.parent_id);

                if (!invoice.tax_total) return;

                // Maybe insert tax entries

                if (taxFound) {

                    ui.alert('✅ Journal entries for taxes already exist.');
                    return;

                }

                if (ui.alert(
                    '✍ Insert Tax Adjustments?',
                    'This invoice has tax line(s), would you like to generate the adjustment entries for the tax portion?',
                    ui.ButtonSet.YES_NO
                ) !== ui.Button.YES) return;

                const adjustJournal = Journal.get(`Adjustment Journal`);

                let revEntry = adjustJournal.newRow(entry);
                let taxEntry = adjustJournal.newRow(entry);

                revEntry.account         = revAccount;
                revEntry.debit_cad       = invoice.tax_total;
                revEntry.credit_cad      = ``;
                revEntry.original_amount = ``;
                revEntry.description     = `Reduce over-reported revenue due to taxes collected`;
                revEntry.source          = `auto-tax-adjust`;

                taxEntry.account         = taxAccount;
                taxEntry.debit_cad       = ``;
                taxEntry.credit_cad      = invoice.tax_total;
                taxEntry.original_amount = ``;
                taxEntry.description     = `GST collected on order #${invoice.id}`;
                taxEntry.source          = `auto-tax-adjust`;

                adjustJournal.append([
                    revEntry,
                    taxEntry
                ]);

                ui.alert('✅ Adjustment entries added.')

                return;

            default:

                var msg = `🤹 Multiple Matching Entries Found:\n`;
                for (const entry of matches) msg += `${entry.entry_id}\n`;

                ui.alert(msg);

                return;

        }
        

    }

}