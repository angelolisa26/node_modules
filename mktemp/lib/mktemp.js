var fs = require('fs'),
    randomstring = require('./randomstring');


/**
 * create unique name file.
 *
 * @param {String} template template string for filename.
 * @param {Function} callback callback function.
 * @throws {TypeError} cannot use Promise and callback function is not found.
 * @return {Promise} Promise.
 */
function createFile(template, callback) {
  var filename = randomstring.generate(template);

  // callback is not a Function
  if (typeof callback !== 'function') {
    // can use Promise
    if (typeof Promise === 'function') {
      // return Promise
      return new Promise(function(resolve, reject) {
        createFile(template, function(err, filename) {
          (err) ? reject(err) : resolve(filename);
        });
      });
    } else {
      // throw TypeError when cannot use Promise
      throw new TypeError('callback function required');
    }
  }

  fs.open(filename, 'ax+', 384 /*=0600*/, function(err, fd) {
    if (err) {
      if (err.code === 'EEXIST') {
        // FIXME: infinite loop
        setImmediate(function(tmpl, cb) {
          createFile(tmpl, cb);
        }, template, callback);

        return;
      }

      // filename set to null if throws error
      filename = null;
    }

    if (fd) {
      fs.close(fd, function(err) {
        callback(err, filename);
      });
    } else {
      callback(err, filename);
    }
  });
}


/**
 * sync version createFile.
 *
 * @param {String} template template string for filename.
 * @throws {Error} error of fs.openSync or fs.closeSync.
 * @return {String} created filename.
 */
function createFileSync(template) {
  var isExist, filename, fd;

  // FIXME: infinite loop
  do {
    isExist = false;
    filename = randomstring.generate(template);
    try {
      fd = fs.openSync(filename, 'ax+', 384 /*=0600*/);
    } catch (e) {
      if (e.code === 'EEXIST') {
        isExist = true;
      } else {
        throw e;
      }
    } finally {
      fd && fs.closeSync(fd);
    }
  } while (isExist);

  return filename;
}


/**
 * create unique name dir.
 *
 * @param {String} template template string for dirname.
 * @param {Function} callback callback function.
 * @throws {TypeError} cannot use Promise and callback function is not found.
 * @return {Promise} Promise.
 */
function createDir(template, callback) {
  var dirname = randomstring.generate(template);

  // callback is not a Function
  if (typeof callback !== 'function') {
    // can use Promise
    if (typeof Promise === 'function') {
      // return Promise
      return new Promise(function(resolve, reject) {
        createDir(template, function(err, dirname) {
          (err) ? reject(err) : resolve(dirname);
        });
      });
    } else {
      // throw TypeError when cannot use Promise
      throw new TypeError('callback function required');
    }
  }

  fs.mkdir(dirname, 448 /*=0700*/, function(err) {
    if (err) {
      if (err.code === 'EEXIST') {
        // FIXME: infinite loop
        setImmediate(function(tmpl, cb) {
          createDir(tmpl, cb);
        }, template, callback);

        return;
      }

      // dirname set to null if throws error
      dirname = null;
    }

    callback(err, dirname);
  });
}


/**
 * sync version createDir.
 *
 * @param {String} template template string for dirname.
 * @return {String} created dirname.
 */
function createDirSync(template) {
  var isExist, dirname;

  // FIXME: infinite loop
  do {
    isExist = false;
    dirname = randomstring.generate(template);
    try {
      fs.mkdirSync(dirname, 448 /*=0700*/);
    } catch (e) {
      if (e.code === 'EEXIST') {
        isExist = true;
      } else {
        throw e;
      }
    }
  } while (isExist);

  return dirname;
}


/**
 * export.
 */
module.exports = {
  createFile: createFile,
  createFileSync: createFileSync,
  createDir: createDir,
  createDirSync: createDirSync
};
