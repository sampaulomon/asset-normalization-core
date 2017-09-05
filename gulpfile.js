'use strict';

const gulp              = require('gulp');
const argv              = require('yargs').argv;
const imageResize       = require('gulp-image-resize');
const shell             = require('gulp-shell');
const rimraf            = require('rimraf');
const _                 = require('lodash');
const path              = require('path');
const rename            = require('gulp-rename');
const fs                = require('fs');
const mkdirp            = require('mkdirp');

const PLATFORMS         = {
    ANDROID:                'android',
    IOS:                    'ios'
};

const PATHS             = require('./config/paths.json');
const CONFIG            = getConfig();

function getConfig() {
    return _.reduce(PLATFORMS, (memo, platform) => {
        memo[platform] = require(`./config/${platform}.json`);

        return memo;
    }, {});
}

function promisify(stream) {
    return new Promise((resolve, reject) => {
        stream()
            .on('end', resolve)
            .on('error', reject)
    });
}

function joinStreams(tasks, key, callback) {
    let promise = key ?
        promisify(tasks[key]) :
        Promise.all(_.map(tasks, promisify));

    promise
        .then(() => callback())
        .catch((e) => console.error(e));
}

function convertRasterImages({ src, dest, sizes, renameAsset }) {
    let stream = gulp.src(src);
    let promises = sizes.map((size) => {
        let sizeSpecificStream = stream
            .pipe(imageResize({
                percentage:     size.percentage,
                imageMagick:    true
            }))
            .pipe(rename(renameAsset.bind(null, size)))
            .pipe(gulp.dest(dest));

        return promisify(() => sizeSpecificStream);
    });

    return Promise.all(promises);
}

function promisifyAsyncAction(action, ...args) {
    return new Promise((resolve) => action(...args, resolve));
}

function writeToFile(dest, obj) {
    return promisifyAsyncAction(_.bind(fs.exists, fs), path.dirname(dest))
        .then((exists) =>
            exists ?
                Promise.resolve() :
                new Promise((resolve) => mkdirp(path.dirname(dest), resolve))
        )
        .then((res) =>
            promisifyAsyncAction(_.bind(fs.writeFile, fs), dest, JSON.stringify(obj, null, 4))
        );
}

function getDestPath(platform) {
    return path.join(PATHS.tmp, platform, CONFIG[platform].root);
}

function getTempVectorPath (platform) {
    return path.join(PATHS.tmp, platform, 'vector');
}

function addContents(contentsMap, folderName, fileName, scale) {
    if (!contentsMap[folderName]) {
        contentsMap[folderName] = {
            images: [],
            info:   CONFIG[PLATFORMS.IOS].contents.info
        };
    }

    contentsMap[folderName].images.push({
        idiom:      'universal',
        filename:   fileName,
        scale:      scale
    })
}

function writeContents(contentsMap) {
    return Promise.all(
        _.map(contentsMap, (contents, dirPath) => writeToFile(
            path.join(dirPath, CONFIG[PLATFORMS.IOS].contentsFileName),
            contents
        ))
    );
}

function renameIosAsset(contentsMap, size, file) {
    file.dirname = path.join(file.dirname, [ file.basename, CONFIG[PLATFORMS.IOS].imageSetSuffix ].join(''));
    file.basename += size.suffix;

    addContents(
        contentsMap,
        path.join(getDestPath(PLATFORMS.IOS), file.dirname),
        file.basename + file.extname,
        size.scale
    );
}

gulp.task('clean', (callback) => {
    let p = _.compact([PATHS.tmp, argv.platform || '']).join('/');

    rimraf(p, callback);
});

gulp.task('images:android:raster', () => {
    return convertRasterImages({
        src:            `${ PATHS.src.raster }/**/*.*`,
        dest:           getDestPath(PLATFORMS.ANDROID),
        sizes:          CONFIG[PLATFORMS.ANDROID].sizes,
        renameAsset:    (size, file) => {
            let base = path.parse(file.dirname).base;
            let flavor = base === '.' ? CONFIG[PLATFORMS.ANDROID].defaultFlavor : base;
            file.dirname = path.join(flavor, size.path);
        }
    });
});

gulp.task('images:android:vector',
    shell.task(
        `
            mono svg2vd/svg2vd.exe \
                -i ${ PATHS.src.vector }/\\*.svg \
                -o ${ PATHS.tmp }/android/${ CONFIG[PLATFORMS.ANDROID].vectorRoot }
        `, { quiet: !argv.debug }
    )
);

gulp.task('images:android', [ 'images:android:raster', 'images:android:vector' ]);


gulp.task('images:ios:root-contents', () => {
    return writeToFile(
        path.join(getDestPath(PLATFORMS.IOS), CONFIG[PLATFORMS.IOS].contentsFileName),
        CONFIG[PLATFORMS.IOS].contents
    )
});

gulp.task('images:ios:vector:convert', [ 'images:ios:root-contents' ],
    shell.task(
        `
            bash ./svg2pdf.sh \
                -i ${ PATHS.src.vector } \
                -o ${ getTempVectorPath(PLATFORMS.IOS) }
        `, { quiet: !argv.debug }
    )
);

gulp.task('images:ios:vector', [ 'images:ios:vector:convert' ], () => {
    const TEMP_VECTOR_PATH  = getTempVectorPath(PLATFORMS.IOS);
    let contentsMap         = {};

    return promisify(() =>
        gulp.src(`${ TEMP_VECTOR_PATH }/**/*.*`)
            .pipe(rename(renameIosAsset.bind(null, contentsMap, { suffix: '' })))
            .pipe(gulp.dest(getDestPath(PLATFORMS.IOS)))
    )
        .then(writeContents.bind(null, contentsMap))
        .then(() => new Promise((resolve) => rimraf(TEMP_VECTOR_PATH, resolve)));
});

gulp.task('images:ios:raster', [ 'images:ios:root-contents' ], () => {
    let contentsMap = {};

    return convertRasterImages({
        src:            `${ PATHS.src.raster }/**/*.*`,
        dest:           getDestPath(PLATFORMS.IOS),
        sizes:          CONFIG[PLATFORMS.IOS].sizes,
        renameAsset:    renameIosAsset.bind(null, contentsMap)
    })
        .then(writeContents.bind(null, contentsMap));
});

gulp.task('images:ios', [ 'images:ios:vector', 'images:ios:raster' ]);

gulp.task('raster', (callback) => {
    joinStreams({
        ios:     () => gulp.start('images:ios:raster'),
        android: () => gulp.start('images:android:raster')
    }, argv.platform, callback);
});

gulp.task('vector', (callback) => {
    joinStreams({
        ios:     () => gulp.start('images:ios:vector'),
        android: () => gulp.start('images:android:vector')
    }, argv.platform, callback);
});

gulp.task('images', (callback) => {
    joinStreams({
        ios:     () => gulp.start('images:ios'),
        android: () => gulp.start('images:android')
    }, argv.platform, callback);
});

gulp.task('default', ['clean'], () => gulp.start('images'));
