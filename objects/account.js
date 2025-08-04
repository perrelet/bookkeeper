class Account {

    static get accounts() {

        if (!this._accounts) Account.loadAccounts();
        return this._accounts;

    }

    static loadAccounts() {

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('Accounts');
        const data = sheet.getDataRange().getValues();

        const headers = data[0];
        const rows    = data.slice(1);

        const accounts = rows.map(row => {
            const obj = {};
            headers.forEach((h, i) => {
                obj[Utils.toSnakeCase(h.trim())] = row[i];
            });
            return obj;
        });

        this._accounts = {};
        this._codeMap = {};
        this._labelMap = {};

        for (const acc of accounts) {

            const account = new Account(acc);

            this._accounts[account.name.toLowerCase()] = account;
            this._codeMap[account.code] = account;
            this._labelMap[account.label.toLowerCase()] = account;

        }

    }

    static get(query) {

        if (!query) return;

        Account.accounts;

        query = query.toString().toLowerCase();

        if (query in this._accounts) {
            return Account.accounts[query];
        } else if (query in this._codeMap) {
            return Account._codeMap[query];
        } else if (query in this._labelMap) {
            return Account._labelMap[query];
        }

    }

    static getByLabel(label) {

        return Account._labelMap[label] ?? null;

    }

    static nameToLabel(name) {

        const account = Account.get(name);
        return account ? account.label : null;

    }

    constructor(data) {

        this.name = data.account;
        this.code = data.gifi;
        if (data.part) this.code += `.` + data.part;

        Object.assign(this, data);

    }

}