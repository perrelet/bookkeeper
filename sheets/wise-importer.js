class WiseImporter extends Importer {

    constructor(sheetName = `Wise Import`) {

        super(sheetName);

    }

     import(targetSheet = `Import Journal`) {

        if (!this.confirm()) return;

        const journal       = Journal.get(targetSheet);
        const debitCol      = journal.headerIndex(`debit_cad`);
        const creditCol     = journal.headerIndex(`credit_cad`);
        const accountCol    = journal.headerIndex(`account`);
        const urlCol        = journal.headerIndex(`url`);
        const metaCol       = journal.headerIndex(`meta`);

        this.onStart(journal);

        for (let row of this.data.reverse()) {

            if (journal.txnExists(row.id)) {

                this.results.duplicates[row.id] = row;
                continue;

            }

            if (['CANCELLED', 'REFUNDED'].includes(row.status)) {

                this.results.skipped[row.id] = row;
                continue;

            }

            const srcAmt = parseFloat(row.source_amount_after_fees) || 0;
            if (!srcAmt) {

                this.results.skipped[row.id] = row;
                continue;

            }

            const createdOn = new Date(row.created_on);
            const tgtAmt    = parseFloat(row.target_amount_after_fees) || 0;
            const srcFee    = parseFloat(row.source_fee_amount) || 0;
            const tgtFee    = parseFloat(row.target_fee_amount) || 0;
            const rate      = parseFloat(row.exchange_rate) || 1;
            const url       = `https://wise.com/transactions/activities/by-resource/` + row.id.replace(`-`, `/`);

            let wiseAccount = '', categoryAccount = '', originalAmt = '', fxRate = '', currency = '';
            let cadValue = 0;

            if (row.source_currency === 'CAD' && row.target_currency === 'CAD') {

                cadValue    = srcAmt;
                currency    = 'CAD';
                fxRate      = 1;
                originalAmt = srcAmt;
                wiseAccount = `Bank (Wise - CAD)`;

            } else if (row.target_currency === 'CAD') {

                cadValue    = tgtAmt;
                currency    = row.source_currency;
                fxRate      = rate;
                originalAmt = srcAmt;
                wiseAccount = `Bank (Wise - ${row.source_currency})`;

            } else if (row.source_currency === 'CAD') {

                cadValue    = srcAmt;
                currency    = row.target_currency;
                fxRate      = rate;
                originalAmt = tgtAmt;
                wiseAccount = `Bank (Wise - ${row.source_currency})`;

            } else {

                const fxCAD = FX.getRate(row.source_currency, createdOn);

                if (!fxCAD) {

                    Logger.log(`Missing CAD exchange rate for ${row.source_currency} on ${createdOn}`);
                    continue; // skip or flag this row

                }

                cadValue    = srcAmt * fxCAD;
                currency    = row.source_currency;
                fxRate      = fxCAD;
                originalAmt = srcAmt;
                wiseAccount = `Bank (Wise - ${row.source_currency})`;
            
            }

            const fee = srcFee ? srcFee : (tgtFee ? tgtFee : 0);
            let feeEntry = false, feeCAD = false;
            //const feeCur = srcFeeCur ? srcFeeCur : tgtFeeCur;

            if (fee) {

                feeCAD = fee * fxRate;
                
                feeEntry = [
                    createdOn,
                    Account.get(8710.1).label,
                    feeCAD,
                    ``,
                    fee,
                    currency,
                    fxRate,
                    ``, // Client (manual)
                    ``, // Invoice (manual)
                    `Transaction fees for ${row.id}`,
                    row.id,
                    `Wise`,
                    ``,
                    ``
                ];

            }

            let description = `${row.source_name} → ${row.target_name}`;
            if (row.category) description += ` "${row.category}"`;
            if (row.note) description += ` (${row.note})`;

            let entry = [
                createdOn,
                ``,
                ``,
                ``,
                originalAmt,
                currency,
                fxRate,
                ``, // Client (manual)
                ``, // Invoice (manual)
                description,
                row.id,
                `Wise`,
                ``,
                ``
            ];

            let drEntry = [...entry];
            let crEntry = [...entry];

            switch (row.direction) {

                case 'NEUTRAL':

                    //drEntry[accountCol] = `Bank (Wise - ${row.source_currency})`;
                    drEntry[debitCol]   = feeCAD ? cadValue - feeCAD : cadValue;
                    drEntry[urlCol]     = url;
                    drEntry[metaCol]    = JSON.stringify(row);
                    //crEntry[accountCol] = `Bank (Wise - ${row.target_currency})`; // May be moving to tax account, it's ambigious...
                    crEntry[creditCol]  = cadValue;
                    crEntry[urlCol]     = url;
                    crEntry[metaCol]    = JSON.stringify(row);
                    break;

                case 'IN':

                    drEntry[accountCol] = Account.nameToLabel(wiseAccount);
                    drEntry[debitCol]   = feeCAD ? cadValue - feeCAD : cadValue;
                    drEntry[urlCol]     = url;
                    drEntry[metaCol]    = JSON.stringify(row);
                    crEntry[accountCol] = Account.nameToLabel(categoryAccount);
                    crEntry[creditCol]  = cadValue;
                    break;

                case 'OUT':

                    drEntry[accountCol] = Account.nameToLabel(categoryAccount);
                    drEntry[debitCol]   = feeCAD ? cadValue - feeCAD : cadValue;
                    crEntry[accountCol] = Account.nameToLabel(wiseAccount);
                    crEntry[creditCol]  = cadValue;
                    crEntry[urlCol]     = url;
                    crEntry[metaCol]    = JSON.stringify(row);
                    break;
                
                default:
                    this.results.skipped[row.id] = row;
                    SpreadsheetApp.getUi().alert(`Transaction ${row.id} skipped as its direction '${row.direction}' is not recognised.`)
                    continue;

            }

            this.entries.push(drEntry);
            if (feeEntry) this.entries.push(feeEntry);
            this.entries.push(crEntry);

            this.results.added[row.id] = row;

        }

        if (this.entries.length > 0) journal.append(this.entries);

        this.onComplete(journal);

    }

}