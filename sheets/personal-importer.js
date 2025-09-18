class PersonalTxnImporter extends Importer {

    constructor(sheetName = `Personal Import`) {

        super(sheetName);

    }

    import(targetSheet = `Import Journal`) {

        if (!this.confirm()) return;

        const journal = Journal.get(targetSheet);

        this.onStart(journal);

        for (let row of this.data.reverse()) {

            const date = new Date(row.tx_date);
            const id   = Utils.toSnakeCase(row.account) + `-` + date.getFullYear() + `-` + (date.getMonth() + 1) + `-` + date.getDate() + `-` + Utils.toSnakeCase(row.description) + `-` + row.amount;

            if (journal.txnExists(id)) {

                this.results.duplicates[id] = row;
                continue;

            }

            const cadValue = -1 * (parseFloat(row.deductable) || 0);
            const factor   = parseFloat(row.write_off) || 1;

            if (!cadValue) {

                this.results.skipped[row.id] = row;
                continue;

            }

            const debitAccount = Account.get(row.corp_expense_cat);
            if (!debitAccount) throw new Error(`Could not find account name '${debitAccount}' for personal transaction '${id}'.`);

            const shareholderName = (row.account.toLowerCase().includes(`cami`)) ? `Cami` : `Jamie`;
            const creditAccount   = Account.get(`Shareholder Loan - ` + shareholderName);

            const entry = journal.newRow({
                'date':      date,
                'parent_id': id,
                'source':    `Personal`,
            });

            let description = row.description;
            if (factor < 1) description += ` [` + (factor * 100) + `% Business / ` + ((1 - factor) * 100) + `% Personal]`;
            description += ` (${row.account})`;

            let debit = {...entry};
            debit.account           = debitAccount.label;
            debit.debit_cad         = cadValue;
            debit.itc_cad           = (row.gst == ``) ? `` : factor * parseFloat(row.gst);
            debit.invoice           = row.notes;
            debit.description       = description;

            let credit = {...entry};
            credit.account          = creditAccount.label;
            credit.credit_cad       = cadValue;
            credit.description      = `Paid personally by ${shareholderName}`;

            this.entries.push(debit);
            this.entries.push(credit);

            this.results.added[id] = row;

        }

        if (this.entries.length > 0) journal.append(this.entries);

        this.onComplete(journal);

    }

}