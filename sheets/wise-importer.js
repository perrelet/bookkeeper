class WiseImporter extends Importer {

    constructor(sheetName = `Wise Import`) {
        super(sheetName);
    }

    import(targetSheet = `Import Journal`) {

        if (!this.confirm()) return;

        const journal = Journal.get(targetSheet);

        this.onStart(journal);

        for (let row of this.data.reverse()) {

            this.results.processed++;

            if (journal.txnExists(row.id)) {
                this.results.duplicates[row.id] = row;
                continue;
            }

            if (['CANCELLED'].includes(row.status)) {
                this.skip(row.id, row, 'cancelled_transaction');
                continue;
            }

            if (row.note && row.note.includes(`[[VOID]]`)) {
                this.skip(row.id, row, 'void_transaction');
                continue;
            }

            const srcAmt = parseFloat(row.source_amount_after_fees) || 0;
            const tgtAmt = parseFloat(row.target_amount_after_fees) || 0;

            if (!srcAmt && !tgtAmt) {
                this.skip(row.id, row, 'missing_amounts');
                continue;
            }

            const createdOn = new Date(row.created_on);
            const rate      = parseFloat(row.exchange_rate) || 1;
            const url       = `https://wise.com/transactions/activities/by-resource/` + row.id.replace(`-`, `/`);

            /*
                Determine the CAD value of the main movement.

                Rule:
                - If either side is CAD, the CAD value is the CAD side after fees.
                - If neither side is CAD, convert the source amount after fees using FX.getRate(sourceCurrency -> CAD).
            */
            let cadValue = 0;

            if (row.source_currency === 'CAD') {
                cadValue = srcAmt;
            } else if (row.target_currency === 'CAD') {
                cadValue = tgtAmt;
            } else {
                const fxToCAD = FX.getRate(row.source_currency, createdOn);
                if (!fxToCAD) {
                    this.skip(row.id, row, 'missing_fx_to_cad');
                    continue;
                }
                cadValue = srcAmt * fxToCAD;
            }

            /*
                Decide fee amount, fee currency, and which side paid it.

                Wise usually uses source fees.
                If target_fee_amount exists, treat that as target-paid.
            */
            const srcFee = parseFloat(row.source_fee_amount) || 0;
            const tgtFee = parseFloat(row.target_fee_amount) || 0;

            let fee = 0;
            let feeCurrency = '';
            let feeSide = ''; // 'source' or 'target'

            if (srcFee) {
                fee = srcFee;
                feeCurrency = row.source_fee_currency || row.source_currency;
                feeSide = 'source';
            } else if (tgtFee) {
                fee = tgtFee;
                feeCurrency = row.target_fee_currency || row.target_currency;
                feeSide = 'target';
            }

            /*
                Convert fee to CAD using feeCurrency -> CAD spot, not exchange_rate.
            */
            let feeCAD = 0;

            if (fee) {
                if (feeCurrency === 'CAD') {
                    feeCAD = fee;
                } else {
                    const feeFxToCAD = FX.getRate(feeCurrency, createdOn);
                    if (!feeFxToCAD) {
                        this.skip(row.id, row, 'missing_fee_fx_to_cad');
                        continue;
                    }
                    feeCAD = fee * feeFxToCAD;
                }
            }

            /*
                Build description.
            */
            let description = `${row.source_name} → ${row.target_name}`;
            if (row.category)              description += ` "${row.category}"`;
            if (row.note)                  description += ` (${row.note})`;
            if (row.status !== 'COMPLETED') description += ` [${row.status}]`;

            /*
                Create fee entry (separate line), if any.
                Original currency for fee should be the fee currency.
                Exchange rate stored should match feeCurrency -> CAD for audit.
            */
            let feeEntry = false;

            if (fee) {

                let feeFxUsed = 1;
                if (feeCurrency !== 'CAD') {
                    feeFxUsed = FX.getRate(feeCurrency, createdOn);
                }

                feeEntry = journal.newRow({
                    'date':              createdOn,
                    'account':           Account.get(8710.1).label,
                    'debit_cad':         feeCAD,
                    'original_amount':   fee,
                    'original_currency': feeCurrency,
                    'exchange_rate':     feeFxUsed,
                    'description':       `Transaction fees for ${row.id}`,
                    'parent_id':         row.id,
                    'source':            `Wise`,
                    'url':               url,
                    'meta':              JSON.stringify(row),
                });

            }

            const originalCur = row.source_currency;

            // Exchange rate stored should represent originalCur -> CAD for reporting.
            // If Wise target is CAD, Wise exchange_rate is usually the correct originalCur->CAD rate.
            // Otherwise fall back to your FX table.

            let fxToCAD = 1;

            if (originalCur === 'CAD') {
                fxToCAD = 1;
            } else if (row.target_currency === 'CAD' && rate) {
                fxToCAD = rate;
            } else {
                fxToCAD = FX.getRate(originalCur, createdOn);
                if (!fxToCAD) {
                    this.skip(row.id, row, 'missing_fx_to_cad');
                    continue;
                }
            }

            const baseEntry = journal.newRow({
                'date':              createdOn,
                'original_amount':   srcAmt,
                'original_currency': originalCur,
                'exchange_rate':     fxToCAD,
                'description':       description,
                'parent_id':         row.id,
                'source':            `Wise`,
            });

            let drEntry = { ...baseEntry };
            let crEntry = { ...baseEntry };

            /*
                Determine the Wise bank account label you want to auto-fill for IN/OUT.
                For NEUTRAL you said you want manual assignment, so we leave accounts blank there.
            */
            const wiseBankSource = Account.nameToLabel(`Bank (Wise - ${row.source_currency})`);
            const wiseBankTarget = Account.nameToLabel(`Bank (Wise - ${row.target_currency})`);

            /*
                categoryAccount stays manual in your system.
                Keep as empty string here, so you can fill or post-process.
            */
            let categoryAccount = '';

            /*
                Posting rules that reconcile to Wise balance statements:

                OUT:
                    Dr category            cadValue
                    Dr fee expense         feeCAD (separate line)
                    Cr Wise bank           cadValue + feeCAD   (bank paid the fee)

                IN:
                    Dr Wise bank           cadValue            (bank received net)
                    Dr fee expense         feeCAD (separate line)
                    Cr category            cadValue + feeCAD   (grossed up to include withheld fee)

                NEUTRAL:
                    Keep accounts manual.
                    If feeSide == 'source':
                        Receiving leg stays cadValue
                        Opposite leg becomes cadValue + feeCAD
                    If feeSide == 'target' (rare):
                        Receiving leg is cadValue (still)
                        Opposite leg is cadValue + feeCAD, but conceptually fee is on target side
                        Without fixed accounts, we still balance by grossing the opposite leg.
            */
            switch (row.direction) {

                case 'NEUTRAL':

                    drEntry.debit_cad  = cadValue;

                    crEntry.credit_cad = feeCAD ? cadValue + feeCAD : cadValue;

                    break;

                case 'IN':

                    drEntry.account    = wiseBankTarget;  // money lands in target currency balance
                    drEntry.debit_cad  = cadValue;

                    crEntry.account    = Account.nameToLabel(categoryAccount);
                    crEntry.credit_cad = feeCAD ? cadValue + feeCAD : cadValue;

                    break;

                case 'OUT':

                    drEntry.account    = Account.nameToLabel(categoryAccount);
                    drEntry.debit_cad  = cadValue;

                    crEntry.account    = wiseBankSource;  // money leaves source currency balance
                    crEntry.credit_cad = feeCAD ? cadValue + feeCAD : cadValue;

                    break;

                default:

                    this.skip(row.id, row, 'unknown_direction');
                    SpreadsheetApp.getUi().alert(`Transaction ${row.id} skipped as its direction '${row.direction}' is not recognised.`);
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
