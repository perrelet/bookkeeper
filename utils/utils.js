class Utils {

    static toSnakeCase(str) {

        return str
            .replace(/\s+/g, '_')    // Replace spaces with underscores
            .replace(/-+/g, '_')     // Replace dashes with underscores
            .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters except underscore
            .replace(/__+/g, '_')    // Remove double underscores
            .replace(/^_+|_+$/g, '') // Trim leading/trailing underscores
            .toLowerCase();

    }

}