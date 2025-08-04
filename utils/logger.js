class Log {

    static get(sheetName = 'Log') {

        if (!this._logs) this._logs = {};

        if (!(sheetName in this._logs)) this._logs[sheetName] = new Log(sheetName);

        return this._logs[sheetName];

    }

    static write(message, sheetName = 'Log') {

        Log.get(sheetName).out(message)

    }

    constructor(sheetName) {

        const ss = SpreadsheetApp.getActive();
        this.sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

    }

    out(message) {

        if (this.sheet.getLastRow() === 0) this.sheet.appendRow(['Timestamp', 'Message']);

        const entry = [
            new Date(),
            typeof message === 'object' ? JSON.stringify(message) : message
        ];

        this.sheet.appendRow(entry);

    }

    clear() {

        const lastRow = this.sheet.getLastRow();
        if (lastRow > 1) this.sheet.deleteRows(2, lastRow - 1);

        SpreadsheetApp.getUi().alert(`🧹 Log '${this.sheet.getName()}' Successfully Cleared`);

    }

}