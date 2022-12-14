'use strict';

var path = require('path');
var fs = require('fs');

function Plugin(name, ext, options) {
  this.name = name;
  this.ext = ext;
  this.options = options || {};
  this.registry = this.options.registry;
  this.applicationName = this.options.applicationName;

  if (this.options.toTree) {
    this.toTree = this.options.toTree;
  }
}

Plugin.prototype.toTree = function() {
  throw new Error('A Plugin must implement the `toTree` method.');
};

Plugin.prototype.getExt = function(inputTreeRoot, inputPath, filename) {
  if(Array.isArray(this.ext)) {
    var detect = require('ember-cli-lodash-subset').find;
    return detect(this.ext, function(ext) {
      var filenameAndExt = filename + '.' + ext;
      return fs.existsSync(path.join(inputTreeRoot, inputPath, filenameAndExt));
    });
  } else {
    return this.ext;
  }
};

module.exports = Plugin;
