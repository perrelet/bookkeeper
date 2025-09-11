class WiseImporter extends Importer {

    constructor(sheetName = `Wise Import`) {

        super(sheetName);

    }

    import(targetSheet = `Import Journal`) {

        if (!this.confirm()) return;

        const journal = Journal.get(targetSheet);

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

                feeEntry = journal.newRow({
                    'date':             createdOn,
                    'account':          Account.get(8710.1).label,
                    'debit_cad':        feeCAD,
                    'orginal_amount':   fee,
                    'orginal_currency': currency,
                    'exchange_rate':    fxRate,
                    'description':      `Transaction fees for ${row.id}`,
                    'parent_id':        row.id,
                    'source':           `Wise`,
                });

            }

            let description = `${row.source_name} → ${row.target_name}`;
            if (row.category) description += ` "${row.category}"`;
            if (row.note)     description += ` (${row.note})`;

            const entry = journal.newRow({
                'date':             createdOn,
                'orginal_amount':   originalAmt,
                'orginal_currency': currency,
                'exchange_rate':    fxRate,
                'description':      description,
                'parent_id':        row.id,
                'source':           `Wise`,
            });

            let drEntry = {...entry};
            let crEntry = {...entry};

            switch (row.direction) {

                case 'NEUTRAL':

                    //drEntry.account  = `Bank (Wise - ${row.source_currency})`;
                    drEntry.debit_cad  = feeCAD ? cadValue - feeCAD : cadValue;
                    drEntry.url        = url;
                    drEntry.meta       = JSON.stringify(row);
                    //crEntry.account  = `Bank (Wise - ${row.target_currency})`; // May be moving to tax account, it's ambigious...
                    crEntry.credit_cad = cadValue;
                    crEntry.url        = url;
                    crEntry.meta       = JSON.stringify(row);
                    break;

                case 'IN':

                    drEntry.account    = Account.nameToLabel(wiseAccount);
                    drEntry.debit_cad  = feeCAD ? cadValue - feeCAD : cadValue;
                    drEntry.url        = url;
                    drEntry.meta       = JSON.stringify(row);
                    crEntry.account    = Account.nameToLabel(categoryAccount);
                    crEntry.credit_cad = cadValue;
                    break;

                case 'OUT':

                    drEntry.account    = Account.nameToLabel(categoryAccount);
                    drEntry.debit_cad  = feeCAD ? cadValue - feeCAD : cadValue;
                    crEntry.account    = Account.nameToLabel(wiseAccount);
                    crEntry.credit_cad = cadValue;
                    crEntry.url        = url;
                    crEntry.meta       = JSON.stringify(row);
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