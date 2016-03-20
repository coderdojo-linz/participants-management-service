exports.TS_SOURCES = [
    "typings/main.d.ts",
    "src/**/*.ts"
];
exports.APP_DIST = ".";
exports.CLEAN_JS = [
    "**/*.js.map",
    "**/*.js",
    "!node_modules/**/*.js",
    "!Gulpfile.js",
    "!build/**/*.js"
];