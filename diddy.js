const saito = require('../../lib/saito/saito');
const DiddyMain = require('./lib/main');
const ModTemplate = require('../../lib/templates/modtemplate');
const SaitoHeader = require('../../lib/saito/ui/saito-header/saito-header');

class Diddy extends ModTemplate {
    constructor(app) {
        super(app);

        this.app = app;
        this.name = 'Diddy';
        this.slug = 'diddy';

        this.description = 'Module that creates a root website on a Saito node.';
        this.categories = 'Utilities Communications';
        this.class = 'utility';

        this.diddy = { count: 0, level: 1 }; // Only count and level are persistent
        this.ui = null;

        return this;
    }

    initialize(app) {
        super.initialize(app);

        console.log("Initializing Diddy module...");

        // Load persistent state
        this.load();

        // Ensure dynamic properties (like level) are recalculated
        this.recalculateState();

        // Initialize components
        this.ui = new DiddyMain(app, this);
        this.header = new SaitoHeader(app, this);

        // Add components to the app
        this.addComponent(this.ui);
        this.addComponent(this.header);
    }

    recalculateState() {
        // Recalculate level based on count
        this.diddy.level = Math.floor(this.diddy.count / 10) + 1; // Example: 10 taps per level
        console.log(`Recalculated state: Count = ${this.diddy.count}, Level = ${this.diddy.level}`);
    }

    save() {
        // Save count and level to persistent storage
        console.log("Saving state:", this.diddy);
        this.app.options.diddy = this.diddy;
        this.app.storage.saveOptions();
    }

    load() {
        console.log("Loading state...");
        if (this.app.options.diddy) {
            this.diddy = this.app.options.diddy; // Load the saved state
        } else {
            this.diddy = { count: 0, level: 1 }; // Default state
        }

        this.recalculateState(); // Recalculate level on load
        console.log(`Loaded state: Count = ${this.diddy.count}, Level = ${this.diddy.level}`);
    }

    incrementTap() {
        this.diddy.count += 1;
        this.recalculateState();
        console.log("Updated state:", this.diddy);
        this.save(); // Save the new state
    }

    async createClickTransaction() {
        let newtx = await this.app.wallet.createUnsignedTransactionWithDefaultFee();
        newtx.msg = {
            module: this.name,
            request: "click",
        };
        await newtx.sign();
        return newtx;
    }

    async onConfirmation(blk, tx, conf) {
        let diddy_mod = this.app.modules.returnModule(this.name);
        let txmsg = tx.returnMessage();

        if (conf == 0) {
            if (txmsg.module === this.name) {
                if (txmsg.request === 'click') {
                    this.receiveClickTransaction(tx);
                    try {
                        let publickey = tx.from[0].publicKey;
                        diddy_mod.addOrUpdateRecords(publickey);
                    } catch (err) {
                        console.log("Database Issues: " + JSON.stringify(err));
                    }
                }
            }
        }
    }

    receiveClickTransaction(tx) {
        console.log("# Received Click Transaction:", tx.returnMessage());
    }

    async addOrUpdateRecords(publickey = '', count = 0) {
        let sql, params, res;

        // Insert if the record doesn't exist
        sql = `INSERT OR IGNORE INTO records (publickey) VALUES ($publickey)`;
        params = { $publickey: publickey };
        res = await this.app.storage.runDatabase(sql, params, 'diddy');

        // Then update
        sql = `UPDATE records SET count = count + 1 WHERE publickey LIKE BINARY "$publickey"`;
        params = { $publickey: publickey };
        res = await this.app.storage.runDatabase(sql, params, 'diddy');
    }
}

module.exports = Diddy;
