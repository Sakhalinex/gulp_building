const { src, dest, parallel, series, watch } = require('gulp'),
      sass = require('gulp-sass')(require('sass'))
      notify = require('gulp-notify'),
      sourcemaps = require('gulp-sourcemaps'),
      rename = require('gulp-rename'),
      autoprefixer = require('gulp-autoprefixer'),
      cleanCSS = require('gulp-clean-css'),
      browserSync = require('browser-sync').create(),
      fileinclude = require('gulp-file-include'),
      svgSprite = require('gulp-svg-sprite'),
      ttf2woff = require('gulp-ttf2woff'),
      ttf2woff2 = require('gulp-ttf2woff2'),
      fs = require('fs'),
      del = require('del'),
      webpack = require('webpack'),
      uglify = require('gulp-uglify-es').default,
      webpackStream = require('webpack-stream'),
      tinypng = require('gulp-tinypng-compress'),
	  gutil = require('gulp-util'),
	  ftp = require('vinyl-ftp');

const styles = () => {
	return src('./src/scss/**/*.scss')
		.pipe(sourcemaps.init())
		.pipe(sass({
			outputStyle: 'expanded'
		}).on('error', notify.onError()))
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(autoprefixer({
			cascade: false,
		}))
		.pipe(cleanCSS({
			level: 2
		}))
		.pipe(sourcemaps.write('.'))
		.pipe(dest('./app/css/'))
		.pipe(browserSync.stream());
}

const htmlInclude = () => {
    return src(['./src/index.html'])
		.pipe(fileinclude({
			prefix: '@',
			basepath: '@file'
		}))
		.pipe(dest('./app'))
		.pipe(browserSync.stream());
}

const imgToApp = () => {
    return src(['./src/img/**.{jpg, jpeg, png, gif, webp}'])
        .pipe(dest('./app/img'))
}

const resourcesToApp = () => {
    return src('./src/resources/**')
        .pipe(dest('./app'))
}

const svgToSprite = () => {
    return src('./src/img/svg/**.svg')
    .pipe(svgSprite({
        mode: {
            stack: {
                sprite: '../sprite.svg'
            }
        }
    }))
    .pipe(dest('./app/img'))
}

const fonts = () => {
    src('./src/fonts/**.ttf')
    .pipe(ttf2woff())
    .pipe(dest('./app/fonts'))

    return src('./src/fonts/**.ttf')
    .pipe(ttf2woff2())
    .pipe(dest('./app/fonts'))
}

let srcFonts = './src/scss/_fonts.scss';
let appFonts = './app/fonts/';


const fontsStyle = (done) => {
	let file_content = fs.readFileSync(srcFonts);

	fs.writeFile(srcFonts, '', () => {});
	fs.readdir(appFonts, function (err, items) {
		if (items) {
			let c_fontname;
			for (var i = 0; i < items.length; i++) {
				let fontname = items[i].split('.');
				fontname = fontname[0];
				if (c_fontname != fontname) {
					fs.appendFile(srcFonts, '@include font-face("' + fontname + '", "' + fontname + '", 400, normal);\r\n', () => {});
				}
				c_fontname = fontname;
			}
		}
	})

	done();
}

const clean = () => {
    return del(['app/*'])
}

const scripts = () => {
	return src('./src/js/main.js')
		.pipe(webpackStream({
			mode: 'development',
			output: {
				filename: 'main.js',
			},
			module: {
				rules: [{
					test: /\.m?js$/,
					exclude: /(node_modules|bower_components)/,
					use: {
						loader: 'babel-loader',
						options: {
							presets: ['@babel/preset-env']
						}
					}
				}]
			},
		}))
		.on('error', function (err) {
			console.error('WEBPACK ERROR', err);
			this.emit('end');
		})

		.pipe(sourcemaps.init())
		.pipe(uglify().on("error", notify.onError()))
		.pipe(sourcemaps.write('.'))
		.pipe(dest('./app/js'))
		.pipe(browserSync.stream());
}

const watchFiles = () => {
    browserSync.init({
		server: {
			baseDir: "./app"
		}
	})

    watch('./src/scss/**/*.scss', styles)
	watch('./src/index.html', htmlInclude)
    watch(['./src/img/**.{jpg, jpeg, png, gif, webp}'], imgToApp)
    watch('./src/img/**.svg', svgToSprite)
    watch('./src/resources/', resourcesToApp)
    watch('./src/fonts/**.ttf', fonts)
    watch('./src/fonts/**.ttf', fontsStyle)
    watch('./src/js/**/*.js', scripts)
}

exports.styles = styles
exports.watchFiles = watchFiles
exports.fileinclude = htmlInclude

exports.default = series(clean, parallel(htmlInclude, scripts, fonts, resourcesToApp, imgToApp, svgToSprite), fontsStyle, styles, watchFiles)

const tiny = () => {
    return src(['./src/img/**.{jpg, jpeg, png, gif, webp}'])
        .pipe(tinypng({
            key: 'zWbNdyDlxgBGtsG4w8FwzyJrjPjsNj46',
			parallel: true,
			parallelMax: 50
        }))
        .pipe(dest('./app/img/'))
}

const stylesBuild = () => {
	return src('./src/scss/**/*.scss')
		.pipe(sass({
			outputStyle: 'expanded'
		}).on('error', notify.onError()))
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(autoprefixer({
			cascade: false,
		}))
		.pipe(cleanCSS({
			level: 2
		}))
		.pipe(dest('./app/css/'))
}

const scriptsBuild = () => {
	return src('./src/js/main.js')
		.pipe(webpackStream({
			mode: 'development',
			output: {
				filename: 'main.js',
			},
			module: {
				rules: [{
					test: /\.m?js$/,
					exclude: /(node_modules|bower_components)/,
					use: {
						loader: 'babel-loader',
						options: {
							presets: ['@babel/preset-env']
						}
					}
				}]
			},
		}))
		.on('error', function (err) {
			console.error('WEBPACK ERROR', err);
			this.emit('end');
		})

		.pipe(uglify().on("error", notify.onError()))
		.pipe(dest('./app/js'))
}

exports.build = series(clean, parallel(htmlInclude, scriptsBuild, fonts, resourcesToApp, imgToApp, svgToSprite), fontsStyle, stylesBuild, tiny)


// Deploy

const deploy = () => {
	let conn = ftp.create({
		host: '',
		user: '',
		password: '',
		parallel: 10,
		log: gutil.log
	});

	let globs = [
		'app/**',
	];

	return src(globs, {
			base: './app',
			buffer: false
		})
		.pipe(conn.newer(''))
		.pipe(conn.dest(''));
}

exports.deploy = deploy;