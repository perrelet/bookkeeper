function onOpen() {

    const ui = SpreadsheetApp.getUi();

    const digitalisMenu = ui.createMenu('📒 Digitalis Accounts')
    .addSubMenu(ui.createMenu('📥 Import')
        .addItem('Wise Transactions', 'importWiseTransactions')
        .addItem('Stripe Transactions', 'importStripeTransactions')
        .addItem('Personal Transactions', 'importPersonalTransactions')
    )
    .addSubMenu(ui.createMenu('🧾 Journal')
        .addSubMenu(ui.createMenu('✅ Validation')
            .addItem('Validate Full Journal', 'validateFullJournal')
            .addItem('Validate Import Journal', 'validateImportJournal')
            .addItem('Validate Adjustment Journal', 'validateAdjustmentJournal')
        )
        .addSubMenu(ui.createMenu('💾 Stash')
            .addItem('Stash Journal', 'stashJournal')
            .addItem('Stash Import Journal', 'stashImportJournal')
            .addItem('Stash Adjustment Journal', 'stashAdjustmentJournal')
        )
        .addSeparator()
        .addItem('💡 Suggest Accounts', 'suggestAccounts')
        .addItem('💰 Create GST Adjustment', 'createGSTAdjustment')
        .addItem('Recalculate Balances', 'recalculateJournal')
    )
    .addSubMenu(ui.createMenu('💎 Assets')
        .addItem('Find New Assets', 'findNewAssets')
        .addItem('Stash Asset Registry', 'stashAssetRegistry')
    )
    .addSubMenu(ui.createMenu('📑 Invoices')
        .addItem('Update Invoices', 'updateInvoices')
        .addItem('Find Invoice Entry', 'findInvoiceEntry')
    )
    .addSeparator()
    .addItem('🔗 View Row Links', 'viewRowLinks')
    .addItem('🔍 View Row Meta', 'viewRowMeta')
    .addItem('🧐 About this Sheet', 'aboutSheet')
    .addSeparator()
    .addItem('🧹 Clear Log', 'clearLog')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Options')
        .addItem('🔑 Set ERP Credentials', 'setERPCredentials')
    )
    .addToUi();

}

// ---

function clearLog() {
    Log.get().clear();
}

// ---

function setERPCredentials() {
    ERP.setCredentials();
}

// ---

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
function createGSTAdjustment () {
    const journal = Journal.get(SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getName());
    if (journal) journal.createGSTAdjustment();
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

// ---

function updateInvoices () {
    (new InvoicesRaw()).update();
}
function findInvoiceEntry () {
    (new Invoices()).findEntry();
}

// ---

function findNewAssets() {
    (new AssetRegistry(`Asset Registry`)).findNewAssets(`Journal`);
}
function stashAssetRegistry() {
    (new AssetRegistry(`Asset Registry`)).stash();
}