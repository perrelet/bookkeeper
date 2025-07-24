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

        

    };

}

class HeadedSheet extends withHeadedSheet(class {}) {}