class StripeTxnImporter extends Importer {

    constructor(sheetName = `Stripe Import`) {

        super(sheetName);

    }

    import(targetSheet = `Import Journal`) {

        if (!this.confirm()) return;

        const journal = Journal.get(targetSheet);

        this.onStart(journal);

        const stripeAccount = Account.get(1002.2);
        const revenueAccount = Account.get(8000.1);
        //const wiseAccount   = Account.get(1002.1);
        const feeAccount    = Account.get(8710.2);
        const taxAccount    = Account.get(2680);

        for (let row of this.data.reverse()) {

            if (journal.txnExists(row.id)) {

                this.results.duplicates[row.id] = row;
                continue;

            }

            /* if (['CANCELLED', 'REFUNDED'].includes(row.status)) {

                this.results.skipped[row.id] = row;
                continue;

            } */

            const createdOn     = new Date(row.created_date_utc);
            const originalAmt   = parseFloat(row.amount) || 0;
            const cadValue      = parseFloat(row.converted_amount) || 0;
            const fxRate        = (!originalAmt) ? 1 : cadValue / originalAmt;
            const currency      = row.currency.toUpperCase();

            if (!cadValue) {

                this.results.skipped[row.id] = row;
                continue;

            }

            const entry = journal.newRow({
                'date':   createdOn,
                'parent_id': row.id,
                'source': `Stripe`,
            });

            let debit = {...entry};
            debit.account           = stripeAccount.label;
            debit.debit_cad         = cadValue;
            debit.original_amount   = originalAmt;
            debit.original_currency = currency;
            debit.exchange_rate     = fxRate;
            debit.description       = `Gross sale received via Stripe for order #${row.order_id_metadata}.`;
            debit.meta              = JSON.stringify(row);
            debit.url               = JSON.stringify({
                'Stripe Transaction': `https://dashboard.stripe.com/payments/${row.id}`,
                'Stripe Customer'   : `https://dashboard.stripe.com/customers/${row.customer_id}`,
                'Stripe Payout'     : `https://dashboard.stripe.com/payouts/${row.transfer}`,
            });

            let description = `Website order #${row.order_id_metadata} from ${row.customer_description} (${row.customer_email})`;
            if (row.payment_type_metadata) description += ` [${row.payment_type_metadata} payment]`;

            let credit = {...entry};
            credit.account     = revenueAccount.label;
            credit.credit_cad  = cadValue;
            credit.invoice     = row.order_id_metadata;
            credit.description = description;

            if (row.order_id_metadata) credit.url = `https://digitalis.ca/account/invoices/${row.order_id_metadata}/`;

            let tax = {...entry};
            if (row.tax_amount_metadata) {

                const taxCAD = row.tax_amount_metadata / 100;

                credit.credit_cad -= taxCAD;

                tax.account     = taxAccount.label;
                tax.credit_cad  = taxCAD;
                tax.invoice     = row.order_id_metadata;
                tax.description = `GST collected on order #${row.order_id_metadata}.`;

            }

            this.entries.push(debit);
            this.entries.push(credit);
            if (tax.credit_cad) this.entries.push(tax);

            if (row.fee) {

                description = `Stripe fee for order #${row.order_id_metadata}.`;

                let debitFee = {...entry};
                debitFee.account     = feeAccount.label;
                debitFee.debit_cad   = row.fee;
                debitFee.description = description;
                debitFee.url         = `https://dashboard.stripe.com/payments/${row.id}`;
                
                let creditFee = {...entry};
                creditFee.account     = stripeAccount.label;
                creditFee.credit_cad  = row.fee;
                creditFee.description  = description;

                this.entries.push(debitFee);
                this.entries.push(creditFee);

            }

            this.results.added[row.id] = row;

        }

        if (this.entries.length > 0) journal.append(this.entries);

        this.onComplete(journal);

    }

}