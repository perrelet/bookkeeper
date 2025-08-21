function onOpen() {

    const ui = SpreadsheetApp.getUi();

    const importSubmenu = ui.createMenu('📥 Import')
        .addItem('Wise Transactions', 'importWiseTransactions')
        .addItem('Stripe Transactions', 'importStripeTransactions')
        .addItem('Personal Transactions', 'importPersonalTransactions');

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

function importWiseTransactions() {
    (new WiseImporter(`Wise Import`)).import(`Import Journal`);
}
function importStripeTransactions() {
    (new StripeTxnImporter(`Stripe Import`)).import(`Import Journal`);
}
function importPersonalTransactions() {
    (new PersonalTxnImporter(`Personal Import`)).import(`Import Journal`);
}

function findNewAssets() {
    (new AssetRegistry(`Asset Registry`)).findNewAssets(`Journal`);
}
function stashAssetRegistry() {
    (new AssetRegistry(`Asset Registry`)).stash();
}