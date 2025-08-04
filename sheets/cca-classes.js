class CCAClasses extends withHeadedSheet(class {}) {

    constructor(sheetName = `CCA Classes`) {

        super(sheetName);
        this.setSheet(sheetName);

    }

    getClass(ccaClass) {

        if (!this.data) {

            this.data     = this.getData();
            this._classes = {};

            for (const row of this.data) this._classes[row.class] = row;

        }

        return (ccaClass in this._classes) ? this._classes[ccaClass] : false;

    }

}