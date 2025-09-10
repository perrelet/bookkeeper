class Props {

    constructor (scope = PropertiesService.getScriptProperties()) {
        this.scope = scope;
    }

    set (key, value) {
        this.scope.setProperty(key, value);
        return this;
    }

    get (key) {
        return this.scope.getProperty(key);
    }

    delete (key) {
        this.scope.deleteProperty(key);
        return this;
    }

    reset () {
        this.scope.deleteAllProperties();
        return this;
    }

    setMany (obj) {
        this.scope.setProperties(obj);
        return this;
    }

    getAll () {
        return this.scope.getProperties();
    }

}