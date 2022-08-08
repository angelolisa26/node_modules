/* jshint node: true */

'use strict';

/**
* Copyright 2015, Yahoo! Inc.
* Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
*/
var CachingWriter = require('broccoli-caching-writer');
var extractor = require('formatjs-extract-cldr-data');
var serialize = require('serialize-javascript');
var mkdirp = require('mkdirp');
var assert = require('assert');
var path = require('path');
var fs = require('fs');

require('./object-assign-polyfill');

Plugin.prototype = Object.create(CachingWriter.prototype);
Plugin.prototype.constructor = Plugin;

function Plugin(inputNodes, options) {
  if (!(this instanceof Plugin)) {
    return new Plugin(inputNodes, options);
  }

  if (!Array.isArray(inputNodes)) {
    inputNodes = [inputNodes];
  }

  this.options = Object.assign({
    // formatjs-extract-cldr-data options
    locales: null,
    pluralRules: true,
    relativeFields: false,

    // plugin options
    destDir: '',
    prelude: '',
    moduleType: 'es6'
  }, options);

  CachingWriter.call(this, inputNodes, {
    annotation: this.options.annotation
  });

  if (Array.isArray(this.options.locales)) {
    this.options.locales = this.options.locales.map(function(localeName) {
      return this.normalizeLocale(localeName);
    }, this);
  }
}

Plugin.prototype.normalizeLocale = function(locale) {
  assert(typeof locale === 'string', 'Locale ' + locale + ' was provided, but a string was expected.');

  if (typeof locale === 'string') {
    return locale.trim().replace(/_/g, '-');
  }

  return locale;
}

Plugin.prototype.writeFileSync = function(groupedByLanguage) {
  var options = this.options;
  var outputPath = path.join(this.outputPath, options.destDir);

  mkdirp.sync(outputPath);

  for (var language in groupedByLanguage) {
    var prefix = options.moduleType.toLowerCase() === 'es6' ? 'export default' : 'module.exports =';
    var languageData = prefix + ' ' + serialize(groupedByLanguage[language]) + ';';

    fs.writeFileSync(
      path.join(outputPath, language.toLowerCase() + '.js'),
      options.prelude.concat(languageData),
      { encoding: 'utf8' }
    );
  }
}

Plugin.prototype.build = function() {
  var data = extractor({
    locales: this.options.locales,
    pluralRules: this.options.pluralRules,
    relativeFields: this.options.relativeFields
  });

  var groupedByLanguage = Object.keys(data).reduce(function(ret, locale) {
    var lang = locale.split('-')[0];
    var langData = ret[lang] || [];
    ret[lang] = langData.concat(data[locale]);

    return ret;
  }, Object.create(null));

  return this.writeFileSync(groupedByLanguage);
}

module.exports = Plugin;
