class InvoicesRaw extends withHeadedSheet(class {}) {

    constructor (sheetName = `Invoices Raw`) {

        super(sheetName);
        this.setSheet(sheetName);

    }

    invoiceExists (invoiceId) {

        return this.rowExists(invoiceId, `id`);

    }

    update () {

        const response = ERP.request({endpoint: `get-invoices`});

        const statusCode = response.getResponseCode();
        if (statusCode != 200) throw new Error("❌ Error: " + statusCode + "\n" + response.getContentText());

        const invoices = JSON.parse(response.getContentText());

        this.entries = [];
        this.results = {
            'added':      {},
            'skipped':    {},
            'duplicates': {},
        }

        for (let invoice of invoices) {

            if (this.invoiceExists(invoice.id)) {

                this.results.duplicates[invoice.id] = invoice;
                continue;

            }

            let row = this.newRow(invoice);
            this.entries.push(row);
            this.results.added[row.id] = row;

        }

        if (this.entries.length > 0) this.append(this.entries, `id`);

        SpreadsheetApp.getUi().alert(`Invoices Updated ${this.sheet.getName()}
            Parsed Invoices: ${invoices.length}
            Added Invoices: ${Object.entries(this.results.added).length}
            Duplicate Invoices: ${Object.entries(this.results.duplicates).length}
            Skipped Invoices: ${Object.entries(this.results.skipped).length}`);

    }

}