var gulp = require('gulp');
var del = require('del');
var ts = require('gulp-typescript');
var config = require('./build/config');

// Create TypeScript project from tsconfig.json
var tsClientProject = ts.createProject("tsconfig.json", {
    typescript: require("typescript")
});

// Cleanup by deleting target directory
gulp.task("clean", () => {
    del.sync(config.CLEAN_JS);
});

// Compile Typescript files
gulp.task("app", [], () => {
    var tsResult = gulp.src(config.TS_SOURCES)
        .pipe(ts(tsClientProject))
        .pipe(gulp.dest(config.APP_DIST));
});

gulp.task("default", ["clean", "app"], () => { });
