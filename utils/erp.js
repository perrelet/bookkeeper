class ERP {

    static setCredentials () {

        const ui    = SpreadsheetApp.getUi();
        const props = new Props();

        const userPrompt = ui.prompt("Enter ERP Application Username:");
        if (userPrompt.getSelectedButton() !== ui.Button.OK) return;

        const passPrompt = ui.prompt("Enter ERP Application Password:");
        if (passPrompt.getSelectedButton() !== ui.Button.OK) return;

        const username = userPrompt.getResponseText();
        const password = passPrompt.getResponseText();

        const response = ERP.request({
            endpoint: `test-auth`,
            credentials: {
                username: username,
                password: password,
            },
        });

        if (response.getResponseCode() != 200) {
            ui.alert(`❌ Authentication Failed with status code ${response.getResponseCode()}`);
            return;
        }

        props.set("ERP_APP_USERNAME", username);
        props.set("ERP_APP_PASSWORD", password);
    
        ui.alert("✅ ERP credentials saved");

    }

    static request ({
        endpoint    = ``,
        method      = `get`,
        params      = {},
        headers     = {},
        credentials = {}
    }) {

        const props    = new Props();
        const username = credentials?.username ?? props.get(`ERP_APP_USERNAME`);
        const password = credentials?.password ?? props.get(`ERP_APP_PASSWORD`);
        const url      = `https://digitalis.ca/wp-json/digitalis/v1/${endpoint}`;

        headers = Object.assign({
            Authorization: "Basic " + Utilities.base64Encode(username + ":" + password)
        }, headers);

        return UrlFetchApp.fetch(url, {
            method:             method,
            headers:            headers,
            muteHttpExceptions: true
        });

    }

}