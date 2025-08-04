class FX {

    static getRate (currency, date) {

        if (currency === 'CAD') return 1;

        const ss       = SpreadsheetApp.getActiveSpreadsheet();
        const sheet    = ss.getSheetByName('FX CAD');
        const timezone = ss.getSpreadsheetTimeZone();
        const dateStr  = Utilities.formatDate(date, timezone, 'yyyy-MM-dd');
        const data     = sheet.getDataRange().getValues();

        for (let i = 1; i < data.length; i++) {

            const rowCurrency = data[i][0];
            const rowDateObj  = data[i][1];
            const rowDateStr  = Utilities.formatDate(new Date(rowDateObj), timezone, 'yyyy-MM-dd');

            if (rowCurrency === currency && rowDateStr === dateStr) return data[i][2];

        }

        const formula = `=INDEX(GOOGLEFINANCE("CURRENCY:${currency}CAD", "price", DATE(${date.getFullYear()}, ${date.getMonth() + 1}, ${date.getDate()})), 2, 2)`;

        const cell = sheet.getRange('Z1');
        cell.setFormula(formula);
        SpreadsheetApp.flush(); // wait for formula to recalc

        const rate = cell.getValue();

        if (rate && typeof rate === 'number' && rate > 0) {

            sheet.appendRow([currency, dateStr, rate]);
            cell.clearContent();  // tidy up helper cell
            return rate;

        } else {

            cell.clearContent();
            throw new Error(`Could not fetch exchange rate for ${currency} on ${dateStr}`);

        }

    }

}