function onOpen() {

    const ui = SpreadsheetApp.getUi();

    const importSubmenu = ui.createMenu('📥 Import')
        .addItem('Wise Transactions', 'importWiseTransactions')
        .addItem('Stripe Transactions', 'importStripeTransactions');

    const journalValidation = ui.createMenu('✅ Validation')
        .addItem('Validate Full Journal', 'validateFullJournal')
        .addItem('Validate Import Journal', 'validateImportJournal')
        .addItem('Validate Adjustment Journal', 'validateAdjustmentJournal')

    const journalStash = ui.createMenu('💾 Stash')
        .addItem('Stash Journal', 'stashJournal')
        .addItem('Stash Import Journal', 'stashImportJournal')
        .addItem('Stash Adjustment Journal', 'stashAdjustmentJournal')

    const journalSubmenu = ui.createMenu('🧾 Journal')
        .addSubMenu(journalValidation)
        .addSubMenu(journalStash)
        .addSeparator()
        .addItem('💡 Suggest Accounts', 'suggestAccounts')
        .addItem('Recalculate Balances', 'recalculateJournal')

    const assetsSubmenu = ui.createMenu('💎 Assets')
        .addItem('Find New Assets', 'findNewAssets')
        .addItem('Stash Asset Registry', 'stashAssetRegistry');

    const toolsMenu = ui.createMenu('📒 Digitalis Accounts')
        .addSubMenu(importSubmenu)
        .addSubMenu(journalSubmenu)
        .addSubMenu(assetsSubmenu)
        .addSeparator()
        .addItem('🔗 View Row Links', 'viewRowLinks')
        .addItem('🔍 View Row Meta', 'viewRowMeta')
        .addItem('🧐 About this Sheet', 'aboutSheet')
        .addSeparator()
        .addItem('🧹 Clear Log', 'clearLog');

    toolsMenu.addToUi();

}

function clearLog() {
    Log.get().clear();
}

function validateFullJournal() {
    Journal.get(`Journal`).validate();
}
function validateImportJournal() {
    Journal.get(`Import Journal`).validate();
}
function validateAdjustmentJournal() {
    Journal.get(`Adjustment Journal`).validate();
}

function stashJournal() {
    Journal.get(`Journal`).stash();
}
function stashImportJournal() {
    Journal.get(`Import Journal`).stash();
}
function stashAdjustmentJournal() {
    Journal.get(`Adjustment Journal`).stash();
}

function suggestAccounts() {
    const journal = Journal.get();
    if (journal) journal.suggestAccounts();
}

function viewRowLinks() {
    
    const sheet = new HeadedSheet();
    sheet.setSheet(SpreadsheetApp.getActiveSpreadsheet().getActiveSheet());
    const row = sheet.getCurrentRow();

    let links = {};

    if (row.url) {

        const parsedURLs = JSON.parse(row.url);

        if (typeof parsedURLs === 'object' && parsedURLs !== null) {

            for (const key in parsedURLs) links[key] = parsedURLs[key];
            
        } else {

            links[(row.source + ` Reference`) ?? 'URL'] = row.url;

        }

    }

    if (row.invoice) {

        if (typeof row.invoice == `number`) {
            links[`Digitalis Invoice`] = `http://digitalis.ca/account/invoices/` + row.invoice;
        } else {
            links[`Invoice`] = row.invoice;
        }

    }

    if (Object.keys(links).length === 0) {

        SpreadsheetApp.getUi().alert(`Row ${row.row} doesn't have any links.`);

    } else {

        let linkHTML = '';
        for (const key in links) linkHTML +=
            `<div><a href="${links[key]}" target="_blank">
                <button style="padding: 0.75em 1em; cursor: pointer;">${key}</button>
            </a></div>`;

        const html = HtmlService.createHtmlOutput(`
            <div style="font-family: sans-serif;">
            ${linkHTML}
            </div>
        `);//.setWidth(250).setHeight(120);

        SpreadsheetApp.getUi().showModalDialog(html, `Links for Row ${row.row}:`);

    }

}

function viewRowMeta () {

    const sheet = new HeadedSheet();
    sheet.setSheet(SpreadsheetApp.getActiveSpreadsheet().getActiveSheet());
    const row = sheet.getCurrentRow();

    if (!row.meta) {

        SpreadsheetApp.getUi().alert(`Row ${row.row} doesn't have any meta data attached.`);

    } else {

        let parsed;
        try {
            parsed = JSON.parse(row.meta);
        } catch (e) {
            throw new Error(`❌ Invalid JSON in meta column on row ${row.row}.`);
        }

        //const html = HtmlService.createHtmlOutput(`
        //    <pre style="white-space: pre-wrap; font-family: monospace; padding: 10px;">${JSON.stringify(parsed, null, 2)}</pre>
        //    `);//.setWidth(400).setHeight(300);

        let tableHtml = `<table style="border-collapse: collapse; width: 100%; font-family: sans-serif;">`;
        tableHtml += `<tr><th style="text-align:left; border-bottom: 1px solid #ccc; padding: 6px;">Key</th><th style="text-align:left; border-bottom: 1px solid #ccc; padding: 6px;">Value</th></tr>`;

        for (const [key, value] of Object.entries(parsed)) {
            tableHtml += `
            <tr>
                <td style="padding: 6px; border-bottom: 1px solid #eee;"><code>${key}</code></td>
                <td style="padding: 6px; border-bottom: 1px solid #eee;"><code>${value}</code></td>
            </tr>`;
        }

        tableHtml += `</table>`;
        const html = HtmlService.createHtmlOutput(tableHtml);

        SpreadsheetApp.getUi().showModalDialog(html, `Metadata for Row ${row.row}:`);

    }

}

function aboutSheet() {

    const ss           = SpreadsheetApp.getActiveSpreadsheet();
    const currentSheet = ss.getActiveSheet();
    const currentName  = currentSheet.getName();
    const readme       = ss.getSheetByName("README");
    const dataRange    = readme.getDataRange().getValues();

    for (let i = 0; i < dataRange.length; i++) {

        const row = dataRange[i];
        const rawName = row[0];

        if (rawName && rawName.replace(/^[·•\s]+/, '').trim() === currentName) {

            let msg = `📘 About ${currentName}:\n\n${row[1]}`;
            if (row[2]) msg += `\n\nPermission: ${row[2]}`;
            SpreadsheetApp.getUi().alert(msg);
            return;

        }

    }

    SpreadsheetApp.getUi().alert(`No description found for sheet: ${currentName}`);

}

function importWiseTransactions() {
    (new WiseImporter(`Wise Import`)).import(`Import Journal`);
}
function importStripeTransactions() {
    (new StripeTxnImporter(`Stripe Import`)).import(`Import Journal`);
}

function findNewAssets() {
    (new AssetRegistry(`Asset Registry`)).findNewAssets(`Journal`);
}
function stashAssetRegistry() {
    (new AssetRegistry(`Asset Registry`)).stash();
}