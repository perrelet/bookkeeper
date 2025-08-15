function withHeadedSheet(Base) {

    return class extends Base {

        constructor(...args) {

            super(...args);

        }

        setSheet(sheet) {

            if (typeof sheet === "string") {
                this.sheet = SpreadsheetApp.getActive().getSheetByName(sheet);
            } else if (sheet instanceof Object) {
                this.sheet = sheet;
            } else if (sheet === null) {
                this.sheet =  SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
            } else {
                throw new Error("Invalid argument: must be a sheet name (string) or Sheet object");
            }

            this.mapHeaders();

        }

        mapHeaders() {

            this.headers = this.sheet.getDataRange().getValues().shift().map(Utils.toSnakeCase);

        }

        headerIndex(name) {

            return this.headers.indexOf(name);

        }

        headerLabel(index) {

            return this.headers[index] ?? null;

        }

        getData(start = 1, n = null, formula = false) {

            const data = formula ? this.sheet.getDataRange().getFormulas() : this.sheet.getDataRange().getValues();
            const rows = (n === null) ? data.slice(start) : data.slice(start, start + n);

            return rows
                .filter(row => row.some(cell => cell !== "" && cell !== null))
                .map((row, index) => {

                    let entry = {};

                    this.headers.forEach((header, i) => {
                        entry[header] = row[i];
                    });

                    entry.row = index + start + 1;

                    return entry;

                });

        }

        getCurrentRow() {

            return this.getData(this.sheet.getActiveRange().getRow() - 1, 1)[0];

        }

        append(data) {

            if (!Array.isArray(data) || data.length === 0) return;

            if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
                data = data.map(row => this.headers.map(header => row[header] ?? ''));
            }

            this.sheet
                .getRange(this.sheet.getLastRow() + 1, 1, data.length, data[0].length)
                .setValues(data);

        }

        update(data, startRow = 2, startCol = 1) {

            if (!Array.isArray(data))    data = [[]];
            if (!Array.isArray(data[0])) data = data.map(value => [value]);

            this.sheet.getRange(startRow, startCol, data.length, data[0].length).setValues(data);

        }

        newRow(data = {}) {

            const row = {};
            for (const key of this.headers) row[key] = (key in data) ? data[key] : '';
            return row;

        }

        rowExists(value, column = `ID`) {

            return Number.isInteger(this.findRowIndex(value, column));

        }

        findRowIndexes(value, column = `ID`) {

            const lastRow = this.sheet.getLastRow();
            if (lastRow <= 1) return false;

            const values = this.sheet.getRange(2, this.headers.indexOf(column) + 1, lastRow - 1, 1).getValues().flat();

            return values.reduce(
                (acc, v, i) => (v === value && acc.push(i), acc),
            []);;

        }

        findRowIndex(value, column = `ID`) {

            const lastRow = this.sheet.getLastRow();
            if (lastRow <= 1) return false;
            const values = this.sheet.getRange(2, this.headers.indexOf(column) + 1, lastRow - 1, 1).getValues().flat();
            const index  = values.indexOf(value);

            return (index == -1) ? false : index;

            //return this.findRowIndexes(value, column)[0] ?? null;

        }

        findRow(value, column = `ID`) {

            const rowIndex = this.findRowIndex(value, column);
            return rowIndex ? this.getData(rowIndex + 1, 1)[0] : false;

        }

        stash(stashName = null, hide = true) {

            if (!stashName) stashName = `STASH_${this.sheet.getName()}`;

            const ss   = SpreadsheetApp.getActiveSpreadsheet();
            const data = this.sheet.getDataRange().getValues();

            let stashSheet = ss.getSheetByName(stashName);
            if (stashSheet) {
                stashSheet.clearContents();
            } else {
                stashSheet = ss.insertSheet(stashName);
                stashSheet.hideSheet();
            }

            stashSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
            if (hide) stashSheet.hideSheet();

        }

    };

}

class HeadedSheet extends withHeadedSheet(class {}) {}