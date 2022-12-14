(function() {
    "use strict";
    var $$utils$$hop = Object.prototype.hasOwnProperty;

    function $$utils$$extend(obj) {
        var sources = Array.prototype.slice.call(arguments, 1),
            i, len, source, key;

        for (i = 0, len = sources.length; i < len; i += 1) {
            source = sources[i];
            if (!source) { continue; }

            for (key in source) {
                if ($$utils$$hop.call(source, key)) {
                    obj[key] = source[key];
                }
            }
        }

        return obj;
    }

    // Purposely using the same implementation as the Intl.js `Intl` polyfill.
    // Copyright 2013 Andy Earnshaw, MIT License

    var $$es51$$realDefineProp = (function () {
        try { return !!Object.defineProperty({}, 'a', {}); }
        catch (e) { return false; }
    })();

    var $$es51$$es3 = !$$es51$$realDefineProp && !Object.prototype.__defineGetter__;

    var $$es51$$defineProperty = $$es51$$realDefineProp ? Object.defineProperty :
            function (obj, name, desc) {

        if ('get' in desc && obj.__defineGetter__) {
            obj.__defineGetter__(name, desc.get);
        } else if (!$$utils$$hop.call(obj, name) || 'value' in desc) {
            obj[name] = desc.value;
        }
    };

    var $$es51$$objCreate = Object.create || function (proto, props) {
        var obj, k;

        function F() {}
        F.prototype = proto;
        obj = new F();

        for (k in props) {
            if ($$utils$$hop.call(props, k)) {
                $$es51$$defineProperty(obj, k, props[k]);
            }
        }

        return obj;
    };
    var $$compiler$$default = $$compiler$$Compiler;

    function $$compiler$$Compiler(locales, formats, pluralFn) {
        this.locales  = locales;
        this.formats  = formats;
        this.pluralFn = pluralFn;
    }

    $$compiler$$Compiler.prototype.compile = function (ast) {
        this.pluralStack        = [];
        this.currentPlural      = null;
        this.pluralNumberFormat = null;

        return this.compileMessage(ast);
    };

    $$compiler$$Compiler.prototype.compileMessage = function (ast) {
        if (!(ast && ast.type === 'messageFormatPattern')) {
            throw new Error('Message AST is not of type: "messageFormatPattern"');
        }

        var elements = ast.elements,
            pattern  = [];

        var i, len, element;

        for (i = 0, len = elements.length; i < len; i += 1) {
            element = elements[i];

            switch (element.type) {
                case 'messageTextElement':
                    pattern.push(this.compileMessageText(element));
                    break;

                case 'argumentElement':
                    pattern.push(this.compileArgument(element));
                    break;

                default:
                    throw new Error('Message element does not have a valid type');
            }
        }

        return pattern;
    };

    $$compiler$$Compiler.prototype.compileMessageText = function (element) {
        // When this `element` is part of plural sub-pattern and its value contains
        // an unescaped '#', use a `PluralOffsetString` helper to properly output
        // the number with the correct offset in the string.
        if (this.currentPlural && /(^|[^\\])#/g.test(element.value)) {
            // Create a cache a NumberFormat instance that can be reused for any
            // PluralOffsetString instance in this message.
            if (!this.pluralNumberFormat) {
                this.pluralNumberFormat = new Intl.NumberFormat(this.locales);
            }

            return new $$compiler$$PluralOffsetString(
                    this.currentPlural.id,
                    this.currentPlural.format.offset,
                    this.pluralNumberFormat,
                    element.value);
        }

        // Unescape the escaped '#'s in the message text.
        return element.value.replace(/\\#/g, '#');
    };

    $$compiler$$Compiler.prototype.compileArgument = function (element) {
        var format = element.format;

        if (!format) {
            return new $$compiler$$StringFormat(element.id);
        }

        var formats  = this.formats,
            locales  = this.locales,
            pluralFn = this.pluralFn,
            options;

        switch (format.type) {
            case 'numberFormat':
                options = formats.number[format.style];
                return {
                    id    : element.id,
                    format: new Intl.NumberFormat(locales, options).format
                };

            case 'dateFormat':
                options = formats.date[format.style];
                return {
                    id    : element.id,
                    format: new Intl.DateTimeFormat(locales, options).format
                };

            case 'timeFormat':
                options = formats.time[format.style];
                return {
                    id    : element.id,
                    format: new Intl.DateTimeFormat(locales, options).format
                };

            case 'pluralFormat':
                options = this.compileOptions(element);
                return new $$compiler$$PluralFormat(
                    element.id, format.ordinal, format.offset, options, pluralFn
                );

            case 'selectFormat':
                options = this.compileOptions(element);
                return new $$compiler$$SelectFormat(element.id, options);

            default:
                throw new Error('Message element does not have a valid format type');
        }
    };

    $$compiler$$Compiler.prototype.compileOptions = function (element) {
        var format      = element.format,
            options     = format.options,
            optionsHash = {};

        // Save the current plural element, if any, then set it to a new value when
        // compiling the options sub-patterns. This conforms the spec's algorithm
        // for handling `"#"` syntax in message text.
        this.pluralStack.push(this.currentPlural);
        this.currentPlural = format.type === 'pluralFormat' ? element : null;

        var i, len, option;

        for (i = 0, len = options.length; i < len; i += 1) {
            option = options[i];

            // Compile the sub-pattern and save it under the options's selector.
            optionsHash[option.selector] = this.compileMessage(option.value);
        }

        // Pop the plural stack to put back the original current plural value.
        this.currentPlural = this.pluralStack.pop();

        return optionsHash;
    };

    // -- Compiler Helper Classes --------------------------------------------------

    function $$compiler$$StringFormat(id) {
        this.id = id;
    }

    $$compiler$$StringFormat.prototype.format = function (value) {
        if (!value) {
            return '';
        }

        return typeof value === 'string' ? value : String(value);
    };

    function $$compiler$$PluralFormat(id, useOrdinal, offset, options, pluralFn) {
        this.id         = id;
        this.useOrdinal = useOrdinal;
        this.offset     = offset;
        this.options    = options;
        this.pluralFn   = pluralFn;
    }

    $$compiler$$PluralFormat.prototype.getOption = function (value) {
        var options = this.options;

        var option = options['=' + value] ||
                options[this.pluralFn(value - this.offset, this.useOrdinal)];

        return option || options.other;
    };

    function $$compiler$$PluralOffsetString(id, offset, numberFormat, string) {
        this.id           = id;
        this.offset       = offset;
        this.numberFormat = numberFormat;
        this.string       = string;
    }

    $$compiler$$PluralOffsetString.prototype.format = function (value) {
        var number = this.numberFormat.format(value - this.offset);

        return this.string
                .replace(/(^|[^\\])#/g, '$1' + number)
                .replace(/\\#/g, '#');
    };

    function $$compiler$$SelectFormat(id, options) {
        this.id      = id;
        this.options = options;
    }

    $$compiler$$SelectFormat.prototype.getOption = function (value) {
        var options = this.options;
        return options[value] || options.other;
    };

    var intl$messageformat$parser$$default = (function() {
      /*
       * Generated by PEG.js 0.8.0.
       *
       * http://pegjs.majda.cz/
       */

      function peg$subclass(child, parent) {
        function ctor() { this.constructor = child; }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
      }

      function SyntaxError(message, expected, found, offset, line, column) {
        this.message  = message;
        this.expected = expected;
        this.found    = found;
        this.offset   = offset;
        this.line     = line;
        this.column   = column;

        this.name     = "SyntaxError";
      }

      peg$subclass(SyntaxError, Error);

      function parse(input) {
        var options = arguments.length > 1 ? arguments[1] : {},

            peg$FAILED = {},

            peg$startRuleFunctions = { start: peg$parsestart },
            peg$startRuleFunction  = peg$parsestart,

            peg$c0 = [],
            peg$c1 = function(elements) {
                    return {
                        type    : 'messageFormatPattern',
                        elements: elements
                    };
                },
            peg$c2 = peg$FAILED,
            peg$c3 = function(text) {
                    var string = '',
                        i, j, outerLen, inner, innerLen;

                    for (i = 0, outerLen = text.length; i < outerLen; i += 1) {
                        inner = text[i];

                        for (j = 0, innerLen = inner.length; j < innerLen; j += 1) {
                            string += inner[j];
                        }
                    }

                    return string;
                },
            peg$c4 = function(messageText) {
                    return {
                        type : 'messageTextElement',
                        value: messageText
                    };
                },
            peg$c5 = /^[^ \t\n\r,.+={}#]/,
            peg$c6 = { type: "class", value: "[^ \\t\\n\\r,.+={}#]", description: "[^ \\t\\n\\r,.+={}#]" },
            peg$c7 = "{",
            peg$c8 = { type: "literal", value: "{", description: "\"{\"" },
            peg$c9 = null,
            peg$c10 = ",",
            peg$c11 = { type: "literal", value: ",", description: "\",\"" },
            peg$c12 = "}",
            peg$c13 = { type: "literal", value: "}", description: "\"}\"" },
            peg$c14 = function(id, format) {
                    return {
                        type  : 'argumentElement',
                        id    : id,
                        format: format && format[2]
                    };
                },
            peg$c15 = "number",
            peg$c16 = { type: "literal", value: "number", description: "\"number\"" },
            peg$c17 = "date",
            peg$c18 = { type: "literal", value: "date", description: "\"date\"" },
            peg$c19 = "time",
            peg$c20 = { type: "literal", value: "time", description: "\"time\"" },
            peg$c21 = function(type, style) {
                    return {
                        type : type + 'Format',
                        style: style && style[2]
                    };
                },
            peg$c22 = "plural",
            peg$c23 = { type: "literal", value: "plural", description: "\"plural\"" },
            peg$c24 = function(pluralStyle) {
                    return {
                        type   : pluralStyle.type,
                        ordinal: false,
                        offset : pluralStyle.offset || 0,
                        options: pluralStyle.options
                    };
                },
            peg$c25 = "selectordinal",
            peg$c26 = { type: "literal", value: "selectordinal", description: "\"selectordinal\"" },
            peg$c27 = function(pluralStyle) {
                    return {
                        type   : pluralStyle.type,
                        ordinal: true,
                        offset : pluralStyle.offset || 0,
                        options: pluralStyle.options
                    }
                },
            peg$c28 = "select",
            peg$c29 = { type: "literal", value: "select", description: "\"select\"" },
            peg$c30 = function(options) {
                    return {
                        type   : 'selectFormat',
                        options: options
                    };
                },
            peg$c31 = "=",
            peg$c32 = { type: "literal", value: "=", description: "\"=\"" },
            peg$c33 = function(selector, pattern) {
                    return {
                        type    : 'optionalFormatPattern',
                        selector: selector,
                        value   : pattern
                    };
                },
            peg$c34 = "offset:",
            peg$c35 = { type: "literal", value: "offset:", description: "\"offset:\"" },
            peg$c36 = function(number) {
                    return number;
                },
            peg$c37 = function(offset, options) {
                    return {
                        type   : 'pluralFormat',
                        offset : offset,
                        options: options
                    };
                },
            peg$c38 = { type: "other", description: "whitespace" },
            peg$c39 = /^[ \t\n\r]/,
            peg$c40 = { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" },
            peg$c41 = { type: "other", description: "optionalWhitespace" },
            peg$c42 = /^[0-9]/,
            peg$c43 = { type: "class", value: "[0-9]", description: "[0-9]" },
            peg$c44 = /^[0-9a-f]/i,
            peg$c45 = { type: "class", value: "[0-9a-f]i", description: "[0-9a-f]i" },
            peg$c46 = "0",
            peg$c47 = { type: "literal", value: "0", description: "\"0\"" },
            peg$c48 = /^[1-9]/,
            peg$c49 = { type: "class", value: "[1-9]", description: "[1-9]" },
            peg$c50 = function(digits) {
                return parseInt(digits, 10);
            },
            peg$c51 = /^[^{}\\\0-\x1F \t\n\r]/,
            peg$c52 = { type: "class", value: "[^{}\\\\\\0-\\x1F \\t\\n\\r]", description: "[^{}\\\\\\0-\\x1F \\t\\n\\r]" },
            peg$c53 = "\\\\",
            peg$c54 = { type: "literal", value: "\\\\", description: "\"\\\\\\\\\"" },
            peg$c55 = function() { return '\\'; },
            peg$c56 = "\\#",
            peg$c57 = { type: "literal", value: "\\#", description: "\"\\\\#\"" },
            peg$c58 = function() { return '\\#'; },
            peg$c59 = "\\{",
            peg$c60 = { type: "literal", value: "\\{", description: "\"\\\\{\"" },
            peg$c61 = function() { return '\u007B'; },
            peg$c62 = "\\}",
            peg$c63 = { type: "literal", value: "\\}", description: "\"\\\\}\"" },
            peg$c64 = function() { return '\u007D'; },
            peg$c65 = "\\u",
            peg$c66 = { type: "literal", value: "\\u", description: "\"\\\\u\"" },
            peg$c67 = function(digits) {
                    return String.fromCharCode(parseInt(digits, 16));
                },
            peg$c68 = function(chars) { return chars.join(''); },

            peg$currPos          = 0,
            peg$reportedPos      = 0,
            peg$cachedPos        = 0,
            peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
            peg$maxFailPos       = 0,
            peg$maxFailExpected  = [],
            peg$silentFails      = 0,

            peg$result;

        if ("startRule" in options) {
          if (!(options.startRule in peg$startRuleFunctions)) {
            throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
          }

          peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
        }

        function text() {
          return input.substring(peg$reportedPos, peg$currPos);
        }

        function offset() {
          return peg$reportedPos;
        }

        function line() {
          return peg$computePosDetails(peg$reportedPos).line;
        }

        function column() {
          return peg$computePosDetails(peg$reportedPos).column;
        }

        function expected(description) {
          throw peg$buildException(
            null,
            [{ type: "other", description: description }],
            peg$reportedPos
          );
        }

        function error(message) {
          throw peg$buildException(message, null, peg$reportedPos);
        }

        function peg$computePosDetails(pos) {
          function advance(details, startPos, endPos) {
            var p, ch;

            for (p = startPos; p < endPos; p++) {
              ch = input.charAt(p);
              if (ch === "\n") {
                if (!details.seenCR) { details.line++; }
                details.column = 1;
                details.seenCR = false;
              } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
                details.line++;
                details.column = 1;
                details.seenCR = true;
              } else {
                details.column++;
                details.seenCR = false;
              }
            }
          }

          if (peg$cachedPos !== pos) {
            if (peg$cachedPos > pos) {
              peg$cachedPos = 0;
              peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
            }
            advance(peg$cachedPosDetails, peg$cachedPos, pos);
            peg$cachedPos = pos;
          }

          return peg$cachedPosDetails;
        }

        function peg$fail(expected) {
          if (peg$currPos < peg$maxFailPos) { return; }

          if (peg$currPos > peg$maxFailPos) {
            peg$maxFailPos = peg$currPos;
            peg$maxFailExpected = [];
          }

          peg$maxFailExpected.push(expected);
        }

        function peg$buildException(message, expected, pos) {
          function cleanupExpected(expected) {
            var i = 1;

            expected.sort(function(a, b) {
              if (a.description < b.description) {
                return -1;
              } else if (a.description > b.description) {
                return 1;
              } else {
                return 0;
              }
            });

            while (i < expected.length) {
              if (expected[i - 1] === expected[i]) {
                expected.splice(i, 1);
              } else {
                i++;
              }
            }
          }

          function buildMessage(expected, found) {
            function stringEscape(s) {
              function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

              return s
                .replace(/\\/g,   '\\\\')
                .replace(/"/g,    '\\"')
                .replace(/\x08/g, '\\b')
                .replace(/\t/g,   '\\t')
                .replace(/\n/g,   '\\n')
                .replace(/\f/g,   '\\f')
                .replace(/\r/g,   '\\r')
                .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
                .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
                .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
                .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
            }

            var expectedDescs = new Array(expected.length),
                expectedDesc, foundDesc, i;

            for (i = 0; i < expected.length; i++) {
              expectedDescs[i] = expected[i].description;
            }

            expectedDesc = expected.length > 1
              ? expectedDescs.slice(0, -1).join(", ")
                  + " or "
                  + expectedDescs[expected.length - 1]
              : expectedDescs[0];

            foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

            return "Expected " + expectedDesc + " but " + foundDesc + " found.";
          }

          var posDetails = peg$computePosDetails(pos),
              found      = pos < input.length ? input.charAt(pos) : null;

          if (expected !== null) {
            cleanupExpected(expected);
          }

          return new SyntaxError(
            message !== null ? message : buildMessage(expected, found),
            expected,
            found,
            pos,
            posDetails.line,
            posDetails.column
          );
        }

        function peg$parsestart() {
          var s0;

          s0 = peg$parsemessageFormatPattern();

          return s0;
        }

        function peg$parsemessageFormatPattern() {
          var s0, s1, s2;

          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parsemessageFormatElement();
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parsemessageFormatElement();
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c1(s1);
          }
          s0 = s1;

          return s0;
        }

        function peg$parsemessageFormatElement() {
          var s0;

          s0 = peg$parsemessageTextElement();
          if (s0 === peg$FAILED) {
            s0 = peg$parseargumentElement();
          }

          return s0;
        }

        function peg$parsemessageText() {
          var s0, s1, s2, s3, s4, s5;

          s0 = peg$currPos;
          s1 = [];
          s2 = peg$currPos;
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsechars();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s3 = [s3, s4, s5];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c2;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c2;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              s2 = peg$currPos;
              s3 = peg$parse_();
              if (s3 !== peg$FAILED) {
                s4 = peg$parsechars();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parse_();
                  if (s5 !== peg$FAILED) {
                    s3 = [s3, s4, s5];
                    s2 = s3;
                  } else {
                    peg$currPos = s2;
                    s2 = peg$c2;
                  }
                } else {
                  peg$currPos = s2;
                  s2 = peg$c2;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$c2;
              }
            }
          } else {
            s1 = peg$c2;
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c3(s1);
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsews();
            if (s1 !== peg$FAILED) {
              s1 = input.substring(s0, peg$currPos);
            }
            s0 = s1;
          }

          return s0;
        }

        function peg$parsemessageTextElement() {
          var s0, s1;

          s0 = peg$currPos;
          s1 = peg$parsemessageText();
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c4(s1);
          }
          s0 = s1;

          return s0;
        }

        function peg$parseargument() {
          var s0, s1, s2;

          s0 = peg$parsenumber();
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = [];
            if (peg$c5.test(input.charAt(peg$currPos))) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c6); }
            }
            if (s2 !== peg$FAILED) {
              while (s2 !== peg$FAILED) {
                s1.push(s2);
                if (peg$c5.test(input.charAt(peg$currPos))) {
                  s2 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s2 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c6); }
                }
              }
            } else {
              s1 = peg$c2;
            }
            if (s1 !== peg$FAILED) {
              s1 = input.substring(s0, peg$currPos);
            }
            s0 = s1;
          }

          return s0;
        }

        function peg$parseargumentElement() {
          var s0, s1, s2, s3, s4, s5, s6, s7, s8;

          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 123) {
            s1 = peg$c7;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c8); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              s3 = peg$parseargument();
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_();
                if (s4 !== peg$FAILED) {
                  s5 = peg$currPos;
                  if (input.charCodeAt(peg$currPos) === 44) {
                    s6 = peg$c10;
                    peg$currPos++;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c11); }
                  }
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parse_();
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parseelementFormat();
                      if (s8 !== peg$FAILED) {
                        s6 = [s6, s7, s8];
                        s5 = s6;
                      } else {
                        peg$currPos = s5;
                        s5 = peg$c2;
                      }
                    } else {
                      peg$currPos = s5;
                      s5 = peg$c2;
                    }
                  } else {
                    peg$currPos = s5;
                    s5 = peg$c2;
                  }
                  if (s5 === peg$FAILED) {
                    s5 = peg$c9;
                  }
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parse_();
                    if (s6 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 125) {
                        s7 = peg$c12;
                        peg$currPos++;
                      } else {
                        s7 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c13); }
                      }
                      if (s7 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c14(s3, s5);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c2;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c2;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parseelementFormat() {
          var s0;

          s0 = peg$parsesimpleFormat();
          if (s0 === peg$FAILED) {
            s0 = peg$parsepluralFormat();
            if (s0 === peg$FAILED) {
              s0 = peg$parseselectOrdinalFormat();
              if (s0 === peg$FAILED) {
                s0 = peg$parseselectFormat();
              }
            }
          }

          return s0;
        }

        function peg$parsesimpleFormat() {
          var s0, s1, s2, s3, s4, s5, s6;

          s0 = peg$currPos;
          if (input.substr(peg$currPos, 6) === peg$c15) {
            s1 = peg$c15;
            peg$currPos += 6;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c16); }
          }
          if (s1 === peg$FAILED) {
            if (input.substr(peg$currPos, 4) === peg$c17) {
              s1 = peg$c17;
              peg$currPos += 4;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c18); }
            }
            if (s1 === peg$FAILED) {
              if (input.substr(peg$currPos, 4) === peg$c19) {
                s1 = peg$c19;
                peg$currPos += 4;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c20); }
              }
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              s3 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 44) {
                s4 = peg$c10;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parsechars();
                  if (s6 !== peg$FAILED) {
                    s4 = [s4, s5, s6];
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c2;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$c2;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c2;
              }
              if (s3 === peg$FAILED) {
                s3 = peg$c9;
              }
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c21(s1, s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parsepluralFormat() {
          var s0, s1, s2, s3, s4, s5;

          s0 = peg$currPos;
          if (input.substr(peg$currPos, 6) === peg$c22) {
            s1 = peg$c22;
            peg$currPos += 6;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c23); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s3 = peg$c10;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parsepluralStyle();
                  if (s5 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c24(s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parseselectOrdinalFormat() {
          var s0, s1, s2, s3, s4, s5;

          s0 = peg$currPos;
          if (input.substr(peg$currPos, 13) === peg$c25) {
            s1 = peg$c25;
            peg$currPos += 13;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c26); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s3 = peg$c10;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parsepluralStyle();
                  if (s5 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c27(s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parseselectFormat() {
          var s0, s1, s2, s3, s4, s5, s6;

          s0 = peg$currPos;
          if (input.substr(peg$currPos, 6) === peg$c28) {
            s1 = peg$c28;
            peg$currPos += 6;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c29); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s3 = peg$c10;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_();
                if (s4 !== peg$FAILED) {
                  s5 = [];
                  s6 = peg$parseoptionalFormatPattern();
                  if (s6 !== peg$FAILED) {
                    while (s6 !== peg$FAILED) {
                      s5.push(s6);
                      s6 = peg$parseoptionalFormatPattern();
                    }
                  } else {
                    s5 = peg$c2;
                  }
                  if (s5 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c30(s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parseselector() {
          var s0, s1, s2, s3;

          s0 = peg$currPos;
          s1 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 61) {
            s2 = peg$c31;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c32); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parsenumber();
            if (s3 !== peg$FAILED) {
              s2 = [s2, s3];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$c2;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c2;
          }
          if (s1 !== peg$FAILED) {
            s1 = input.substring(s0, peg$currPos);
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$parsechars();
          }

          return s0;
        }

        function peg$parseoptionalFormatPattern() {
          var s0, s1, s2, s3, s4, s5, s6, s7, s8;

          s0 = peg$currPos;
          s1 = peg$parse_();
          if (s1 !== peg$FAILED) {
            s2 = peg$parseselector();
            if (s2 !== peg$FAILED) {
              s3 = peg$parse_();
              if (s3 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 123) {
                  s4 = peg$c7;
                  peg$currPos++;
                } else {
                  s4 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c8); }
                }
                if (s4 !== peg$FAILED) {
                  s5 = peg$parse_();
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parsemessageFormatPattern();
                    if (s6 !== peg$FAILED) {
                      s7 = peg$parse_();
                      if (s7 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 125) {
                          s8 = peg$c12;
                          peg$currPos++;
                        } else {
                          s8 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c13); }
                        }
                        if (s8 !== peg$FAILED) {
                          peg$reportedPos = s0;
                          s1 = peg$c33(s2, s6);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c2;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c2;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c2;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parseoffset() {
          var s0, s1, s2, s3;

          s0 = peg$currPos;
          if (input.substr(peg$currPos, 7) === peg$c34) {
            s1 = peg$c34;
            peg$currPos += 7;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c35); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              s3 = peg$parsenumber();
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c36(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parsepluralStyle() {
          var s0, s1, s2, s3, s4;

          s0 = peg$currPos;
          s1 = peg$parseoffset();
          if (s1 === peg$FAILED) {
            s1 = peg$c9;
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              s3 = [];
              s4 = peg$parseoptionalFormatPattern();
              if (s4 !== peg$FAILED) {
                while (s4 !== peg$FAILED) {
                  s3.push(s4);
                  s4 = peg$parseoptionalFormatPattern();
                }
              } else {
                s3 = peg$c2;
              }
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c37(s1, s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }

          return s0;
        }

        function peg$parsews() {
          var s0, s1;

          peg$silentFails++;
          s0 = [];
          if (peg$c39.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c40); }
          }
          if (s1 !== peg$FAILED) {
            while (s1 !== peg$FAILED) {
              s0.push(s1);
              if (peg$c39.test(input.charAt(peg$currPos))) {
                s1 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c40); }
              }
            }
          } else {
            s0 = peg$c2;
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c38); }
          }

          return s0;
        }

        function peg$parse_() {
          var s0, s1, s2;

          peg$silentFails++;
          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parsews();
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parsews();
          }
          if (s1 !== peg$FAILED) {
            s1 = input.substring(s0, peg$currPos);
          }
          s0 = s1;
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c41); }
          }

          return s0;
        }

        function peg$parsedigit() {
          var s0;

          if (peg$c42.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c43); }
          }

          return s0;
        }

        function peg$parsehexDigit() {
          var s0;

          if (peg$c44.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c45); }
          }

          return s0;
        }

        function peg$parsenumber() {
          var s0, s1, s2, s3, s4, s5;

          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 48) {
            s1 = peg$c46;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c47); }
          }
          if (s1 === peg$FAILED) {
            s1 = peg$currPos;
            s2 = peg$currPos;
            if (peg$c48.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c49); }
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parsedigit();
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parsedigit();
              }
              if (s4 !== peg$FAILED) {
                s3 = [s3, s4];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c2;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c2;
            }
            if (s2 !== peg$FAILED) {
              s2 = input.substring(s1, peg$currPos);
            }
            s1 = s2;
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c50(s1);
          }
          s0 = s1;

          return s0;
        }

        function peg$parsechar() {
          var s0, s1, s2, s3, s4, s5, s6, s7;

          if (peg$c51.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c52); }
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c53) {
              s1 = peg$c53;
              peg$currPos += 2;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c54); }
            }
            if (s1 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c55();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 2) === peg$c56) {
                s1 = peg$c56;
                peg$currPos += 2;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c57); }
              }
              if (s1 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c58();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 2) === peg$c59) {
                  s1 = peg$c59;
                  peg$currPos += 2;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c60); }
                }
                if (s1 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c61();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 2) === peg$c62) {
                    s1 = peg$c62;
                    peg$currPos += 2;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c63); }
                  }
                  if (s1 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c64();
                  }
                  s0 = s1;
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 2) === peg$c65) {
                      s1 = peg$c65;
                      peg$currPos += 2;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c66); }
                    }
                    if (s1 !== peg$FAILED) {
                      s2 = peg$currPos;
                      s3 = peg$currPos;
                      s4 = peg$parsehexDigit();
                      if (s4 !== peg$FAILED) {
                        s5 = peg$parsehexDigit();
                        if (s5 !== peg$FAILED) {
                          s6 = peg$parsehexDigit();
                          if (s6 !== peg$FAILED) {
                            s7 = peg$parsehexDigit();
                            if (s7 !== peg$FAILED) {
                              s4 = [s4, s5, s6, s7];
                              s3 = s4;
                            } else {
                              peg$currPos = s3;
                              s3 = peg$c2;
                            }
                          } else {
                            peg$currPos = s3;
                            s3 = peg$c2;
                          }
                        } else {
                          peg$currPos = s3;
                          s3 = peg$c2;
                        }
                      } else {
                        peg$currPos = s3;
                        s3 = peg$c2;
                      }
                      if (s3 !== peg$FAILED) {
                        s3 = input.substring(s2, peg$currPos);
                      }
                      s2 = s3;
                      if (s2 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c67(s2);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c2;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c2;
                    }
                  }
                }
              }
            }
          }

          return s0;
        }

        function peg$parsechars() {
          var s0, s1, s2;

          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parsechar();
          if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              s2 = peg$parsechar();
            }
          } else {
            s1 = peg$c2;
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c68(s1);
          }
          s0 = s1;

          return s0;
        }

        peg$result = peg$startRuleFunction();

        if (peg$result !== peg$FAILED && peg$currPos === input.length) {
          return peg$result;
        } else {
          if (peg$result !== peg$FAILED && peg$currPos < input.length) {
            peg$fail({ type: "end", description: "end of input" });
          }

          throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
        }
      }

      return {
        SyntaxError: SyntaxError,
        parse:       parse
      };
    })();

    var $$core1$$default = $$core1$$MessageFormat;

    // -- MessageFormat --------------------------------------------------------

    function $$core1$$MessageFormat(message, locales, formats) {
        // Parse string messages into an AST.
        var ast = typeof message === 'string' ?
                $$core1$$MessageFormat.__parse(message) : message;

        if (!(ast && ast.type === 'messageFormatPattern')) {
            throw new TypeError('A message must be provided as a String or AST.');
        }

        // Creates a new object with the specified `formats` merged with the default
        // formats.
        formats = this._mergeFormats($$core1$$MessageFormat.formats, formats);

        // Defined first because it's used to build the format pattern.
        $$es51$$defineProperty(this, '_locale',  {value: this._resolveLocale(locales)});

        // Compile the `ast` to a pattern that is highly optimized for repeated
        // `format()` invocations. **Note:** This passes the `locales` set provided
        // to the constructor instead of just the resolved locale.
        var pluralFn = this._findPluralRuleFunction(this._locale);
        var pattern  = this._compilePattern(ast, locales, formats, pluralFn);

        // "Bind" `format()` method to `this` so it can be passed by reference like
        // the other `Intl` APIs.
        var messageFormat = this;
        this.format = function (values) {
            return messageFormat._format(pattern, values);
        };
    }

    // Default format options used as the prototype of the `formats` provided to the
    // constructor. These are used when constructing the internal Intl.NumberFormat
    // and Intl.DateTimeFormat instances.
    $$es51$$defineProperty($$core1$$MessageFormat, 'formats', {
        enumerable: true,

        value: {
            number: {
                'currency': {
                    style: 'currency'
                },

                'percent': {
                    style: 'percent'
                }
            },

            date: {
                'short': {
                    month: 'numeric',
                    day  : 'numeric',
                    year : '2-digit'
                },

                'medium': {
                    month: 'short',
                    day  : 'numeric',
                    year : 'numeric'
                },

                'long': {
                    month: 'long',
                    day  : 'numeric',
                    year : 'numeric'
                },

                'full': {
                    weekday: 'long',
                    month  : 'long',
                    day    : 'numeric',
                    year   : 'numeric'
                }
            },

            time: {
                'short': {
                    hour  : 'numeric',
                    minute: 'numeric'
                },

                'medium':  {
                    hour  : 'numeric',
                    minute: 'numeric',
                    second: 'numeric'
                },

                'long': {
                    hour        : 'numeric',
                    minute      : 'numeric',
                    second      : 'numeric',
                    timeZoneName: 'short'
                },

                'full': {
                    hour        : 'numeric',
                    minute      : 'numeric',
                    second      : 'numeric',
                    timeZoneName: 'short'
                }
            }
        }
    });

    // Define internal private properties for dealing with locale data.
    $$es51$$defineProperty($$core1$$MessageFormat, '__localeData__', {value: $$es51$$objCreate(null)});
    $$es51$$defineProperty($$core1$$MessageFormat, '__addLocaleData', {value: function (data) {
        if (!(data && data.locale)) {
            throw new Error(
                'Locale data provided to IntlMessageFormat is missing a ' +
                '`locale` property'
            );
        }

        $$core1$$MessageFormat.__localeData__[data.locale.toLowerCase()] = data;
    }});

    // Defines `__parse()` static method as an exposed private.
    $$es51$$defineProperty($$core1$$MessageFormat, '__parse', {value: intl$messageformat$parser$$default.parse});

    // Define public `defaultLocale` property which defaults to English, but can be
    // set by the developer.
    $$es51$$defineProperty($$core1$$MessageFormat, 'defaultLocale', {
        enumerable: true,
        writable  : true,
        value     : undefined
    });

    $$core1$$MessageFormat.prototype.resolvedOptions = function () {
        // TODO: Provide anything else?
        return {
            locale: this._locale
        };
    };

    $$core1$$MessageFormat.prototype._compilePattern = function (ast, locales, formats, pluralFn) {
        var compiler = new $$compiler$$default(locales, formats, pluralFn);
        return compiler.compile(ast);
    };

    $$core1$$MessageFormat.prototype._findPluralRuleFunction = function (locale) {
        var localeData = $$core1$$MessageFormat.__localeData__;
        var data       = localeData[locale.toLowerCase()];

        // The locale data is de-duplicated, so we have to traverse the locale's
        // hierarchy until we find a `pluralRuleFunction` to return.
        while (data) {
            if (data.pluralRuleFunction) {
                return data.pluralRuleFunction;
            }

            data = data.parentLocale && localeData[data.parentLocale.toLowerCase()];
        }

        throw new Error(
            'Locale data added to IntlMessageFormat is missing a ' +
            '`pluralRuleFunction` for :' + locale
        );
    };

    $$core1$$MessageFormat.prototype._format = function (pattern, values) {
        var result = '',
            i, len, part, id, value;

        for (i = 0, len = pattern.length; i < len; i += 1) {
            part = pattern[i];

            // Exist early for string parts.
            if (typeof part === 'string') {
                result += part;
                continue;
            }

            id = part.id;

            // Enforce that all required values are provided by the caller.
            if (!(values && $$utils$$hop.call(values, id))) {
                throw new Error('A value must be provided for: ' + id);
            }

            value = values[id];

            // Recursively format plural and select parts' option ??? which can be a
            // nested pattern structure. The choosing of the option to use is
            // abstracted-by and delegated-to the part helper object.
            if (part.options) {
                result += this._format(part.getOption(value), values);
            } else {
                result += part.format(value);
            }
        }

        return result;
    };

    $$core1$$MessageFormat.prototype._mergeFormats = function (defaults, formats) {
        var mergedFormats = {},
            type, mergedType;

        for (type in defaults) {
            if (!$$utils$$hop.call(defaults, type)) { continue; }

            mergedFormats[type] = mergedType = $$es51$$objCreate(defaults[type]);

            if (formats && $$utils$$hop.call(formats, type)) {
                $$utils$$extend(mergedType, formats[type]);
            }
        }

        return mergedFormats;
    };

    $$core1$$MessageFormat.prototype._resolveLocale = function (locales) {
        if (typeof locales === 'string') {
            locales = [locales];
        }

        // Create a copy of the array so we can push on the default locale.
        locales = (locales || []).concat($$core1$$MessageFormat.defaultLocale);

        var localeData = $$core1$$MessageFormat.__localeData__;
        var i, len, localeParts, data;

        // Using the set of locales + the default locale, we look for the first one
        // which that has been registered. When data does not exist for a locale, we
        // traverse its ancestors to find something that's been registered within
        // its hierarchy of locales. Since we lack the proper `parentLocale` data
        // here, we must take a naive approach to traversal.
        for (i = 0, len = locales.length; i < len; i += 1) {
            localeParts = locales[i].toLowerCase().split('-');

            while (localeParts.length) {
                data = localeData[localeParts.join('-')];
                if (data) {
                    // Return the normalized locale string; e.g., we return "en-US",
                    // instead of "en-us".
                    return data.locale;
                }

                localeParts.pop();
            }
        }

        var defaultLocale = locales.pop();
        throw new Error(
            'No locale data has been added to IntlMessageFormat for: ' +
            locales.join(', ') + ', or the default locale: ' + defaultLocale
        );
    };
    var $$en1$$default = {"locale":"en","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1],t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2);if(ord)return n10==1&&n100!=11?"one":n10==2&&n100!=12?"two":n10==3&&n100!=13?"few":"other";return n==1&&v0?"one":"other"}};

    $$core1$$default.__addLocaleData($$en1$$default);
    $$core1$$default.defaultLocale = 'en';

    var intl$messageformat$$default = $$core1$$default;

    var $$diff$$round = Math.round;

    function $$diff$$daysToYears(days) {
        // 400 years have 146097 days (taking into account leap year rules)
        return days * 400 / 146097;
    }

    var $$diff$$default = function (from, to) {
        // Convert to ms timestamps.
        from = +from;
        to   = +to;

        var millisecond = $$diff$$round(to - from),
            second      = $$diff$$round(millisecond / 1000),
            minute      = $$diff$$round(second / 60),
            hour        = $$diff$$round(minute / 60),
            day         = $$diff$$round(hour / 24),
            week        = $$diff$$round(day / 7);

        var rawYears = $$diff$$daysToYears(day),
            month    = $$diff$$round(rawYears * 12),
            year     = $$diff$$round(rawYears);

        return {
            millisecond: millisecond,
            second     : second,
            minute     : minute,
            hour       : hour,
            day        : day,
            week       : week,
            month      : month,
            year       : year
        };
    };

    // Purposely using the same implementation as the Intl.js `Intl` polyfill.
    // Copyright 2013 Andy Earnshaw, MIT License

    var $$es5$$hop = Object.prototype.hasOwnProperty;
    var $$es5$$toString = Object.prototype.toString;

    var $$es5$$realDefineProp = (function () {
        try { return !!Object.defineProperty({}, 'a', {}); }
        catch (e) { return false; }
    })();

    var $$es5$$es3 = !$$es5$$realDefineProp && !Object.prototype.__defineGetter__;

    var $$es5$$defineProperty = $$es5$$realDefineProp ? Object.defineProperty :
            function (obj, name, desc) {

        if ('get' in desc && obj.__defineGetter__) {
            obj.__defineGetter__(name, desc.get);
        } else if (!$$es5$$hop.call(obj, name) || 'value' in desc) {
            obj[name] = desc.value;
        }
    };

    var $$es5$$objCreate = Object.create || function (proto, props) {
        var obj, k;

        function F() {}
        F.prototype = proto;
        obj = new F();

        for (k in props) {
            if ($$es5$$hop.call(props, k)) {
                $$es5$$defineProperty(obj, k, props[k]);
            }
        }

        return obj;
    };

    var $$es5$$arrIndexOf = Array.prototype.indexOf || function (search, fromIndex) {
        /*jshint validthis:true */
        var arr = this;
        if (!arr.length) {
            return -1;
        }

        for (var i = fromIndex || 0, max = arr.length; i < max; i++) {
            if (arr[i] === search) {
                return i;
            }
        }

        return -1;
    };

    var $$es5$$isArray = Array.isArray || function (obj) {
        return $$es5$$toString.call(obj) === '[object Array]';
    };

    var $$es5$$dateNow = Date.now || function () {
        return new Date().getTime();
    };
    var $$core$$default = $$core$$RelativeFormat;

    // -----------------------------------------------------------------------------

    var $$core$$FIELDS = ['second', 'minute', 'hour', 'day', 'month', 'year'];
    var $$core$$STYLES = ['best fit', 'numeric'];

    // -- RelativeFormat -----------------------------------------------------------

    function $$core$$RelativeFormat(locales, options) {
        options = options || {};

        // Make a copy of `locales` if it's an array, so that it doesn't change
        // since it's used lazily.
        if ($$es5$$isArray(locales)) {
            locales = locales.concat();
        }

        $$es5$$defineProperty(this, '_locale', {value: this._resolveLocale(locales)});
        $$es5$$defineProperty(this, '_options', {value: {
            style: this._resolveStyle(options.style),
            units: this._isValidUnits(options.units) && options.units
        }});

        $$es5$$defineProperty(this, '_locales', {value: locales});
        $$es5$$defineProperty(this, '_fields', {value: this._findFields(this._locale)});
        $$es5$$defineProperty(this, '_messages', {value: $$es5$$objCreate(null)});

        // "Bind" `format()` method to `this` so it can be passed by reference like
        // the other `Intl` APIs.
        var relativeFormat = this;
        this.format = function format(date, options) {
            return relativeFormat._format(date, options);
        };
    }

    // Define internal private properties for dealing with locale data.
    $$es5$$defineProperty($$core$$RelativeFormat, '__localeData__', {value: $$es5$$objCreate(null)});
    $$es5$$defineProperty($$core$$RelativeFormat, '__addLocaleData', {value: function (data) {
        if (!(data && data.locale)) {
            throw new Error(
                'Locale data provided to IntlRelativeFormat is missing a ' +
                '`locale` property value'
            );
        }

        $$core$$RelativeFormat.__localeData__[data.locale.toLowerCase()] = data;

        // Add data to IntlMessageFormat.
        intl$messageformat$$default.__addLocaleData(data);
    }});

    // Define public `defaultLocale` property which can be set by the developer, or
    // it will be set when the first RelativeFormat instance is created by
    // leveraging the resolved locale from `Intl`.
    $$es5$$defineProperty($$core$$RelativeFormat, 'defaultLocale', {
        enumerable: true,
        writable  : true,
        value     : undefined
    });

    // Define public `thresholds` property which can be set by the developer, and
    // defaults to relative time thresholds from moment.js.
    $$es5$$defineProperty($$core$$RelativeFormat, 'thresholds', {
        enumerable: true,

        value: {
            second: 45,  // seconds to minute
            minute: 45,  // minutes to hour
            hour  : 22,  // hours to day
            day   : 26,  // days to month
            month : 11   // months to year
        }
    });

    $$core$$RelativeFormat.prototype.resolvedOptions = function () {
        return {
            locale: this._locale,
            style : this._options.style,
            units : this._options.units
        };
    };

    $$core$$RelativeFormat.prototype._compileMessage = function (units) {
        // `this._locales` is the original set of locales the user specified to the
        // constructor, while `this._locale` is the resolved root locale.
        var locales        = this._locales;
        var resolvedLocale = this._locale;

        var field        = this._fields[units];
        var relativeTime = field.relativeTime;
        var future       = '';
        var past         = '';
        var i;

        for (i in relativeTime.future) {
            if (relativeTime.future.hasOwnProperty(i)) {
                future += ' ' + i + ' {' +
                    relativeTime.future[i].replace('{0}', '#') + '}';
            }
        }

        for (i in relativeTime.past) {
            if (relativeTime.past.hasOwnProperty(i)) {
                past += ' ' + i + ' {' +
                    relativeTime.past[i].replace('{0}', '#') + '}';
            }
        }

        var message = '{when, select, future {{0, plural, ' + future + '}}' +
                                     'past {{0, plural, ' + past + '}}}';

        // Create the synthetic IntlMessageFormat instance using the original
        // locales value specified by the user when constructing the the parent
        // IntlRelativeFormat instance.
        return new intl$messageformat$$default(message, locales);
    };

    $$core$$RelativeFormat.prototype._getMessage = function (units) {
        var messages = this._messages;

        // Create a new synthetic message based on the locale data from CLDR.
        if (!messages[units]) {
            messages[units] = this._compileMessage(units);
        }

        return messages[units];
    };

    $$core$$RelativeFormat.prototype._getRelativeUnits = function (diff, units) {
        var field = this._fields[units];

        if (field.relative) {
            return field.relative[diff];
        }
    };

    $$core$$RelativeFormat.prototype._findFields = function (locale) {
        var localeData = $$core$$RelativeFormat.__localeData__;
        var data       = localeData[locale.toLowerCase()];

        // The locale data is de-duplicated, so we have to traverse the locale's
        // hierarchy until we find `fields` to return.
        while (data) {
            if (data.fields) {
                return data.fields;
            }

            data = data.parentLocale && localeData[data.parentLocale.toLowerCase()];
        }

        throw new Error(
            'Locale data added to IntlRelativeFormat is missing `fields` for :' +
            locale
        );
    };

    $$core$$RelativeFormat.prototype._format = function (date, options) {
        var now = options && options.now !== undefined ? options.now : $$es5$$dateNow();

        if (date === undefined) {
            date = now;
        }

        // Determine if the `date` and optional `now` values are valid, and throw a
        // similar error to what `Intl.DateTimeFormat#format()` would throw.
        if (!isFinite(now)) {
            throw new RangeError(
                'The `now` option provided to IntlRelativeFormat#format() is not ' +
                'in valid range.'
            );
        }

        if (!isFinite(date)) {
            throw new RangeError(
                'The date value provided to IntlRelativeFormat#format() is not ' +
                'in valid range.'
            );
        }

        var diffReport  = $$diff$$default(now, date);
        var units       = this._options.units || this._selectUnits(diffReport);
        var diffInUnits = diffReport[units];

        if (this._options.style !== 'numeric') {
            var relativeUnits = this._getRelativeUnits(diffInUnits, units);
            if (relativeUnits) {
                return relativeUnits;
            }
        }

        return this._getMessage(units).format({
            '0' : Math.abs(diffInUnits),
            when: diffInUnits < 0 ? 'past' : 'future'
        });
    };

    $$core$$RelativeFormat.prototype._isValidUnits = function (units) {
        if (!units || $$es5$$arrIndexOf.call($$core$$FIELDS, units) >= 0) {
            return true;
        }

        if (typeof units === 'string') {
            var suggestion = /s$/.test(units) && units.substr(0, units.length - 1);
            if (suggestion && $$es5$$arrIndexOf.call($$core$$FIELDS, suggestion) >= 0) {
                throw new Error(
                    '"' + units + '" is not a valid IntlRelativeFormat `units` ' +
                    'value, did you mean: ' + suggestion
                );
            }
        }

        throw new Error(
            '"' + units + '" is not a valid IntlRelativeFormat `units` value, it ' +
            'must be one of: "' + $$core$$FIELDS.join('", "') + '"'
        );
    };

    $$core$$RelativeFormat.prototype._resolveLocale = function (locales) {
        if (typeof locales === 'string') {
            locales = [locales];
        }

        // Create a copy of the array so we can push on the default locale.
        locales = (locales || []).concat($$core$$RelativeFormat.defaultLocale);

        var localeData = $$core$$RelativeFormat.__localeData__;
        var i, len, localeParts, data;

        // Using the set of locales + the default locale, we look for the first one
        // which that has been registered. When data does not exist for a locale, we
        // traverse its ancestors to find something that's been registered within
        // its hierarchy of locales. Since we lack the proper `parentLocale` data
        // here, we must take a naive approach to traversal.
        for (i = 0, len = locales.length; i < len; i += 1) {
            localeParts = locales[i].toLowerCase().split('-');

            while (localeParts.length) {
                data = localeData[localeParts.join('-')];
                if (data) {
                    // Return the normalized locale string; e.g., we return "en-US",
                    // instead of "en-us".
                    return data.locale;
                }

                localeParts.pop();
            }
        }

        var defaultLocale = locales.pop();
        throw new Error(
            'No locale data has been added to IntlRelativeFormat for: ' +
            locales.join(', ') + ', or the default locale: ' + defaultLocale
        );
    };

    $$core$$RelativeFormat.prototype._resolveStyle = function (style) {
        // Default to "best fit" style.
        if (!style) {
            return $$core$$STYLES[0];
        }

        if ($$es5$$arrIndexOf.call($$core$$STYLES, style) >= 0) {
            return style;
        }

        throw new Error(
            '"' + style + '" is not a valid IntlRelativeFormat `style` value, it ' +
            'must be one of: "' + $$core$$STYLES.join('", "') + '"'
        );
    };

    $$core$$RelativeFormat.prototype._selectUnits = function (diffReport) {
        var i, l, units;

        for (i = 0, l = $$core$$FIELDS.length; i < l; i += 1) {
            units = $$core$$FIELDS[i];

            if (Math.abs(diffReport[units]) < $$core$$RelativeFormat.thresholds[units]) {
                break;
            }
        }

        return units;
    };
    var $$en$$default = {"locale":"en","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1],t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2);if(ord)return n10==1&&n100!=11?"one":n10==2&&n100!=12?"two":n10==3&&n100!=13?"few":"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"one":"in {0} year","other":"in {0} years"},"past":{"one":"{0} year ago","other":"{0} years ago"}}},"month":{"displayName":"month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"one":"in {0} month","other":"in {0} months"},"past":{"one":"{0} month ago","other":"{0} months ago"}}},"day":{"displayName":"day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"one":"in {0} day","other":"in {0} days"},"past":{"one":"{0} day ago","other":"{0} days ago"}}},"hour":{"displayName":"hour","relativeTime":{"future":{"one":"in {0} hour","other":"in {0} hours"},"past":{"one":"{0} hour ago","other":"{0} hours ago"}}},"minute":{"displayName":"minute","relativeTime":{"future":{"one":"in {0} minute","other":"in {0} minutes"},"past":{"one":"{0} minute ago","other":"{0} minutes ago"}}},"second":{"displayName":"second","relative":{"0":"now"},"relativeTime":{"future":{"one":"in {0} second","other":"in {0} seconds"},"past":{"one":"{0} second ago","other":"{0} seconds ago"}}}}};

    $$core$$default.__addLocaleData($$en$$default);
    $$core$$default.defaultLocale = 'en';

    var src$main$$default = $$core$$default;
    this['IntlRelativeFormat'] = src$main$$default;
}).call(this);

//
IntlRelativeFormat.__addLocaleData({"locale":"af","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"jaar","relative":{"0":"hierdie jaar","1":"volgende jaar","-1":"verlede jaar"},"relativeTime":{"future":{"one":"oor {0} jaar","other":"oor {0} jaar"},"past":{"one":"{0} jaar gelede","other":"{0} jaar gelede"}}},"month":{"displayName":"Maand","relative":{"0":"vandeesmaand","1":"volgende maand","-1":"verlede maand"},"relativeTime":{"future":{"one":"oor {0} minuut","other":"oor {0} minuut"},"past":{"one":"{0} maand gelede","other":"{0} maande gelede"}}},"day":{"displayName":"Dag","relative":{"0":"vandag","1":"m??re","2":"oorm??re","-2":"eergister","-1":"gister"},"relativeTime":{"future":{"one":"oor {0} minuut","other":"oor {0} minuut"},"past":{"one":"{0} dag gelede","other":"{0} dae gelede"}}},"hour":{"displayName":"uur","relativeTime":{"future":{"one":"oor {0} uur","other":"oor {0} uur"},"past":{"one":"{0} uur gelede","other":"{0} uur gelede"}}},"minute":{"displayName":"minuut","relativeTime":{"future":{"one":"oor {0} minuut","other":"oor {0} minuut"},"past":{"one":"{0} minuut gelede","other":"{0} minute gelede"}}},"second":{"displayName":"sekonde","relative":{"0":"nou"},"relativeTime":{"future":{"one":"oor {0} sekonde","other":"oor {0} sekondes"},"past":{"one":"{0} sekonde gelede","other":"{0} sekondes gelede"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"af-NA","parentLocale":"af"});

IntlRelativeFormat.__addLocaleData({"locale":"agq","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"k??n??m","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"ndz????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"utsu??","relative":{"0":"n??","1":"ts??ts??","-1":"?? z??????"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"t??m","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"men??","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"s??k????n","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ak","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==0||n==1?"one":"other"},"fields":{"year":{"displayName":"Afe","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Bosome","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Da","relative":{"0":"Nd??","1":"??kyena","-1":"Ndeda"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"D??nhwer","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Sema","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"S??k??nd","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"am","pluralRuleFunction":function (n,ord){if(ord)return"other";return n>=0&&n<=1?"one":"other"},"fields":{"year":{"displayName":"?????????","relative":{"0":"????????? ?????????","1":"?????????????????? ?????????","-1":"???????????? ?????????"},"relativeTime":{"future":{"one":"???{0} ???????????? ?????????","other":"???{0} ???????????? ?????????"},"past":{"one":"???{0} ????????? ?????????","other":"???{0} ???????????? ?????????"}}},"month":{"displayName":"??????","relative":{"0":"????????? ??????","1":"?????????????????? ??????","-1":"???????????? ??????"},"relativeTime":{"future":{"one":"???{0} ?????? ?????????","other":"???{0} ????????? ?????????"},"past":{"one":"???{0} ?????? ?????????","other":"???{0} ????????? ?????????"}}},"day":{"displayName":"??????","relative":{"0":"??????","1":"??????","2":"????????? ?????????","-2":"??????????????? ?????????","-1":"????????????"},"relativeTime":{"future":{"one":"???{0} ?????? ?????????","other":"???{0} ????????? ?????????"},"past":{"one":"???{0} ?????? ?????????","other":"???{0} ????????? ?????????"}}},"hour":{"displayName":"?????????","relativeTime":{"future":{"one":"???{0} ????????? ?????????","other":"???{0} ???????????? ?????????"},"past":{"one":"???{0} ????????? ?????????","other":"???{0} ???????????? ?????????"}}},"minute":{"displayName":"?????????","relativeTime":{"future":{"one":"???{0} ????????? ?????????","other":"???{0} ??????????????? ?????????"},"past":{"one":"???{0} ????????? ?????????","other":"???{0} ??????????????? ?????????"}}},"second":{"displayName":"????????????","relative":{"0":"?????????"},"relativeTime":{"future":{"one":"???{0} ???????????? ?????????","other":"???{0} ??????????????? ?????????"},"past":{"one":"???{0} ???????????? ?????????","other":"???{0} ??????????????? ?????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ar","pluralRuleFunction":function (n,ord){var s=String(n).split("."),t0=Number(s[0])==n,n100=t0&&s[0].slice(-2);if(ord)return"other";return n==0?"zero":n==1?"one":n==2?"two":n100>=3&&n100<=10?"few":n100>=11&&n100<=99?"many":"other"},"fields":{"year":{"displayName":"??????????","relative":{"0":"?????????? ??????????????","1":"?????????? ??????????????","-1":"?????????? ??????????????"},"relativeTime":{"future":{"zero":"???????? {0} ??????","one":"???????? ?????? ??????????","two":"???????? ??????????","few":"???????? {0} ??????????","many":"???????? {0} ??????","other":"???????? {0} ??????"},"past":{"zero":"?????? {0} ??????","one":"?????? ?????? ??????????","two":"?????? ??????????","few":"?????? {0} ??????????","many":"?????? {0} ??????","other":"?????? {0} ??????"}}},"month":{"displayName":"??????????","relative":{"0":"?????? ??????????","1":"?????????? ????????????","-1":"?????????? ????????????"},"relativeTime":{"future":{"zero":"???????? {0} ??????","one":"???????? ?????? ????????","two":"???????? ??????????","few":"???????? {0} ????????","many":"???????? {0} ??????????","other":"???????? {0} ??????"},"past":{"zero":"?????? {0} ??????","one":"?????? ?????? ????????","two":"?????? ??????????","few":"?????? {0} ????????","many":"?????? {0} ??????????","other":"?????? {0} ??????"}}},"day":{"displayName":"??????","relative":{"0":"??????????","1":"????????","2":"?????? ????????","-2":"?????? ??????","-1":"??????"},"relativeTime":{"future":{"zero":"???????? {0} ??????","one":"???????? ?????? ????????","two":"???????? ??????????","few":"???????? {0} ????????","many":"???????? {0} ??????????","other":"???????? {0} ??????"},"past":{"zero":"?????? {0} ??????","one":"?????? ?????? ????????","two":"?????? ??????????","few":"?????? {0} ????????","many":"?????? {0} ??????????","other":"?????? {0} ??????"}}},"hour":{"displayName":"??????????????","relativeTime":{"future":{"zero":"???????? {0} ????????","one":"???????? ???????? ??????????","two":"???????? ????????????","few":"???????? {0} ??????????","many":"???????? {0} ????????","other":"???????? {0} ????????"},"past":{"zero":"?????? {0} ????????","one":"?????? ???????? ??????????","two":"?????? ????????????","few":"?????? {0} ??????????","many":"?????? {0} ????????","other":"?????? {0} ????????"}}},"minute":{"displayName":"??????????????","relativeTime":{"future":{"zero":"???????? {0} ??????????","one":"???????? ?????????? ??????????","two":"???????? ??????????????","few":"???????? {0} ??????????","many":"???????? {0} ??????????","other":"???????? {0} ??????????"},"past":{"zero":"?????? {0} ??????????","one":"?????? ?????????? ??????????","two":"?????? ??????????????","few":"?????? {0} ??????????","many":"?????? {0} ??????????","other":"?????? {0} ??????????"}}},"second":{"displayName":"??????????????","relative":{"0":"????????"},"relativeTime":{"future":{"zero":"???????? {0} ??????????","one":"???????? ?????????? ??????????","two":"???????? ??????????????","few":"???????? {0} ??????????","many":"???????? {0} ??????????","other":"???????? {0} ??????????"},"past":{"zero":"?????? {0} ??????????","one":"?????? ?????????? ??????????","two":"?????? ??????????????","few":"?????? {0} ??????????","many":"?????? {0} ??????????","other":"?????? {0} ??????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ar-AE","parentLocale":"ar","fields":{"year":{"displayName":"??????????","relative":{"0":"?????? ??????????","1":"?????????? ??????????????","-1":"?????????? ??????????????"},"relativeTime":{"future":{"zero":"???????? {0} ??????","one":"???????? ?????? ??????????","two":"???????? ??????????","few":"???????? {0} ??????????","many":"???????? {0} ??????","other":"???????? {0} ??????"},"past":{"zero":"?????? {0} ??????","one":"?????? ?????? ??????????","two":"?????? ??????????","few":"?????? {0} ??????????","many":"?????? {0} ??????","other":"?????? {0} ??????"}}},"month":{"displayName":"??????????","relative":{"0":"?????? ??????????","1":"?????????? ????????????","-1":"?????????? ????????????"},"relativeTime":{"future":{"zero":"???????? {0} ??????","one":"???????? ?????? ????????","two":"???????? ??????????","few":"???????? {0} ????????","many":"???????? {0} ??????????","other":"???????? {0} ??????"},"past":{"zero":"?????? {0} ??????","one":"?????? ?????? ????????","two":"?????? ??????????","few":"?????? {0} ????????","many":"?????? {0} ??????????","other":"?????? {0} ??????"}}},"day":{"displayName":"??????","relative":{"0":"??????????","1":"????????","2":"?????? ????????","-2":"?????? ??????","-1":"??????"},"relativeTime":{"future":{"zero":"???????? {0} ??????","one":"???????? ?????? ????????","two":"???????? ??????????","few":"???????? {0} ????????","many":"???????? {0} ??????????","other":"???????? {0} ??????"},"past":{"zero":"?????? {0} ??????","one":"?????? ?????? ????????","two":"?????? ??????????","few":"?????? {0} ????????","many":"?????? {0} ??????????","other":"?????? {0} ??????"}}},"hour":{"displayName":"??????????????","relativeTime":{"future":{"zero":"???????? {0} ????????","one":"???????? ???????? ??????????","two":"???????? ????????????","few":"???????? {0} ??????????","many":"???????? {0} ????????","other":"???????? {0} ????????"},"past":{"zero":"?????? {0} ????????","one":"?????? ???????? ??????????","two":"?????? ????????????","few":"?????? {0} ??????????","many":"?????? {0} ????????","other":"?????? {0} ????????"}}},"minute":{"displayName":"??????????????","relativeTime":{"future":{"zero":"???????? {0} ??????????","one":"???????? ?????????? ??????????","two":"???????? ??????????????","few":"???????? {0} ??????????","many":"???????? {0} ??????????","other":"???????? {0} ??????????"},"past":{"zero":"?????? {0} ??????????","one":"?????? ?????????? ??????????","two":"?????? ??????????????","few":"?????? {0} ??????????","many":"?????? {0} ??????????","other":"?????? {0} ??????????"}}},"second":{"displayName":"??????????????","relative":{"0":"????????"},"relativeTime":{"future":{"zero":"???????? {0} ??????????","one":"???????? ?????????? ??????????","two":"???????? ??????????????","few":"???????? {0} ??????????","many":"???????? {0} ??????????","other":"???????? {0} ??????????"},"past":{"zero":"?????? {0} ??????????","one":"?????? ?????????? ??????????","two":"?????? ??????????????","few":"?????? {0} ??????????","many":"?????? {0} ??????????","other":"?????? {0} ??????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ar-BH","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-DJ","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-DZ","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-EG","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-EH","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-ER","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-IL","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-IQ","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-JO","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-KM","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-KW","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-LB","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-LY","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-MA","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-MR","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-OM","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-PS","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-QA","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-SA","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-SD","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-SO","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-SS","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-SY","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-TD","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-TN","parentLocale":"ar"});
IntlRelativeFormat.__addLocaleData({"locale":"ar-YE","parentLocale":"ar"});

IntlRelativeFormat.__addLocaleData({"locale":"as","pluralRuleFunction":function (n,ord){if(ord)return n==1||n==5||n==7||n==8||n==9||n==10?"one":n==2||n==3?"two":n==4?"few":n==6?"many":"other";return n>=0&&n<=1?"one":"other"},"fields":{"year":{"displayName":"?????????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"?????????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"?????????","relative":{"0":"?????????","1":"???????????????","2":"??????????????????","-2":"????????????","-1":"????????????"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"???????????????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"???????????????","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"?????????????????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"asa","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Mwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mweji","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Thiku","relative":{"0":"Iyoo","1":"Yavo","-1":"Ighuo"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Thaa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Dakika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Thekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ast","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"a??u","relative":{"0":"esti a??u","1":"l???a??u viniente","-1":"l???a??u pas??u"},"relativeTime":{"future":{"one":"en {0} a??u","other":"en {0} a??os"},"past":{"one":"hai {0} a??u","other":"hai {0} a??os"}}},"month":{"displayName":"mes","relative":{"0":"esti mes","1":"el mes viniente","-1":"el mes pas??u"},"relativeTime":{"future":{"one":"en {0} mes","other":"en {0} meses"},"past":{"one":"hai {0} mes","other":"hai {0} meses"}}},"day":{"displayName":"d??a","relative":{"0":"g??ei","1":"ma??ana","2":"pasao ma??ana","-2":"antayeri","-1":"ayeri"},"relativeTime":{"future":{"one":"en {0} d??a","other":"en {0} d??es"},"past":{"one":"hai {0} d??a","other":"hai {0} d??es"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"en {0} hora","other":"en {0} hores"},"past":{"one":"hai {0} hora","other":"hai {0} hores"}}},"minute":{"displayName":"minutu","relativeTime":{"future":{"one":"en {0} minutu","other":"en {0} minutos"},"past":{"one":"hai {0} minutu","other":"hai {0} minutos"}}},"second":{"displayName":"segundu","relative":{"0":"agora"},"relativeTime":{"future":{"one":"en {0} segundu","other":"en {0} segundos"},"past":{"one":"hai {0} segundu","other":"hai {0} segundos"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"az","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],i10=i.slice(-1),i100=i.slice(-2),i1000=i.slice(-3);if(ord)return i10==1||i10==2||i10==5||i10==7||i10==8||(i100==20||i100==50||i100==70||i100==80)?"one":i10==3||i10==4||(i1000==100||i1000==200||i1000==300||i1000==400||i1000==500||i1000==600||i1000==700||i1000==800||i1000==900)?"few":i==0||i10==6||(i100==40||i100==60||i100==90)?"many":"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"??l","relative":{"0":"bu il","1":"g??l??n il","-1":"ke????n il"},"relativeTime":{"future":{"one":"{0} il ??rzind??","other":"{0} il ??rzind??"},"past":{"one":"{0} il ??nc??","other":"{0} il ??nc??"}}},"month":{"displayName":"Ay","relative":{"0":"bu ay","1":"g??l??n ay","-1":"ke????n ay"},"relativeTime":{"future":{"one":"{0} ay ??rzind??","other":"{0} ay ??rzind??"},"past":{"one":"{0} ay ??nc??","other":"{0} ay ??nc??"}}},"day":{"displayName":"G??n","relative":{"0":"bu g??n","1":"sabah","-1":"d??n??n"},"relativeTime":{"future":{"one":"{0} g??n ??rzind??","other":"{0} g??n ??rzind??"},"past":{"one":"{0} g??n ??nc??","other":"{0} g??n ??nc??"}}},"hour":{"displayName":"Saat","relativeTime":{"future":{"one":"{0} saat ??rzind??","other":"{0} saat ??rzind??"},"past":{"one":"{0} saat ??nc??","other":"{0} saat ??nc??"}}},"minute":{"displayName":"D??qiq??","relativeTime":{"future":{"one":"{0} d??qiq?? ??rzind??","other":"{0} d??qiq?? ??rzind??"},"past":{"one":"{0} d??qiq?? ??nc??","other":"{0} d??qiq?? ??nc??"}}},"second":{"displayName":"Saniy??","relative":{"0":"indi"},"relativeTime":{"future":{"one":"{0} saniy?? ??rzind??","other":"{0} saniy?? ??rzind??"},"past":{"one":"{0} saniy?? ??nc??","other":"{0} saniy?? ??nc??"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"az-Arab","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"az-Cyrl","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"az-Latn","parentLocale":"az"});

IntlRelativeFormat.__addLocaleData({"locale":"bas","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"??w??i","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"so??","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"k??l","relative":{"0":"l????n","1":"y??ni","-1":"y????ni"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"??g????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"??get","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"h????ge??get","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"be","pluralRuleFunction":function (n,ord){var s=String(n).split("."),t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2);if(ord)return(n10==2||n10==3)&&n100!=12&&n100!=13?"few":"other";return n10==1&&n100!=11?"one":n10>=2&&n10<=4&&(n100<12||n100>14)?"few":t0&&n10==0||n10>=5&&n10<=9||n100>=11&&n100<=14?"many":"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"?? ?????????? ??????????","1":"?? ?????????????????? ??????????","-1":"?? ?????????????? ??????????"},"relativeTime":{"future":{"one":"???????? {0} ??????","few":"???????? {0} ????????","many":"???????? {0} ??????????","other":"???????? {0} ????????"},"past":{"one":"{0} ?????? ????????","few":"{0} ???????? ????????","many":"{0} ?????????? ????????","other":"{0} ???????? ????????"}}},"month":{"displayName":"??????????","relative":{"0":"?? ?????????? ????????????","1":"?? ?????????????????? ????????????","-1":"?? ?????????????? ????????????"},"relativeTime":{"future":{"one":"???????? {0} ??????????","few":"???????? {0} ????????????","many":"???????? {0} ??????????????","other":"???????? {0} ????????????"},"past":{"one":"{0} ?????????? ????????","few":"{0} ???????????? ????????","many":"{0} ?????????????? ????????","other":"{0} ???????????? ????????"}}},"day":{"displayName":"??????????","relative":{"0":"??????????","1":"????????????","2":"??????????????????????","-2":"??????????????????","-1":"??????????"},"relativeTime":{"future":{"one":"???????? {0} ??????????","few":"???????? {0} ??????","many":"???????? {0} ????????","other":"???????? {0} ??????"},"past":{"one":"{0} ?????????? ????????","few":"{0} ?????? ????????","many":"{0} ???????? ????????","other":"{0} ?????? ????????"}}},"hour":{"displayName":"??????????????","relativeTime":{"future":{"one":"???????? {0} ??????????????","few":"???????? {0} ??????????????","many":"???????? {0} ????????????","other":"???????? {0} ??????????????"},"past":{"one":"{0} ?????????????? ????????","few":"{0} ?????????????? ????????","many":"{0} ???????????? ????????","other":"{0} ?????????????? ????????"}}},"minute":{"displayName":"??????????????","relativeTime":{"future":{"one":"???????? {0} ??????????????","few":"???????? {0} ??????????????","many":"???????? {0} ????????????","other":"???????? {0} ??????????????"},"past":{"one":"{0} ?????????????? ????????","few":"{0} ?????????????? ????????","many":"{0} ???????????? ????????","other":"{0} ?????????????? ????????"}}},"second":{"displayName":"??????????????","relative":{"0":"now"},"relativeTime":{"future":{"one":"???????? {0} ??????????????","few":"???????? {0} ??????????????","many":"???????? {0} ????????????","other":"???????? {0} ??????????????"},"past":{"one":"{0} ?????????????? ????????","few":"{0} ?????????????? ????????","many":"{0} ???????????? ????????","other":"{0} ?????????????? ????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"bem","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Umwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Umweshi","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Ubushiku","relative":{"0":"Lelo","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Insa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Mineti","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekondi","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"bez","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Mwaha","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mwedzi","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Sihu","relative":{"0":"Neng???u ni","1":"Hilawu","-1":"Igolo"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Saa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Dakika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"bg","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"????????????","relative":{"0":"???????? ????????????","1":"???????????????????? ????????????","-1":"???????????????? ????????????"},"relativeTime":{"future":{"one":"???????? {0} ????????????","other":"???????? {0} ????????????"},"past":{"one":"?????????? {0} ????????????","other":"?????????? {0} ????????????"}}},"month":{"displayName":"??????????","relative":{"0":"???????? ??????????","1":"???????????????????? ??????????","-1":"???????????????? ??????????"},"relativeTime":{"future":{"one":"???????? {0} ??????????","other":"???????? {0} ????????????"},"past":{"one":"?????????? {0} ??????????","other":"?????????? {0} ????????????"}}},"day":{"displayName":"??????","relative":{"0":"????????","1":"????????","2":"??????????????????","-2":"???????? ??????","-1":"??????????"},"relativeTime":{"future":{"one":"???????? {0} ??????","other":"???????? {0} ??????"},"past":{"one":"?????????? {0} ??????","other":"?????????? {0} ??????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"one":"???????? {0} ??????","other":"???????? {0} ????????"},"past":{"one":"?????????? {0} ??????","other":"?????????? {0} ????????"}}},"minute":{"displayName":"????????????","relativeTime":{"future":{"one":"???????? {0} ????????????","other":"???????? {0} ????????????"},"past":{"one":"?????????? {0} ????????????","other":"?????????? {0} ????????????"}}},"second":{"displayName":"??????????????","relative":{"0":"????????"},"relativeTime":{"future":{"one":"???????? {0} ??????????????","other":"???????? {0} ??????????????"},"past":{"one":"?????????? {0} ??????????????","other":"?????????? {0} ??????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"bh","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==0||n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"bm","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"san","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"kalo","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"don","relative":{"0":"bi","1":"sini","-1":"kunu"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"l??r??","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"miniti","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"sekondi","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"bm-Nkoo","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"bn","pluralRuleFunction":function (n,ord){if(ord)return n==1||n==5||n==7||n==8||n==9||n==10?"one":n==2||n==3?"two":n==4?"few":n==6?"many":"other";return n>=0&&n<=1?"one":"other"},"fields":{"year":{"displayName":"?????????","relative":{"0":"?????? ?????????","1":"???????????? ?????????","-1":"?????? ?????????"},"relativeTime":{"future":{"one":"{0} ????????????","other":"{0} ????????????"},"past":{"one":"{0} ????????? ??????????????????","other":"{0} ????????? ??????????????????"}}},"month":{"displayName":"?????????","relative":{"0":"?????? ?????????","1":"???????????? ?????????","-1":"?????? ?????????"},"relativeTime":{"future":{"one":"{0} ????????????","other":"{0} ????????????"},"past":{"one":"{0} ????????? ??????????????????","other":"{0} ????????? ??????????????????"}}},"day":{"displayName":"?????????","relative":{"0":"??????","1":"????????????????????????","2":"??????????????? ????????????","-2":"?????? ????????????","-1":"???????????????"},"relativeTime":{"future":{"one":"{0} ??????????????? ???????????????","other":"{0} ??????????????? ???????????????"},"past":{"one":"{0} ????????? ??????????????????","other":"{0} ????????? ??????????????????"}}},"hour":{"displayName":"???????????????","relativeTime":{"future":{"one":"{0} ?????????????????????","other":"{0} ?????????????????????"},"past":{"one":"{0} ??????????????? ?????????","other":"{0} ??????????????? ?????????"}}},"minute":{"displayName":"???????????????","relativeTime":{"future":{"one":"{0} ??????????????????","other":"{0} ??????????????????"},"past":{"one":"{0} ??????????????? ??????????????????","other":"{0} ??????????????? ??????????????????"}}},"second":{"displayName":"?????????????????????","relative":{"0":"?????????"},"relativeTime":{"future":{"one":"{0} ????????????????????????","other":"{0} ????????????????????????"},"past":{"one":"{0} ????????????????????? ??????????????????","other":"{0} ????????????????????? ??????????????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"bn-IN","parentLocale":"bn"});

IntlRelativeFormat.__addLocaleData({"locale":"bo","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"?????????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"???????????????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"????????????","relative":{"0":"?????????????????????","1":"?????????????????????","2":"???????????????????????????","-2":"?????????????????????","-1":"???????????????"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"?????????????????????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"??????????????????","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"??????????????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"bo-IN","parentLocale":"bo"});

IntlRelativeFormat.__addLocaleData({"locale":"br","pluralRuleFunction":function (n,ord){var s=String(n).split("."),t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2),n1000000=t0&&s[0].slice(-6);if(ord)return"other";return n10==1&&n100!=11&&n100!=71&&n100!=91?"one":n10==2&&n100!=12&&n100!=72&&n100!=92?"two":(n10==3||n10==4||n10==9)&&(n100<10||n100>19)&&(n100<70||n100>79)&&(n100<90||n100>99)?"few":n!=0&&t0&&n1000000==0?"many":"other"},"fields":{"year":{"displayName":"bloaz","relative":{"0":"hevlene","1":"ar bloaz a zeu","-1":"warlene"},"relativeTime":{"future":{"one":"a-benn {0} bloaz","two":"a-benn {0} vloaz","few":"a-benn {0} bloaz","many":"a-benn {0} a vloazio??","other":"a-benn {0} vloaz"},"past":{"one":"{0} bloaz zo","two":"{0} vloaz zo","few":"{0} bloaz zo","many":"{0} a vloazio?? zo","other":"{0} vloaz zo"}}},"month":{"displayName":"miz","relative":{"0":"ar miz-ma??","1":"ar miz a zeu","-1":"ar miz diaraok"},"relativeTime":{"future":{"one":"a-benn {0} miz","two":"a-benn {0} viz","few":"a-benn {0} miz","many":"a-benn {0} a vizio??","other":"a-benn {0} miz"},"past":{"one":"{0} miz zo","two":"{0} viz zo","few":"{0} miz zo","many":"{0} a vizio?? zo","other":"{0} miz zo"}}},"day":{"displayName":"deiz","relative":{"0":"hiziv","1":"warc??hoazh","-2":"derc??hent-dec??h","-1":"dec??h"},"relativeTime":{"future":{"one":"a-benn {0} deiz","two":"a-benn {0} zeiz","few":"a-benn {0} deiz","many":"a-benn {0} a zeizio??","other":"a-benn {0} deiz"},"past":{"one":"{0} deiz zo","two":"{0} zeiz zo","few":"{0} deiz zo","many":"{0} a zeizio?? zo","other":"{0} deiz zo"}}},"hour":{"displayName":"eur","relativeTime":{"future":{"one":"a-benn {0} eur","two":"a-benn {0} eur","few":"a-benn {0} eur","many":"a-benn {0} a eurio??","other":"a-benn {0} eur"},"past":{"one":"{0} eur zo","two":"{0} eur zo","few":"{0} eur zo","many":"{0} a eurio?? zo","other":"{0} eur zo"}}},"minute":{"displayName":"munut","relativeTime":{"future":{"one":"a-benn {0} munut","two":"a-benn {0} vunut","few":"a-benn {0} munut","many":"a-benn {0} a vunuto??","other":"a-benn {0} munut"},"past":{"one":"{0} munut zo","two":"{0} vunut zo","few":"{0} munut zo","many":"{0} a vunuto?? zo","other":"{0} munut zo"}}},"second":{"displayName":"eilenn","relative":{"0":"brema??"},"relativeTime":{"future":{"one":"a-benn {0} eilenn","two":"a-benn {0} eilenn","few":"a-benn {0} eilenn","many":"a-benn {0} a eilenno??","other":"a-benn {0} eilenn"},"past":{"one":"{0} eilenn zo","two":"{0} eilenn zo","few":"{0} eilenn zo","many":"{0} eilenn zo","other":"{0} eilenn zo"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"brx","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"???????????????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"?????????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"?????????","relative":{"0":"????????????","1":"???????????????","-1":"????????????"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"???????????????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"???????????????","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"?????????????????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"bs","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],f=s[1]||"",v0=!s[1],i10=i.slice(-1),i100=i.slice(-2),f10=f.slice(-1),f100=f.slice(-2);if(ord)return"other";return v0&&i10==1&&i100!=11||f10==1&&f100!=11?"one":v0&&(i10>=2&&i10<=4)&&(i100<12||i100>14)||f10>=2&&f10<=4&&(f100<12||f100>14)?"few":"other"},"fields":{"year":{"displayName":"godina","relative":{"0":"ove godine","1":"sljede??e godine","-1":"pro??le godine"},"relativeTime":{"future":{"one":"za {0} godinu","few":"za {0} godine","other":"za {0} godina"},"past":{"one":"prije {0} godinu","few":"prije {0} godine","other":"prije {0} godina"}}},"month":{"displayName":"mjesec","relative":{"0":"ovaj mjesec","1":"sljede??i mjesec","-1":"pro??li mjesec"},"relativeTime":{"future":{"one":"za {0} mjesec","few":"za {0} mjeseca","other":"za {0} mjeseci"},"past":{"one":"prije {0} mjesec","few":"prije {0} mjeseca","other":"prije {0} mjeseci"}}},"day":{"displayName":"dan","relative":{"0":"danas","1":"sutra","2":"prekosutra","-2":"prekju??e","-1":"ju??er"},"relativeTime":{"future":{"one":"za {0} dan","few":"za {0} dana","other":"za {0} dana"},"past":{"one":"prije {0} dan","few":"prije {0} dana","other":"prije {0} dana"}}},"hour":{"displayName":"sat","relativeTime":{"future":{"one":"za {0} sat","few":"za {0} sata","other":"za {0} sati"},"past":{"one":"prije {0} sat","few":"prije {0} sata","other":"prije {0} sati"}}},"minute":{"displayName":"minut","relativeTime":{"future":{"one":"za {0} minutu","few":"za {0} minute","other":"za {0} minuta"},"past":{"one":"prije {0} minutu","few":"prije {0} minute","other":"prije {0} minuta"}}},"second":{"displayName":"sekund","relative":{"0":"now"},"relativeTime":{"future":{"one":"za {0} sekundu","few":"za {0} sekunde","other":"za {0} sekundi"},"past":{"one":"prije {0} sekundu","few":"prije {0} sekunde","other":"prije {0} sekundi"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"bs-Cyrl","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"????????????","relative":{"0":"?????? ????????????","1":"?????????????? ????????????","-1":"???????????? ????????????"},"relativeTime":{"future":{"one":"???? {0} ????????????","few":"???? {0} ????????????","other":"???? {0} ????????????"},"past":{"one":"?????? {0} ????????????","few":"?????? {0} ????????????","other":"?????? {0} ????????????"}}},"month":{"displayName":"??????????","relative":{"0":"???????? ????????????","1":"???????????????? ????????????","-1":"?????????????? ????????????"},"relativeTime":{"future":{"one":"???? {0} ??????????","few":"???? {0} ????????????","other":"???? {0} ????????????"},"past":{"one":"?????? {0} ??????????","few":"?????? {0} ????????????","other":"?????? {0} ????????????"}}},"day":{"displayName":"??????","relative":{"0":"??????????","1":"??????????","2":"????????????????????","-2":"????????????????","-1":"????????"},"relativeTime":{"future":{"one":"???? {0} ??????","few":"???? {0} ????????","other":"???? {0} ????????"},"past":{"one":"?????? {0} ??????","few":"?????? {0} ????????","other":"?????? {0} ????????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"one":"???? {0} ??????","few":"???? {0} ????????","other":"???? {0} ????????"},"past":{"one":"?????? {0} ??????","few":"?????? {0} ????????","other":"?????? {0} ????????"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"one":"???? {0} ??????????","few":"???? {0} ????????????","other":"???? {0} ????????????"},"past":{"one":"?????? {0} ??????????","few":"?????? {0} ????????????","other":"?????? {0} ????????????"}}},"second":{"displayName":"????????????","relative":{"0":"now"},"relativeTime":{"future":{"one":"???? {0} ????????????","few":"???? {0} ??????????????","other":"???? {0} ??????????????"},"past":{"one":"?????? {0} ????????????","few":"?????? {0} ??????????????","other":"?????? {0} ??????????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"bs-Latn","parentLocale":"bs"});

IntlRelativeFormat.__addLocaleData({"locale":"ca","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return n==1||n==3?"one":n==2?"two":n==4?"few":"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"any","relative":{"0":"enguany","1":"l???any que ve","-1":"l???any passat"},"relativeTime":{"future":{"one":"d???aqu?? a {0} any","other":"d???aqu?? a {0} anys"},"past":{"one":"fa {0} any","other":"fa {0} anys"}}},"month":{"displayName":"mes","relative":{"0":"aquest mes","1":"el mes que ve","-1":"el mes passat"},"relativeTime":{"future":{"one":"d???aqu?? a {0} mes","other":"d???aqu?? a {0} mesos"},"past":{"one":"fa {0} mes","other":"fa {0} mesos"}}},"day":{"displayName":"dia","relative":{"0":"avui","1":"dem??","2":"dem?? passat","-2":"abans-d???ahir","-1":"ahir"},"relativeTime":{"future":{"one":"d???aqu?? a {0} dia","other":"d???aqu?? a {0} dies"},"past":{"one":"fa {0} dia","other":"fa {0} dies"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"d???aqu?? a {0} hora","other":"d???aqu?? a {0} hores"},"past":{"one":"fa {0} hora","other":"fa {0} hores"}}},"minute":{"displayName":"minut","relativeTime":{"future":{"one":"d???aqu?? a {0} minut","other":"d???aqu?? a {0} minuts"},"past":{"one":"fa {0} minut","other":"fa {0} minuts"}}},"second":{"displayName":"segon","relative":{"0":"ara"},"relativeTime":{"future":{"one":"d???aqu?? a {0} segon","other":"d???aqu?? a {0} segons"},"past":{"one":"fa {0} segon","other":"fa {0} segons"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ca-AD","parentLocale":"ca"});
IntlRelativeFormat.__addLocaleData({"locale":"ca-ES-VALENCIA","parentLocale":"ca-ES","fields":{"year":{"displayName":"any","relative":{"0":"enguany","1":"l???any que ve","-1":"l???any passat"},"relativeTime":{"future":{"one":"d???aqu?? a {0} any","other":"d???aqu?? a {0} anys"},"past":{"one":"fa {0} any","other":"fa {0} anys"}}},"month":{"displayName":"mes","relative":{"0":"aquest mes","1":"el mes que ve","-1":"el mes passat"},"relativeTime":{"future":{"one":"d???aqu?? a {0} mes","other":"d???aqu?? a {0} mesos"},"past":{"one":"fa {0} mes","other":"fa {0} mesos"}}},"day":{"displayName":"dia","relative":{"0":"avui","1":"dem??","2":"dem?? passat","-2":"abans-d???ahir","-1":"ahir"},"relativeTime":{"future":{"one":"d???aqu?? a {0} dia","other":"d???aqu?? a {0} dies"},"past":{"one":"fa {0} dia","other":"fa {0} dies"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"d???aqu?? a {0} hora","other":"d???aqu?? a {0} hores"},"past":{"one":"fa {0} hora","other":"fa {0} hores"}}},"minute":{"displayName":"minut","relativeTime":{"future":{"one":"d???aqu?? a {0} minut","other":"d???aqu?? a {0} minuts"},"past":{"one":"fa {0} minut","other":"fa {0} minuts"}}},"second":{"displayName":"segon","relative":{"0":"ara"},"relativeTime":{"future":{"one":"d???aqu?? a {0} segon","other":"d???aqu?? a {0} segons"},"past":{"one":"fa {0} segon","other":"fa {0} segons"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ca-ES","parentLocale":"ca"});
IntlRelativeFormat.__addLocaleData({"locale":"ca-FR","parentLocale":"ca"});
IntlRelativeFormat.__addLocaleData({"locale":"ca-IT","parentLocale":"ca"});

IntlRelativeFormat.__addLocaleData({"locale":"ce","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"????","relative":{"0":"?????????????? ????????????","1":"???????????????? ????????????","-1":"?????????????? ????????????"},"relativeTime":{"future":{"one":"{0} ???? ????????????","other":"{0} ???? ????????????"},"past":{"one":"{0} ???? ????????????","other":"{0} ???? ????????????"}}},"month":{"displayName":"????????","relative":{"0":"?????????????? ??????????????","1":"???????????????? ??????????????","-1":"?????????????? ??????????????"},"relativeTime":{"future":{"one":"{0} ???????? ????????????","other":"{0} ???????? ????????????"},"past":{"one":"{0} ???????? ????????????","other":"{0} ???????? ????????????"}}},"day":{"displayName":"????","relative":{"0":"????????????","1":"??????????","-1":"??????????????"},"relativeTime":{"future":{"one":"{0} ???? ????????????","other":"{0} ???? ????????????"},"past":{"one":"{0} ???? ????????????","other":"{0} ???? ????????????"}}},"hour":{"displayName":"??????????","relativeTime":{"future":{"one":"{0} ?????????? ????????????","other":"{0} ?????????? ????????????"},"past":{"one":"{0} ?????????? ????????????","other":"{0} ?????????? ????????????"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"one":"{0} ?????????? ??????????","other":"{0} ?????????? ??????????"},"past":{"one":"{0} ?????????? ????????????","other":"{0} ?????????? ????????????"}}},"second":{"displayName":"????????????","relative":{"0":"now"},"relativeTime":{"future":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"},"past":{"one":"{0} ???????????? ????????????","other":"{0} ???????????? ????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"cgg","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Omwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Omwezi","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Eizooba","relative":{"0":"Erizooba","1":"Nyenkyakare","-1":"Nyomwabazyo"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Shaaha","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Edakiika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Obucweka\u002FEsekendi","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"chr","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"???????????????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"?????????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"??????","relative":{"0":"?????? ??????","1":"????????????","-1":"??????"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"????????????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"?????????????????????","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"?????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ckb","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ckb-IR","parentLocale":"ckb"});

IntlRelativeFormat.__addLocaleData({"locale":"cs","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],v0=!s[1];if(ord)return"other";return n==1&&v0?"one":i>=2&&i<=4&&v0?"few":!v0?"many":"other"},"fields":{"year":{"displayName":"rok","relative":{"0":"tento rok","1":"p??????t?? rok","-1":"minul?? rok"},"relativeTime":{"future":{"one":"za {0} rok","few":"za {0} roky","many":"za {0} roku","other":"za {0} let"},"past":{"one":"p??ed {0} rokem","few":"p??ed {0} lety","many":"p??ed {0} rokem","other":"p??ed {0} lety"}}},"month":{"displayName":"m??s??c","relative":{"0":"tento m??s??c","1":"p??????t?? m??s??c","-1":"minul?? m??s??c"},"relativeTime":{"future":{"one":"za {0} m??s??c","few":"za {0} m??s??ce","many":"za {0} m??s??ce","other":"za {0} m??s??c??"},"past":{"one":"p??ed {0} m??s??cem","few":"p??ed {0} m??s??ci","many":"p??ed {0} m??s??cem","other":"p??ed {0} m??s??ci"}}},"day":{"displayName":"den","relative":{"0":"dnes","1":"z??tra","2":"poz??t????","-2":"p??edev????rem","-1":"v??era"},"relativeTime":{"future":{"one":"za {0} den","few":"za {0} dny","many":"za {0} dne","other":"za {0} dn??"},"past":{"one":"p??ed {0} dnem","few":"p??ed {0} dny","many":"p??ed {0} dnem","other":"p??ed {0} dny"}}},"hour":{"displayName":"hodina","relativeTime":{"future":{"one":"za {0} hodinu","few":"za {0} hodiny","many":"za {0} hodiny","other":"za {0} hodin"},"past":{"one":"p??ed {0} hodinou","few":"p??ed {0} hodinami","many":"p??ed {0} hodinou","other":"p??ed {0} hodinami"}}},"minute":{"displayName":"minuta","relativeTime":{"future":{"one":"za {0} minutu","few":"za {0} minuty","many":"za {0} minuty","other":"za {0} minut"},"past":{"one":"p??ed {0} minutou","few":"p??ed {0} minutami","many":"p??ed {0} minutou","other":"p??ed {0} minutami"}}},"second":{"displayName":"sekunda","relative":{"0":"nyn??"},"relativeTime":{"future":{"one":"za {0} sekundu","few":"za {0} sekundy","many":"za {0} sekundy","other":"za {0} sekund"},"past":{"one":"p??ed {0} sekundou","few":"p??ed {0} sekundami","many":"p??ed {0} sekundou","other":"p??ed {0} sekundami"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"cu","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"cy","pluralRuleFunction":function (n,ord){if(ord)return n==0||n==7||n==8||n==9?"zero":n==1?"one":n==2?"two":n==3||n==4?"few":n==5||n==6?"many":"other";return n==0?"zero":n==1?"one":n==2?"two":n==3?"few":n==6?"many":"other"},"fields":{"year":{"displayName":"blwyddyn","relative":{"0":"eleni","1":"blwyddyn nesaf","-1":"llynedd"},"relativeTime":{"future":{"zero":"ymhen {0} mlynedd","one":"ymhen blwyddyn","two":"ymhen {0} flynedd","few":"ymhen {0} blynedd","many":"ymhen {0} blynedd","other":"ymhen {0} mlynedd"},"past":{"zero":"{0} o flynyddoedd yn ??l","one":"blwyddyn yn ??l","two":"{0} flynedd yn ??l","few":"{0} blynedd yn ??l","many":"{0} blynedd yn ??l","other":"{0} o flynyddoedd yn ??l"}}},"month":{"displayName":"mis","relative":{"0":"y mis hwn","1":"mis nesaf","-1":"mis diwethaf"},"relativeTime":{"future":{"zero":"ymhen {0} mis","one":"ymhen mis","two":"ymhen deufis","few":"ymhen {0} mis","many":"ymhen {0} mis","other":"ymhen {0} mis"},"past":{"zero":"{0} mis yn ??l","one":"{0} mis yn ??l","two":"{0} fis yn ??l","few":"{0} mis yn ??l","many":"{0} mis yn ??l","other":"{0} mis yn ??l"}}},"day":{"displayName":"dydd","relative":{"0":"heddiw","1":"yfory","2":"drennydd","-2":"echdoe","-1":"ddoe"},"relativeTime":{"future":{"zero":"ymhen {0} diwrnod","one":"ymhen diwrnod","two":"ymhen deuddydd","few":"ymhen tridiau","many":"ymhen {0} diwrnod","other":"ymhen {0} diwrnod"},"past":{"zero":"{0} diwrnod yn ??l","one":"{0} diwrnod yn ??l","two":"{0} ddiwrnod yn ??l","few":"{0} diwrnod yn ??l","many":"{0} diwrnod yn ??l","other":"{0} diwrnod yn ??l"}}},"hour":{"displayName":"awr","relativeTime":{"future":{"zero":"ymhen {0} awr","one":"ymhen awr","two":"ymhen {0} awr","few":"ymhen {0} awr","many":"ymhen {0} awr","other":"ymhen {0} awr"},"past":{"zero":"{0} awr yn ??l","one":"awr yn ??l","two":"{0} awr yn ??l","few":"{0} awr yn ??l","many":"{0} awr yn ??l","other":"{0} awr yn ??l"}}},"minute":{"displayName":"munud","relativeTime":{"future":{"zero":"ymhen {0} munud","one":"ymhen munud","two":"ymhen {0} funud","few":"ymhen {0} munud","many":"ymhen {0} munud","other":"ymhen {0} munud"},"past":{"zero":"{0} munud yn ??l","one":"{0} munud yn ??l","two":"{0} funud yn ??l","few":"{0} munud yn ??l","many":"{0} munud yn ??l","other":"{0} munud yn ??l"}}},"second":{"displayName":"eiliad","relative":{"0":"nawr"},"relativeTime":{"future":{"zero":"ymhen {0} eiliad","one":"ymhen eiliad","two":"ymhen {0} eiliad","few":"ymhen {0} eiliad","many":"ymhen {0} eiliad","other":"ymhen {0} eiliad"},"past":{"zero":"{0} eiliad yn ??l","one":"eiliad yn ??l","two":"{0} eiliad yn ??l","few":"{0} eiliad yn ??l","many":"{0} eiliad yn ??l","other":"{0} eiliad yn ??l"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"da","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],t0=Number(s[0])==n;if(ord)return"other";return n==1||!t0&&(i==0||i==1)?"one":"other"},"fields":{"year":{"displayName":"??r","relative":{"0":"i ??r","1":"n??ste ??r","-1":"sidste ??r"},"relativeTime":{"future":{"one":"om {0} ??r","other":"om {0} ??r"},"past":{"one":"for {0} ??r siden","other":"for {0} ??r siden"}}},"month":{"displayName":"m??ned","relative":{"0":"denne m??ned","1":"n??ste m??ned","-1":"sidste m??ned"},"relativeTime":{"future":{"one":"om {0} m??ned","other":"om {0} m??neder"},"past":{"one":"for {0} m??ned siden","other":"for {0} m??neder siden"}}},"day":{"displayName":"dag","relative":{"0":"i dag","1":"i morgen","2":"i overmorgen","-2":"i forg??rs","-1":"i g??r"},"relativeTime":{"future":{"one":"om {0} dag","other":"om {0} dage"},"past":{"one":"for {0} dag siden","other":"for {0} dage siden"}}},"hour":{"displayName":"time","relativeTime":{"future":{"one":"om {0} time","other":"om {0} timer"},"past":{"one":"for {0} time siden","other":"for {0} timer siden"}}},"minute":{"displayName":"minut","relativeTime":{"future":{"one":"om {0} minut","other":"om {0} minutter"},"past":{"one":"for {0} minut siden","other":"for {0} minutter siden"}}},"second":{"displayName":"sekund","relative":{"0":"nu"},"relativeTime":{"future":{"one":"om {0} sekund","other":"om {0} sekunder"},"past":{"one":"for {0} sekund siden","other":"for {0} sekunder siden"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"da-GL","parentLocale":"da"});

IntlRelativeFormat.__addLocaleData({"locale":"dav","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Mwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mori","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Ituku","relative":{"0":"Idime","1":"Kesho","-1":"Iguo"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Saa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Dakika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"de","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"Jahr","relative":{"0":"dieses Jahr","1":"n??chstes Jahr","-1":"letztes Jahr"},"relativeTime":{"future":{"one":"in {0} Jahr","other":"in {0} Jahren"},"past":{"one":"vor {0} Jahr","other":"vor {0} Jahren"}}},"month":{"displayName":"Monat","relative":{"0":"diesen Monat","1":"n??chsten Monat","-1":"letzten Monat"},"relativeTime":{"future":{"one":"in {0} Monat","other":"in {0} Monaten"},"past":{"one":"vor {0} Monat","other":"vor {0} Monaten"}}},"day":{"displayName":"Tag","relative":{"0":"heute","1":"morgen","2":"??bermorgen","-2":"vorgestern","-1":"gestern"},"relativeTime":{"future":{"one":"in {0} Tag","other":"in {0} Tagen"},"past":{"one":"vor {0} Tag","other":"vor {0} Tagen"}}},"hour":{"displayName":"Stunde","relativeTime":{"future":{"one":"in {0} Stunde","other":"in {0} Stunden"},"past":{"one":"vor {0} Stunde","other":"vor {0} Stunden"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"one":"in {0} Minute","other":"in {0} Minuten"},"past":{"one":"vor {0} Minute","other":"vor {0} Minuten"}}},"second":{"displayName":"Sekunde","relative":{"0":"jetzt"},"relativeTime":{"future":{"one":"in {0} Sekunde","other":"in {0} Sekunden"},"past":{"one":"vor {0} Sekunde","other":"vor {0} Sekunden"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"de-AT","parentLocale":"de"});
IntlRelativeFormat.__addLocaleData({"locale":"de-BE","parentLocale":"de"});
IntlRelativeFormat.__addLocaleData({"locale":"de-CH","parentLocale":"de"});
IntlRelativeFormat.__addLocaleData({"locale":"de-LI","parentLocale":"de"});
IntlRelativeFormat.__addLocaleData({"locale":"de-LU","parentLocale":"de"});

IntlRelativeFormat.__addLocaleData({"locale":"dje","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Jiiri","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Handu","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Zaari","relative":{"0":"H??o","1":"Suba","-1":"Bi"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Guuru","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Miniti","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Miti","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"dsb","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],f=s[1]||"",v0=!s[1],i100=i.slice(-2),f100=f.slice(-2);if(ord)return"other";return v0&&i100==1||f100==1?"one":v0&&i100==2||f100==2?"two":v0&&(i100==3||i100==4)||(f100==3||f100==4)?"few":"other"},"fields":{"year":{"displayName":"l??to","relative":{"0":"l??tosa","1":"znowa","-1":"??oni"},"relativeTime":{"future":{"one":"za {0} l??to","two":"za {0} l????e","few":"za {0} l??ta","other":"za {0} l??t"},"past":{"one":"p??ed {0} l??tom","two":"p??ed {0} l??toma","few":"p??ed {0} l??tami","other":"p??ed {0} l??tami"}}},"month":{"displayName":"mjasec","relative":{"0":"ten mjasec","1":"p??iducy mjasec","-1":"sl??dny mjasec"},"relativeTime":{"future":{"one":"za {0} mjasec","two":"za {0} mjaseca","few":"za {0} mjasecy","other":"za {0} mjasecow"},"past":{"one":"p??ed {0} mjasecom","two":"p??ed {0} mjasecoma","few":"p??ed {0} mjasecami","other":"p??ed {0} mjasecami"}}},"day":{"displayName":"??e??","relative":{"0":"??insa","1":"wit??e","-1":"cora"},"relativeTime":{"future":{"one":"za {0} ??e??","two":"za {0} dnja","few":"za {0} dny","other":"za {0} dnjow"},"past":{"one":"p??ed {0} dnjom","two":"p??ed {0} dnjoma","few":"p??ed {0} dnjami","other":"p??ed {0} dnjami"}}},"hour":{"displayName":"g????ina","relativeTime":{"future":{"one":"za {0} g????inu","two":"za {0} g????inje","few":"za {0} g????iny","other":"za {0} g????in"},"past":{"one":"p??ed {0} g????inu","two":"p??ed {0} g????inoma","few":"p??ed {0} g????inami","other":"p??ed {0} g????inami"}}},"minute":{"displayName":"minuta","relativeTime":{"future":{"one":"za {0} minutu","two":"za {0} minu??e","few":"za {0} minuty","other":"za {0} minutow"},"past":{"one":"p??ed {0} minutu","two":"p??ed {0} minutoma","few":"p??ed {0} minutami","other":"p??ed {0} minutami"}}},"second":{"displayName":"sekunda","relative":{"0":"now"},"relativeTime":{"future":{"one":"za {0} sekundu","two":"za {0} sekun??e","few":"za {0} sekundy","other":"za {0} sekundow"},"past":{"one":"p??ed {0} sekundu","two":"p??ed {0} sekundoma","few":"p??ed {0} sekundami","other":"p??ed {0} sekundami"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"dua","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"mb??","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"m????di","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"b??ny??","relative":{"0":"w??????g????","1":"k????l??","-1":"k????l?? n??t??mb????"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"??gand??","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"nd??k??","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"p??nd??","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"dv","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"dyo","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Emit","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Fulee??","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Funak","relative":{"0":"Jaat","1":"Kajom","-1":"Fucen"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"dz","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"???????????????????????? {0} ?????????"},"past":{"other":"???????????????????????? {0} ???????????????"}}},"month":{"displayName":"???????????????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"???????????? {0} ?????????"},"past":{"other":"???????????? {0} ???????????????"}}},"day":{"displayName":"????????????","relative":{"0":"??????????????????","1":"??????????????????","2":"?????????????????????","-2":"???????????????","-1":"????????????"},"relativeTime":{"future":{"other":"??????????????? {0} ?????????"},"past":{"other":"??????????????? {0} ???????????????"}}},"hour":{"displayName":"??????????????????","relativeTime":{"future":{"other":"????????????????????? {0} ?????????"},"past":{"other":"????????????????????? {0} ???????????????"}}},"minute":{"displayName":"???????????????","relativeTime":{"future":{"other":"?????????????????? {0} ?????????"},"past":{"other":"?????????????????? {0} ???????????????"}}},"second":{"displayName":"?????????????????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"?????????????????? {0} ?????????"},"past":{"other":"?????????????????? {0} ???????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ebu","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Mwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mweri","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"M??thenya","relative":{"0":"??m??nth??","1":"R??ci??","-1":"??goro"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Ithaa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Ndag??ka","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekondi","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ee","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"??e","relative":{"0":"??e sia","1":"??e si gb?? na","-1":"??e si va yi"},"relativeTime":{"future":{"one":"le ??e {0} me","other":"le ??e {0} me"},"past":{"one":"??e {0} si va yi","other":"??e {0} si wo va yi"}}},"month":{"displayName":"??leti","relative":{"0":"??leti sia","1":"??leti si gb?? na","-1":"??leti si va yi"},"relativeTime":{"future":{"one":"le ??leti {0} me","other":"le ??leti {0} wo me"},"past":{"one":"??leti {0} si va yi","other":"??leti {0} si wo va yi"}}},"day":{"displayName":"??keke","relative":{"0":"egbe","1":"ets?? si gb??na","2":"nyits?? si gb??na","-2":"nyits?? si va yi","-1":"ets?? si va yi"},"relativeTime":{"future":{"one":"le ??keke {0} me","other":"le ??keke {0} wo me"},"past":{"one":"??keke {0} si va yi","other":"??keke {0} si wo va yi"}}},"hour":{"displayName":"ga??o??o","relativeTime":{"future":{"one":"le ga??o??o {0} me","other":"le ga??o??o {0} wo me"},"past":{"one":"ga??o??o {0} si va yi","other":"ga??o??o {0} si wo va yi"}}},"minute":{"displayName":"a??aba??o??o","relativeTime":{"future":{"one":"le a??aba??o??o {0} me","other":"le a??aba??o??o {0} wo me"},"past":{"one":"a??aba??o??o {0} si va yi","other":"a??aba??o??o {0} si wo va yi"}}},"second":{"displayName":"sekend","relative":{"0":"fifi"},"relativeTime":{"future":{"one":"le sekend {0} me","other":"le sekend {0} wo me"},"past":{"one":"sekend {0} si va yi","other":"sekend {0} si wo va yi"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ee-TG","parentLocale":"ee"});

IntlRelativeFormat.__addLocaleData({"locale":"el","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"????????","relative":{"0":"??????????","1":"?????????????? ????????","-1":"??????????"},"relativeTime":{"future":{"one":"???? {0} ????????","other":"???? {0} ??????"},"past":{"one":"???????? ?????? {0} ????????","other":"???????? ?????? {0} ??????"}}},"month":{"displayName":"??????????","relative":{"0":"???????????? ??????????","1":"???????????????? ??????????","-1":"???????????????????????? ??????????"},"relativeTime":{"future":{"one":"???? {0} ????????","other":"???? {0} ??????????"},"past":{"one":"???????? ?????? {0} ????????","other":"???????? ?????? {0} ??????????"}}},"day":{"displayName":"??????????","relative":{"0":"????????????","1":"??????????","2":"????????????????","-2":"??????????????","-1":"????????"},"relativeTime":{"future":{"one":"???? {0} ??????????","other":"???? {0} ????????????"},"past":{"one":"???????? ?????? {0} ??????????","other":"???????? ?????? {0} ????????????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"one":"???? {0} ??????","other":"???? {0} ????????"},"past":{"one":"???????? ?????? {0} ??????","other":"???????? ?????? {0} ????????"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"one":"???? {0} ??????????","other":"???? {0} ??????????"},"past":{"one":"???????? ?????? {0} ??????????","other":"???????? ?????? {0} ??????????"}}},"second":{"displayName":"????????????????????????","relative":{"0":"????????"},"relativeTime":{"future":{"one":"???? {0} ????????????????????????","other":"???? {0} ????????????????????????"},"past":{"one":"???????? ?????? {0} ????????????????????????","other":"???????? ?????? {0} ????????????????????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"el-CY","parentLocale":"el"});

IntlRelativeFormat.__addLocaleData({"locale":"en","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1],t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2);if(ord)return n10==1&&n100!=11?"one":n10==2&&n100!=12?"two":n10==3&&n100!=13?"few":"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"one":"in {0} year","other":"in {0} years"},"past":{"one":"{0} year ago","other":"{0} years ago"}}},"month":{"displayName":"month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"one":"in {0} month","other":"in {0} months"},"past":{"one":"{0} month ago","other":"{0} months ago"}}},"day":{"displayName":"day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"one":"in {0} day","other":"in {0} days"},"past":{"one":"{0} day ago","other":"{0} days ago"}}},"hour":{"displayName":"hour","relativeTime":{"future":{"one":"in {0} hour","other":"in {0} hours"},"past":{"one":"{0} hour ago","other":"{0} hours ago"}}},"minute":{"displayName":"minute","relativeTime":{"future":{"one":"in {0} minute","other":"in {0} minutes"},"past":{"one":"{0} minute ago","other":"{0} minutes ago"}}},"second":{"displayName":"second","relative":{"0":"now"},"relativeTime":{"future":{"one":"in {0} second","other":"in {0} seconds"},"past":{"one":"{0} second ago","other":"{0} seconds ago"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"en-001","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-150","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-AG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-AI","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-AS","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-AT","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-AU","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BB","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BE","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BI","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BS","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BW","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BZ","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CA","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CC","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CH","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CK","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CX","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CY","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-DE","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-DG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-DK","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-DM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-Dsrt","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"en-ER","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-FI","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-FJ","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-FK","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-FM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GB","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GD","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GH","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GI","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GU","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GY","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-HK","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-IE","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-IL","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-IM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-IN","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-IO","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-JE","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-JM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-KE","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-KI","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-KN","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-KY","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-LC","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-LR","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-LS","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MH","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MO","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MP","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MS","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MT","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MU","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MW","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MY","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NA","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NF","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NL","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NR","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NU","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NZ","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-PG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-PH","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-PK","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-PN","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-PR","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-PW","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-RW","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SB","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SC","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SD","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SE","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SH","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SI","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SL","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SS","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SX","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SZ","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-Shaw","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"en-TC","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-TK","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-TO","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-TT","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-TV","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-TZ","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-UG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-UM","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-US","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-VC","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-VG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-VI","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-VU","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-WS","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-ZA","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-ZM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-ZW","parentLocale":"en-001"});

IntlRelativeFormat.__addLocaleData({"locale":"eo","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"es","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"a??o","relative":{"0":"este a??o","1":"el pr??ximo a??o","-1":"el a??o pasado"},"relativeTime":{"future":{"one":"dentro de {0} a??o","other":"dentro de {0} a??os"},"past":{"one":"hace {0} a??o","other":"hace {0} a??os"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el pr??ximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"d??a","relative":{"0":"hoy","1":"ma??ana","2":"pasado ma??ana","-2":"anteayer","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} d??a","other":"dentro de {0} d??as"},"past":{"one":"hace {0} d??a","other":"hace {0} d??as"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-419","parentLocale":"es"});
IntlRelativeFormat.__addLocaleData({"locale":"es-AR","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-BO","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-CL","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-CO","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-CR","parentLocale":"es-419","fields":{"year":{"displayName":"a??o","relative":{"0":"este a??o","1":"el pr??ximo a??o","-1":"el a??o pasado"},"relativeTime":{"future":{"one":"dentro de {0} a??o","other":"dentro de {0} a??os"},"past":{"one":"hace {0} a??o","other":"hace {0} a??os"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el pr??ximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"d??a","relative":{"0":"hoy","1":"ma??ana","2":"pasado ma??ana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} d??a","other":"dentro de {0} d??as"},"past":{"one":"hace {0} d??a","other":"hace {0} d??as"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-CU","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-DO","parentLocale":"es-419","fields":{"year":{"displayName":"A??o","relative":{"0":"este a??o","1":"el pr??ximo a??o","-1":"el a??o pasado"},"relativeTime":{"future":{"one":"dentro de {0} a??o","other":"dentro de {0} a??os"},"past":{"one":"hace {0} a??o","other":"hace {0} a??os"}}},"month":{"displayName":"Mes","relative":{"0":"este mes","1":"el pr??ximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"D??a","relative":{"0":"hoy","1":"ma??ana","2":"pasado ma??ana","-2":"anteayer","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} d??a","other":"dentro de {0} d??as"},"past":{"one":"hace {0} d??a","other":"hace {0} d??as"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"Minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"Segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-EA","parentLocale":"es"});
IntlRelativeFormat.__addLocaleData({"locale":"es-EC","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-GQ","parentLocale":"es"});
IntlRelativeFormat.__addLocaleData({"locale":"es-GT","parentLocale":"es-419","fields":{"year":{"displayName":"a??o","relative":{"0":"este a??o","1":"el pr??ximo a??o","-1":"el a??o pasado"},"relativeTime":{"future":{"one":"dentro de {0} a??o","other":"dentro de {0} a??os"},"past":{"one":"hace {0} a??o","other":"hace {0} a??os"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el pr??ximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"d??a","relative":{"0":"hoy","1":"ma??ana","2":"pasado ma??ana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} d??a","other":"dentro de {0} d??as"},"past":{"one":"hace {0} d??a","other":"hace {0} d??as"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-HN","parentLocale":"es-419","fields":{"year":{"displayName":"a??o","relative":{"0":"este a??o","1":"el pr??ximo a??o","-1":"el a??o pasado"},"relativeTime":{"future":{"one":"dentro de {0} a??o","other":"dentro de {0} a??os"},"past":{"one":"hace {0} a??o","other":"hace {0} a??os"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el pr??ximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"d??a","relative":{"0":"hoy","1":"ma??ana","2":"pasado ma??ana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} d??a","other":"dentro de {0} d??as"},"past":{"one":"hace {0} d??a","other":"hace {0} d??as"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-IC","parentLocale":"es"});
IntlRelativeFormat.__addLocaleData({"locale":"es-MX","parentLocale":"es-419","fields":{"year":{"displayName":"a??o","relative":{"0":"este a??o","1":"el a??o pr??ximo","-1":"el a??o pasado"},"relativeTime":{"future":{"one":"dentro de {0} a??o","other":"dentro de {0} a??os"},"past":{"one":"hace {0} a??o","other":"hace {0} a??os"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el mes pr??ximo","-1":"el mes pasado"},"relativeTime":{"future":{"one":"en {0} mes","other":"en {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"d??a","relative":{"0":"hoy","1":"ma??ana","2":"pasado ma??ana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} d??a","other":"dentro de {0} d??as"},"past":{"one":"hace {0} d??a","other":"hace {0} d??as"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-NI","parentLocale":"es-419","fields":{"year":{"displayName":"a??o","relative":{"0":"este a??o","1":"el pr??ximo a??o","-1":"el a??o pasado"},"relativeTime":{"future":{"one":"dentro de {0} a??o","other":"dentro de {0} a??os"},"past":{"one":"hace {0} a??o","other":"hace {0} a??os"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el pr??ximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"d??a","relative":{"0":"hoy","1":"ma??ana","2":"pasado ma??ana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} d??a","other":"dentro de {0} d??as"},"past":{"one":"hace {0} d??a","other":"hace {0} d??as"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-PA","parentLocale":"es-419","fields":{"year":{"displayName":"a??o","relative":{"0":"este a??o","1":"el pr??ximo a??o","-1":"el a??o pasado"},"relativeTime":{"future":{"one":"dentro de {0} a??o","other":"dentro de {0} a??os"},"past":{"one":"hace {0} a??o","other":"hace {0} a??os"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el pr??ximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"d??a","relative":{"0":"hoy","1":"ma??ana","2":"pasado ma??ana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} d??a","other":"dentro de {0} d??as"},"past":{"one":"hace {0} d??a","other":"hace {0} d??as"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-PE","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-PH","parentLocale":"es"});
IntlRelativeFormat.__addLocaleData({"locale":"es-PR","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-PY","parentLocale":"es-419","fields":{"year":{"displayName":"a??o","relative":{"0":"este a??o","1":"el pr??ximo a??o","-1":"el a??o pasado"},"relativeTime":{"future":{"one":"dentro de {0} a??o","other":"dentro de {0} a??os"},"past":{"one":"hace {0} a??o","other":"hace {0} a??os"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el pr??ximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"d??a","relative":{"0":"hoy","1":"ma??ana","2":"pasado ma??ana","-2":"antes de ayer","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} d??a","other":"dentro de {0} d??as"},"past":{"one":"hace {0} d??a","other":"hace {0} d??as"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-SV","parentLocale":"es-419","fields":{"year":{"displayName":"a??o","relative":{"0":"este a??o","1":"el pr??ximo a??o","-1":"el a??o pasado"},"relativeTime":{"future":{"one":"dentro de {0} a??o","other":"dentro de {0} a??os"},"past":{"one":"hace {0} a??o","other":"hace {0} a??os"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el pr??ximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"d??a","relative":{"0":"hoy","1":"ma??ana","2":"pasado ma??ana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} d??a","other":"dentro de {0} d??as"},"past":{"one":"hace {0} d??a","other":"hace {0} d??as"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-US","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-UY","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-VE","parentLocale":"es-419"});

IntlRelativeFormat.__addLocaleData({"locale":"et","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"aasta","relative":{"0":"k??esolev aasta","1":"j??rgmine aasta","-1":"eelmine aasta"},"relativeTime":{"future":{"one":"{0} aasta p??rast","other":"{0} aasta p??rast"},"past":{"one":"{0} aasta eest","other":"{0} aasta eest"}}},"month":{"displayName":"kuu","relative":{"0":"k??esolev kuu","1":"j??rgmine kuu","-1":"eelmine kuu"},"relativeTime":{"future":{"one":"{0} kuu p??rast","other":"{0} kuu p??rast"},"past":{"one":"{0} kuu eest","other":"{0} kuu eest"}}},"day":{"displayName":"p??ev","relative":{"0":"t??na","1":"homme","2":"??lehomme","-2":"??leeile","-1":"eile"},"relativeTime":{"future":{"one":"{0} p??eva p??rast","other":"{0} p??eva p??rast"},"past":{"one":"{0} p??eva eest","other":"{0} p??eva eest"}}},"hour":{"displayName":"tund","relativeTime":{"future":{"one":"{0} tunni p??rast","other":"{0} tunni p??rast"},"past":{"one":"{0} tunni eest","other":"{0} tunni eest"}}},"minute":{"displayName":"minut","relativeTime":{"future":{"one":"{0} minuti p??rast","other":"{0} minuti p??rast"},"past":{"one":"{0} minuti eest","other":"{0} minuti eest"}}},"second":{"displayName":"sekund","relative":{"0":"n????d"},"relativeTime":{"future":{"one":"{0} sekundi p??rast","other":"{0} sekundi p??rast"},"past":{"one":"{0} sekundi eest","other":"{0} sekundi eest"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"eu","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Urtea","relative":{"0":"aurten","1":"hurrengo urtea","-1":"aurreko urtea"},"relativeTime":{"future":{"one":"{0} urte barru","other":"{0} urte barru"},"past":{"one":"Duela {0} urte","other":"Duela {0} urte"}}},"month":{"displayName":"Hilabetea","relative":{"0":"hilabete hau","1":"hurrengo hilabetea","-1":"aurreko hilabetea"},"relativeTime":{"future":{"one":"{0} hilabete barru","other":"{0} hilabete barru"},"past":{"one":"Duela {0} hilabete","other":"Duela {0} hilabete"}}},"day":{"displayName":"Eguna","relative":{"0":"gaur","1":"bihar","2":"etzi","-2":"herenegun","-1":"atzo"},"relativeTime":{"future":{"one":"{0} egun barru","other":"{0} egun barru"},"past":{"one":"Duela {0} egun","other":"Duela {0} egun"}}},"hour":{"displayName":"Ordua","relativeTime":{"future":{"one":"{0} ordu barru","other":"{0} ordu barru"},"past":{"one":"Duela {0} ordu","other":"Duela {0} ordu"}}},"minute":{"displayName":"Minutua","relativeTime":{"future":{"one":"{0} minutu barru","other":"{0} minutu barru"},"past":{"one":"Duela {0} minutu","other":"Duela {0} minutu"}}},"second":{"displayName":"Segundoa","relative":{"0":"orain"},"relativeTime":{"future":{"one":"{0} segundo barru","other":"{0} segundo barru"},"past":{"one":"Duela {0} segundo","other":"Duela {0} segundo"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ewo","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"M??b??","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Ng??n","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Am??s","relative":{"0":"An??","1":"Ok??r??","-1":"Angog??"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Awola","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"En??t??n","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Ak??b??ga","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"fa","pluralRuleFunction":function (n,ord){if(ord)return"other";return n>=0&&n<=1?"one":"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"??????????","1":"?????? ??????????","-1":"?????? ??????????"},"relativeTime":{"future":{"one":"{0} ?????? ??????","other":"{0} ?????? ??????"},"past":{"one":"{0} ?????? ??????","other":"{0} ?????? ??????"}}},"month":{"displayName":"??????","relative":{"0":"?????? ??????","1":"?????? ??????????","-1":"?????? ??????????"},"relativeTime":{"future":{"one":"{0} ?????? ??????","other":"{0} ?????? ??????"},"past":{"one":"{0} ?????? ??????","other":"{0} ?????? ??????"}}},"day":{"displayName":"??????","relative":{"0":"??????????","1":"????????","2":"???????????????","-2":"????????????","-1":"??????????"},"relativeTime":{"future":{"one":"{0} ?????? ??????","other":"{0} ?????? ??????"},"past":{"one":"{0} ?????? ??????","other":"{0} ?????? ??????"}}},"hour":{"displayName":"????????","relativeTime":{"future":{"one":"{0} ???????? ??????","other":"{0} ???????? ??????"},"past":{"one":"{0} ???????? ??????","other":"{0} ???????? ??????"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"one":"{0} ?????????? ??????","other":"{0} ?????????? ??????"},"past":{"one":"{0} ?????????? ??????","other":"{0} ?????????? ??????"}}},"second":{"displayName":"??????????","relative":{"0":"??????????"},"relativeTime":{"future":{"one":"{0} ?????????? ??????","other":"{0} ?????????? ??????"},"past":{"one":"{0} ?????????? ??????","other":"{0} ?????????? ??????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"fa-AF","parentLocale":"fa"});

IntlRelativeFormat.__addLocaleData({"locale":"ff","pluralRuleFunction":function (n,ord){if(ord)return"other";return n>=0&&n<2?"one":"other"},"fields":{"year":{"displayName":"Hitaande","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Lewru","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"??alnde","relative":{"0":"Hannde","1":"Ja??ngo","-1":"Ha??ki"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Waktu","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Ho??om","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Majaango","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ff-CM","parentLocale":"ff"});
IntlRelativeFormat.__addLocaleData({"locale":"ff-GN","parentLocale":"ff"});
IntlRelativeFormat.__addLocaleData({"locale":"ff-MR","parentLocale":"ff"});

IntlRelativeFormat.__addLocaleData({"locale":"fi","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"vuosi","relative":{"0":"t??n?? vuonna","1":"ensi vuonna","-1":"viime vuonna"},"relativeTime":{"future":{"one":"{0} vuoden p????st??","other":"{0} vuoden p????st??"},"past":{"one":"{0} vuosi sitten","other":"{0} vuotta sitten"}}},"month":{"displayName":"kuukausi","relative":{"0":"t??ss?? kuussa","1":"ensi kuussa","-1":"viime kuussa"},"relativeTime":{"future":{"one":"{0} kuukauden p????st??","other":"{0} kuukauden p????st??"},"past":{"one":"{0} kuukausi sitten","other":"{0} kuukautta sitten"}}},"day":{"displayName":"p??iv??","relative":{"0":"t??n????n","1":"huomenna","2":"ylihuomenna","-2":"toissa p??iv??n??","-1":"eilen"},"relativeTime":{"future":{"one":"{0} p??iv??n p????st??","other":"{0} p??iv??n p????st??"},"past":{"one":"{0} p??iv?? sitten","other":"{0} p??iv???? sitten"}}},"hour":{"displayName":"tunti","relativeTime":{"future":{"one":"{0} tunnin p????st??","other":"{0} tunnin p????st??"},"past":{"one":"{0} tunti sitten","other":"{0} tuntia sitten"}}},"minute":{"displayName":"minuutti","relativeTime":{"future":{"one":"{0} minuutin p????st??","other":"{0} minuutin p????st??"},"past":{"one":"{0} minuutti sitten","other":"{0} minuuttia sitten"}}},"second":{"displayName":"sekunti","relative":{"0":"nyt"},"relativeTime":{"future":{"one":"{0} sekunnin p????st??","other":"{0} sekunnin p????st??"},"past":{"one":"{0} sekunti sitten","other":"{0} sekuntia sitten"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"fil","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],f=s[1]||"",v0=!s[1],i10=i.slice(-1),f10=f.slice(-1);if(ord)return n==1?"one":"other";return v0&&(i==1||i==2||i==3)||v0&&i10!=4&&i10!=6&&i10!=9||!v0&&f10!=4&&f10!=6&&f10!=9?"one":"other"},"fields":{"year":{"displayName":"taon","relative":{"0":"ngayong taon","1":"susunod na taon","-1":"nakaraang taon"},"relativeTime":{"future":{"one":"sa {0} taon","other":"sa {0} (na) taon"},"past":{"one":"{0} taon ang nakalipas","other":"{0} (na) taon ang nakalipas"}}},"month":{"displayName":"buwan","relative":{"0":"ngayong buwan","1":"susunod na buwan","-1":"nakaraang buwan"},"relativeTime":{"future":{"one":"sa {0} buwan","other":"sa {0} (na) buwan"},"past":{"one":"{0} buwan ang nakalipas","other":"{0} (na) buwan ang nakalipas"}}},"day":{"displayName":"araw","relative":{"0":"ngayong araw","1":"bukas","2":"Samakalawa","-2":"Araw bago ang kahapon","-1":"kahapon"},"relativeTime":{"future":{"one":"sa {0} araw","other":"sa {0} (na) araw"},"past":{"one":"{0} araw ang nakalipas","other":"{0} (na) araw ang nakalipas"}}},"hour":{"displayName":"oras","relativeTime":{"future":{"one":"sa {0} oras","other":"sa {0} (na) oras"},"past":{"one":"{0} oras ang nakalipas","other":"{0} (na) oras ang nakalipas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"sa {0} minuto","other":"sa {0} (na) minuto"},"past":{"one":"{0} minuto ang nakalipas","other":"{0} (na) minuto ang nakalipas"}}},"second":{"displayName":"segundo","relative":{"0":"ngayon"},"relativeTime":{"future":{"one":"sa {0} segundo","other":"sa {0} (na) segundo"},"past":{"one":"{0} segundo ang nakalipas","other":"{0} (na) segundo ang nakalipas"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"fo","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"??r","relative":{"0":"?? ??r","1":"n??sta ??r","-1":"?? fj??r"},"relativeTime":{"future":{"one":"um {0} ??r","other":"um {0} ??r"},"past":{"one":"{0} ??r s????an","other":"{0} ??r s????an"}}},"month":{"displayName":"m??na??ur","relative":{"0":"henda m??na??in","1":"n??sta m??na??","-1":"seinasta m??na??"},"relativeTime":{"future":{"one":"um {0} m??na??","other":"um {0} m??na??ir"},"past":{"one":"{0} m??na?? s????an","other":"{0} m??na??ir s????an"}}},"day":{"displayName":"dagur","relative":{"0":"?? dag","1":"?? morgin","2":"?? ovurmorgin","-2":"fyrradagin","-1":"?? gj??r"},"relativeTime":{"future":{"one":"um {0} dag","other":"um {0} dagar"},"past":{"one":"{0} dagur s????an","other":"{0} dagar s????an"}}},"hour":{"displayName":"t??mi","relativeTime":{"future":{"one":"um {0} t??ma","other":"um {0} t??mar"},"past":{"one":"{0} t??mi s????an","other":"{0} t??mar s????an"}}},"minute":{"displayName":"minuttur","relativeTime":{"future":{"one":"um {0} minutt","other":"um {0} minuttir"},"past":{"one":"{0} minutt s????an","other":"{0} minuttir s????an"}}},"second":{"displayName":"sekund","relative":{"0":"now"},"relativeTime":{"future":{"one":"um {0} sekund","other":"um {0} sekund"},"past":{"one":"{0} sekund s????an","other":"{0} sekund s????an"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"fo-DK","parentLocale":"fo"});

IntlRelativeFormat.__addLocaleData({"locale":"fr","pluralRuleFunction":function (n,ord){if(ord)return n==1?"one":"other";return n>=0&&n<2?"one":"other"},"fields":{"year":{"displayName":"ann??e","relative":{"0":"cette ann??e","1":"l???ann??e prochaine","-1":"l???ann??e derni??re"},"relativeTime":{"future":{"one":"dans {0} an","other":"dans {0} ans"},"past":{"one":"il y a {0} an","other":"il y a {0} ans"}}},"month":{"displayName":"mois","relative":{"0":"ce mois-ci","1":"le mois prochain","-1":"le mois dernier"},"relativeTime":{"future":{"one":"dans {0} mois","other":"dans {0} mois"},"past":{"one":"il y a {0} mois","other":"il y a {0} mois"}}},"day":{"displayName":"jour","relative":{"0":"aujourd???hui","1":"demain","2":"apr??s-demain","-2":"avant-hier","-1":"hier"},"relativeTime":{"future":{"one":"dans {0} jour","other":"dans {0} jours"},"past":{"one":"il y a {0} jour","other":"il y a {0} jours"}}},"hour":{"displayName":"heure","relativeTime":{"future":{"one":"dans {0} heure","other":"dans {0} heures"},"past":{"one":"il y a {0} heure","other":"il y a {0} heures"}}},"minute":{"displayName":"minute","relativeTime":{"future":{"one":"dans {0} minute","other":"dans {0} minutes"},"past":{"one":"il y a {0} minute","other":"il y a {0} minutes"}}},"second":{"displayName":"seconde","relative":{"0":"maintenant"},"relativeTime":{"future":{"one":"dans {0} seconde","other":"dans {0} secondes"},"past":{"one":"il y a {0} seconde","other":"il y a {0} secondes"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"fr-BE","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-BF","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-BI","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-BJ","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-BL","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-CA","parentLocale":"fr","fields":{"year":{"displayName":"ann??e","relative":{"0":"cette ann??e","1":"l???ann??e prochaine","-1":"l???ann??e derni??re"},"relativeTime":{"future":{"one":"Dans {0}??an","other":"Dans {0}??ans"},"past":{"one":"Il y a {0}??an","other":"Il y a {0}??ans"}}},"month":{"displayName":"mois","relative":{"0":"ce mois-ci","1":"le mois prochain","-1":"le mois dernier"},"relativeTime":{"future":{"one":"dans {0} mois","other":"dans {0} mois"},"past":{"one":"il y a {0} mois","other":"il y a {0} mois"}}},"day":{"displayName":"jour","relative":{"0":"aujourd???hui","1":"demain","2":"apr??s-demain","-2":"avant-hier","-1":"hier"},"relativeTime":{"future":{"one":"dans {0} jour","other":"dans {0} jours"},"past":{"one":"il y a {0} jour","other":"il y a {0} jours"}}},"hour":{"displayName":"heure","relativeTime":{"future":{"one":"dans {0} heure","other":"dans {0} heures"},"past":{"one":"il y a {0} heure","other":"il y a {0} heures"}}},"minute":{"displayName":"minute","relativeTime":{"future":{"one":"Dans {0}??minute","other":"Dans {0}??minutes"},"past":{"one":"Il y a {0}??minute","other":"Il y a {0}??minutes"}}},"second":{"displayName":"seconde","relative":{"0":"maintenant"},"relativeTime":{"future":{"one":"dans {0} seconde","other":"dans {0} secondes"},"past":{"one":"il y a {0} seconde","other":"il y a {0} secondes"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"fr-CD","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-CF","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-CG","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-CH","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-CI","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-CM","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-DJ","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-DZ","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-GA","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-GF","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-GN","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-GP","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-GQ","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-HT","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-KM","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-LU","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-MA","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-MC","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-MF","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-MG","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-ML","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-MQ","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-MR","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-MU","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-NC","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-NE","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-PF","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-PM","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-RE","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-RW","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-SC","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-SN","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-SY","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-TD","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-TG","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-TN","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-VU","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-WF","parentLocale":"fr"});
IntlRelativeFormat.__addLocaleData({"locale":"fr-YT","parentLocale":"fr"});

IntlRelativeFormat.__addLocaleData({"locale":"fur","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"an","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"one":"ca di {0} an","other":"ca di {0} agns"},"past":{"one":"{0} an inda??r","other":"{0} agns inda??r"}}},"month":{"displayName":"m??s","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"one":"ca di {0} m??s","other":"ca di {0} m??s"},"past":{"one":"{0} m??s inda??r","other":"{0} m??s inda??r"}}},"day":{"displayName":"d??","relative":{"0":"vu??","1":"doman","2":"passantdoman","-2":"??r l???altri","-1":"??r"},"relativeTime":{"future":{"one":"ca di {0} zornade","other":"ca di {0} zornadis"},"past":{"one":"{0} zornade inda??r","other":"{0} zornadis inda??r"}}},"hour":{"displayName":"ore","relativeTime":{"future":{"one":"ca di {0} ore","other":"ca di {0} oris"},"past":{"one":"{0} ore inda??r","other":"{0} oris inda??r"}}},"minute":{"displayName":"min??t","relativeTime":{"future":{"one":"ca di {0} min??t","other":"ca di {0} min??ts"},"past":{"one":"{0} min??t inda??r","other":"{0} min??ts inda??r"}}},"second":{"displayName":"secont","relative":{"0":"now"},"relativeTime":{"future":{"one":"ca di {0} secont","other":"ca di {0} seconts"},"past":{"one":"{0} secont inda??r","other":"{0} seconts inda??r"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"fy","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"Jier","relative":{"0":"dit jier","1":"folgjend jier","-1":"foarich jier"},"relativeTime":{"future":{"one":"Oer {0} jier","other":"Oer {0} jier"},"past":{"one":"{0} jier lyn","other":"{0} jier lyn"}}},"month":{"displayName":"Moanne","relative":{"0":"dizze moanne","1":"folgjende moanne","-1":"foarige moanne"},"relativeTime":{"future":{"one":"Oer {0} moanne","other":"Oer {0} moannen"},"past":{"one":"{0} moanne lyn","other":"{0} moannen lyn"}}},"day":{"displayName":"dei","relative":{"0":"vandaag","1":"morgen","2":"Oermorgen","-2":"eergisteren","-1":"gisteren"},"relativeTime":{"future":{"one":"Oer {0} dei","other":"Oer {0} deien"},"past":{"one":"{0} dei lyn","other":"{0} deien lyn"}}},"hour":{"displayName":"oere","relativeTime":{"future":{"one":"Oer {0} oere","other":"Oer {0} oere"},"past":{"one":"{0} oere lyn","other":"{0} oere lyn"}}},"minute":{"displayName":"Min??t","relativeTime":{"future":{"one":"Oer {0} min??t","other":"Oer {0} minuten"},"past":{"one":"{0} min??t lyn","other":"{0} minuten lyn"}}},"second":{"displayName":"Sekonde","relative":{"0":"nu"},"relativeTime":{"future":{"one":"Oer {0} sekonde","other":"Oer {0} sekonden"},"past":{"one":"{0} sekonde lyn","other":"{0} sekonden lyn"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ga","pluralRuleFunction":function (n,ord){var s=String(n).split("."),t0=Number(s[0])==n;if(ord)return n==1?"one":"other";return n==1?"one":n==2?"two":t0&&n>=3&&n<=6?"few":t0&&n>=7&&n<=10?"many":"other"},"fields":{"year":{"displayName":"Bliain","relative":{"0":"an bhliain seo","1":"an bhliain seo chugainn","-1":"anuraidh"},"relativeTime":{"future":{"one":"i gceann {0} bhliain","two":"i gceann {0} bhliain","few":"i gceann {0} bliana","many":"i gceann {0} mbliana","other":"i gceann {0} bliain"},"past":{"one":"{0} bhliain ?? shin","two":"{0} bhliain ?? shin","few":"{0} bliana ?? shin","many":"{0} mbliana ?? shin","other":"{0} bliain ?? shin"}}},"month":{"displayName":"M??","relative":{"0":"an mh?? seo","1":"an mh?? seo chugainn","-1":"an mh?? seo caite"},"relativeTime":{"future":{"one":"i gceann {0} mh??","two":"i gceann {0} mh??","few":"i gceann {0} mh??","many":"i gceann {0} m??","other":"i gceann {0} m??"},"past":{"one":"{0} mh?? ?? shin","two":"{0} mh?? ?? shin","few":"{0} mh?? ?? shin","many":"{0} m?? ?? shin","other":"{0} m?? ?? shin"}}},"day":{"displayName":"L??","relative":{"0":"inniu","1":"am??rach","2":"ar?? am??rach","-2":"ar?? inn??","-1":"inn??"},"relativeTime":{"future":{"one":"i gceann {0} l??","two":"i gceann {0} l??","few":"i gceann {0} l??","many":"i gceann {0} l??","other":"i gceann {0} l??"},"past":{"one":"{0} l?? ?? shin","two":"{0} l?? ?? shin","few":"{0} l?? ?? shin","many":"{0} l?? ?? shin","other":"{0} l?? ?? shin"}}},"hour":{"displayName":"Uair","relativeTime":{"future":{"one":"i gceann {0} uair an chloig","two":"i gceann {0} uair an chloig","few":"i gceann {0} huaire an chloig","many":"i gceann {0} n-uaire an chloig","other":"i gceann {0} uair an chloig"},"past":{"one":"{0} uair an chloig ?? shin","two":"{0} uair an chloig ?? shin","few":"{0} huaire an chloig ?? shin","many":"{0} n-uaire an chloig ?? shin","other":"{0} uair an chloig ?? shin"}}},"minute":{"displayName":"N??im??ad","relativeTime":{"future":{"one":"i gceann {0} n??im??ad","two":"i gceann {0} n??im??ad","few":"i gceann {0} n??im??ad","many":"i gceann {0} n??im??ad","other":"i gceann {0} n??im??ad"},"past":{"one":"{0} n??im??ad ?? shin","two":"{0} n??im??ad ?? shin","few":"{0} n??im??ad ?? shin","many":"{0} n??im??ad ?? shin","other":"{0} n??im??ad ?? shin"}}},"second":{"displayName":"Soicind","relative":{"0":"anois"},"relativeTime":{"future":{"one":"i gceann {0} soicind","two":"i gceann {0} shoicind","few":"i gceann {0} shoicind","many":"i gceann {0} soicind","other":"i gceann {0} soicind"},"past":{"one":"{0} soicind ?? shin","two":"{0} shoicind ?? shin","few":"{0} shoicind ?? shin","many":"{0} soicind ?? shin","other":"{0} soicind ?? shin"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"gd","pluralRuleFunction":function (n,ord){var s=String(n).split("."),t0=Number(s[0])==n;if(ord)return"other";return n==1||n==11?"one":n==2||n==12?"two":t0&&n>=3&&n<=10||t0&&n>=13&&n<=19?"few":"other"},"fields":{"year":{"displayName":"bliadhna","relative":{"0":"am bliadhna","1":"an ath-bhliadhna","-2":"a-bh??n-uiridh","-1":"an-uiridh"},"relativeTime":{"future":{"one":"an ceann {0} bhliadhna","two":"an ceann {0} bhliadhna","few":"an ceann {0} bliadhnaichean","other":"an ceann {0} bliadhna"},"past":{"one":"{0} bhliadhna air ais","two":"{0} bhliadhna air ais","few":"{0} bhliadhnaichean air ais","other":"{0} bliadhna air ais"}}},"month":{"displayName":"m??os","relative":{"0":"am m??os seo","1":"an ath-mh??os","-1":"am m??os seo chaidh"},"relativeTime":{"future":{"one":"an ceann {0} mh??osa","two":"an ceann {0} mh??osa","few":"an ceann {0} m??osan","other":"an ceann {0} m??osa"},"past":{"one":"{0} mh??os air ais","two":"{0} mh??os air ais","few":"{0} m??osan air ais","other":"{0} m??os air ais"}}},"day":{"displayName":"latha","relative":{"0":"an-diugh","1":"a-m??ireach","2":"an-earar","3":"an-eararais","-2":"a-bh??in-d??","-1":"an-d??"},"relativeTime":{"future":{"one":"an ceann {0} latha","two":"an ceann {0} latha","few":"an ceann {0} l??ithean","other":"an ceann {0} latha"},"past":{"one":"{0} latha air ais","two":"{0} latha air ais","few":"{0} l??ithean air ais","other":"{0} latha air ais"}}},"hour":{"displayName":"uair a th??de","relativeTime":{"future":{"one":"an ceann {0} uair a th??de","two":"an ceann {0} uair a th??de","few":"an ceann {0} uairean a th??de","other":"an ceann {0} uair a th??de"},"past":{"one":"{0} uair a th??de air ais","two":"{0} uair a th??de air ais","few":"{0} uairean a th??de air ais","other":"{0} uair a th??de air ais"}}},"minute":{"displayName":"mionaid","relativeTime":{"future":{"one":"an ceann {0} mhionaid","two":"an ceann {0} mhionaid","few":"an ceann {0} mionaidean","other":"an ceann {0} mionaid"},"past":{"one":"{0} mhionaid air ais","two":"{0} mhionaid air ais","few":"{0} mionaidean air ais","other":"{0} mionaid air ais"}}},"second":{"displayName":"diog","relative":{"0":"an-dr??sta"},"relativeTime":{"future":{"one":"an ceann {0} diog","two":"an ceann {0} dhiog","few":"an ceann {0} diogan","other":"an ceann {0} diog"},"past":{"one":"{0} diog air ais","two":"{0} dhiog air ais","few":"{0} diogan air ais","other":"{0} diog air ais"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"gl","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"Ano","relative":{"0":"este ano","1":"seguinte ano","-1":"ano pasado"},"relativeTime":{"future":{"one":"En {0} ano","other":"En {0} anos"},"past":{"one":"Hai {0} ano","other":"Hai {0} anos"}}},"month":{"displayName":"Mes","relative":{"0":"este mes","1":"mes seguinte","-1":"mes pasado"},"relativeTime":{"future":{"one":"En {0} mes","other":"En {0} meses"},"past":{"one":"Hai {0} mes","other":"Hai {0} meses"}}},"day":{"displayName":"D??a","relative":{"0":"hoxe","1":"ma????","2":"pasadoma????","-2":"antonte","-1":"onte"},"relativeTime":{"future":{"one":"En {0} d??a","other":"En {0} d??as"},"past":{"one":"Hai {0} d??a","other":"Hai {0} d??as"}}},"hour":{"displayName":"Hora","relativeTime":{"future":{"one":"En {0} hora","other":"En {0} horas"},"past":{"one":"Hai {0} hora","other":"Hai {0} horas"}}},"minute":{"displayName":"Minuto","relativeTime":{"future":{"one":"En {0} minuto","other":"En {0} minutos"},"past":{"one":"Hai {0} minuto","other":"Hai {0} minutos"}}},"second":{"displayName":"Segundo","relative":{"0":"agora"},"relativeTime":{"future":{"one":"En {0} segundo","other":"En {0} segundos"},"past":{"one":"Hai {0} segundo","other":"Hai {0} segundos"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"gsw","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Jaar","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Monet","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Tag","relative":{"0":"h??t","1":"moorn","2":"??bermoorn","-2":"vorgeschter","-1":"geschter"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Schtund","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minuute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"gsw-FR","parentLocale":"gsw"});
IntlRelativeFormat.__addLocaleData({"locale":"gsw-LI","parentLocale":"gsw"});

IntlRelativeFormat.__addLocaleData({"locale":"gu","pluralRuleFunction":function (n,ord){if(ord)return n==1?"one":n==2||n==3?"two":n==4?"few":n==6?"many":"other";return n>=0&&n<=1?"one":"other"},"fields":{"year":{"displayName":"????????????","relative":{"0":"??? ???????????????","1":"???????????? ???????????????","-1":"????????? ???????????????"},"relativeTime":{"future":{"one":"{0} ?????????????????????","other":"{0} ?????????????????????"},"past":{"one":"{0} ???????????? ???????????????","other":"{0} ???????????? ???????????????"}}},"month":{"displayName":"???????????????","relative":{"0":"??? ???????????????","1":"???????????? ???????????????","-1":"????????? ???????????????"},"relativeTime":{"future":{"one":"{0} ????????????????????????","other":"{0} ????????????????????????"},"past":{"one":"{0} ??????????????? ???????????????","other":"{0} ??????????????? ???????????????"}}},"day":{"displayName":"????????????","relative":{"0":"?????????","1":"????????????????????????","2":"????????????????????????","-2":"????????? ????????????????????????","-1":"??????????????????"},"relativeTime":{"future":{"one":"{0} ?????????????????????","other":"{0} ?????????????????????"},"past":{"one":"{0} ???????????? ??????????????????","other":"{0} ???????????? ???????????????"}}},"hour":{"displayName":"????????????","relativeTime":{"future":{"one":"{0} ?????????????????????","other":"{0} ?????????????????????"},"past":{"one":"{0} ???????????? ???????????????","other":"{0} ???????????? ???????????????"}}},"minute":{"displayName":"???????????????","relativeTime":{"future":{"one":"{0} ????????????????????????","other":"{0} ????????????????????????"},"past":{"one":"{0} ??????????????? ???????????????","other":"{0} ??????????????? ???????????????"}}},"second":{"displayName":"??????????????????","relative":{"0":"???????????????"},"relativeTime":{"future":{"one":"{0} ????????????????????????","other":"{0} ????????????????????????"},"past":{"one":"{0} ??????????????? ???????????????","other":"{0} ??????????????? ???????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"guw","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==0||n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"guz","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Omwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Omotienyi","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Rituko","relative":{"0":"Rero","1":"Mambia","-1":"Igoro"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Ensa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Edakika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Esekendi","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"gv","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],v0=!s[1],i10=i.slice(-1),i100=i.slice(-2);if(ord)return"other";return v0&&i10==1?"one":v0&&i10==2?"two":v0&&(i100==0||i100==20||i100==40||i100==60||i100==80)?"few":!v0?"many":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ha","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Shekara","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Wata","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Kwana","relative":{"0":"Yau","1":"Gobe","-1":"Jiya"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Awa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minti","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Da??i??a","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ha-Arab","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ha-GH","parentLocale":"ha"});
IntlRelativeFormat.__addLocaleData({"locale":"ha-NE","parentLocale":"ha"});

IntlRelativeFormat.__addLocaleData({"locale":"haw","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"he","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],v0=!s[1],t0=Number(s[0])==n,n10=t0&&s[0].slice(-1);if(ord)return"other";return n==1&&v0?"one":i==2&&v0?"two":v0&&(n<0||n>10)&&t0&&n10==0?"many":"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"????????","1":"???????? ????????","-1":"???????? ??????????"},"relativeTime":{"future":{"one":"???????? ??????","two":"???????? ????????????","many":"???????? {0} ??????","other":"???????? {0} ????????"},"past":{"one":"???????? ??????","two":"???????? ????????????","many":"???????? {0} ??????","other":"???????? {0} ????????"}}},"month":{"displayName":"????????","relative":{"0":"??????????","1":"?????????? ??????","-1":"?????????? ????????"},"relativeTime":{"future":{"one":"???????? ????????","two":"???????? ??????????????","many":"???????? {0} ????????????","other":"???????? {0} ????????????"},"past":{"one":"???????? ????????","two":"???????? ??????????????","many":"???????? {0} ????????????","other":"???????? {0} ????????????"}}},"day":{"displayName":"??????","relative":{"0":"????????","1":"??????","2":"??????????????","-2":"??????????","-1":"??????????"},"relativeTime":{"future":{"one":"???????? ?????? {0}","two":"???????? ????????????","many":"???????? {0} ????????","other":"???????? {0} ????????"},"past":{"one":"???????? ?????? {0}","two":"???????? ????????????","many":"???????? {0} ????????","other":"???????? {0} ????????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"one":"???????? ??????","two":"???????? ????????????","many":"???????? {0} ????????","other":"???????? {0} ????????"},"past":{"one":"???????? ??????","two":"???????? ????????????","many":"???????? {0} ????????","other":"???????? {0} ????????"}}},"minute":{"displayName":"??????","relativeTime":{"future":{"one":"???????? ??????","two":"???????? ?????? ????????","many":"???????? {0} ????????","other":"???????? {0} ????????"},"past":{"one":"???????? ??????","two":"???????? ?????? ????????","many":"???????? {0} ????????","other":"???????? {0} ????????"}}},"second":{"displayName":"??????????","relative":{"0":"??????????"},"relativeTime":{"future":{"one":"???????? ??????????","two":"???????? ?????? ??????????","many":"???????? {0} ??????????","other":"???????? {0} ??????????"},"past":{"one":"???????? ??????????","two":"???????? ?????? ??????????","many":"???????? {0} ??????????","other":"???????? {0} ??????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"hi","pluralRuleFunction":function (n,ord){if(ord)return n==1?"one":n==2||n==3?"two":n==4?"few":n==6?"many":"other";return n>=0&&n<=1?"one":"other"},"fields":{"year":{"displayName":"????????????","relative":{"0":"?????? ????????????","1":"???????????? ????????????","-1":"??????????????? ????????????"},"relativeTime":{"future":{"one":"{0} ???????????? ?????????","other":"{0} ???????????? ?????????"},"past":{"one":"{0} ???????????? ????????????","other":"{0} ???????????? ????????????"}}},"month":{"displayName":"?????????","relative":{"0":"?????? ?????????","1":"???????????? ?????????","-1":"??????????????? ?????????"},"relativeTime":{"future":{"one":"{0} ????????? ?????????","other":"{0} ????????? ?????????"},"past":{"one":"{0} ????????? ????????????","other":"{0} ????????? ????????????"}}},"day":{"displayName":"?????????","relative":{"0":"??????","1":"??????","2":"???????????????","-2":"???????????? ???????????????","-1":"??????"},"relativeTime":{"future":{"one":"{0} ????????? ?????????","other":"{0} ????????? ?????????"},"past":{"one":"{0} ????????? ????????????","other":"{0} ????????? ????????????"}}},"hour":{"displayName":"????????????","relativeTime":{"future":{"one":"{0} ???????????? ?????????","other":"{0} ???????????? ?????????"},"past":{"one":"{0} ???????????? ????????????","other":"{0} ???????????? ????????????"}}},"minute":{"displayName":"????????????","relativeTime":{"future":{"one":"{0} ???????????? ?????????","other":"{0} ???????????? ?????????"},"past":{"one":"{0} ???????????? ????????????","other":"{0} ???????????? ????????????"}}},"second":{"displayName":"???????????????","relative":{"0":"??????"},"relativeTime":{"future":{"one":"{0} ??????????????? ?????????","other":"{0} ??????????????? ?????????"},"past":{"one":"{0} ??????????????? ????????????","other":"{0} ??????????????? ????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"hr","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],f=s[1]||"",v0=!s[1],i10=i.slice(-1),i100=i.slice(-2),f10=f.slice(-1),f100=f.slice(-2);if(ord)return"other";return v0&&i10==1&&i100!=11||f10==1&&f100!=11?"one":v0&&(i10>=2&&i10<=4)&&(i100<12||i100>14)||f10>=2&&f10<=4&&(f100<12||f100>14)?"few":"other"},"fields":{"year":{"displayName":"godina","relative":{"0":"ove godine","1":"sljede??e godine","-1":"pro??le godine"},"relativeTime":{"future":{"one":"za {0} godinu","few":"za {0} godine","other":"za {0} godina"},"past":{"one":"prije {0} godinu","few":"prije {0} godine","other":"prije {0} godina"}}},"month":{"displayName":"mjesec","relative":{"0":"ovaj mjesec","1":"sljede??i mjesec","-1":"pro??li mjesec"},"relativeTime":{"future":{"one":"za {0} mjesec","few":"za {0} mjeseca","other":"za {0} mjeseci"},"past":{"one":"prije {0} mjesec","few":"prije {0} mjeseca","other":"prije {0} mjeseci"}}},"day":{"displayName":"dan","relative":{"0":"danas","1":"sutra","2":"prekosutra","-2":"prekju??er","-1":"ju??er"},"relativeTime":{"future":{"one":"za {0} dan","few":"za {0} dana","other":"za {0} dana"},"past":{"one":"prije {0} dan","few":"prije {0} dana","other":"prije {0} dana"}}},"hour":{"displayName":"sat","relativeTime":{"future":{"one":"za {0} sat","few":"za {0} sata","other":"za {0} sati"},"past":{"one":"prije {0} sat","few":"prije {0} sata","other":"prije {0} sati"}}},"minute":{"displayName":"minuta","relativeTime":{"future":{"one":"za {0} minutu","few":"za {0} minute","other":"za {0} minuta"},"past":{"one":"prije {0} minutu","few":"prije {0} minute","other":"prije {0} minuta"}}},"second":{"displayName":"sekunda","relative":{"0":"sada"},"relativeTime":{"future":{"one":"za {0} sekundu","few":"za {0} sekunde","other":"za {0} sekundi"},"past":{"one":"prije {0} sekundu","few":"prije {0} sekunde","other":"prije {0} sekundi"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"hr-BA","parentLocale":"hr"});

IntlRelativeFormat.__addLocaleData({"locale":"hsb","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],f=s[1]||"",v0=!s[1],i100=i.slice(-2),f100=f.slice(-2);if(ord)return"other";return v0&&i100==1||f100==1?"one":v0&&i100==2||f100==2?"two":v0&&(i100==3||i100==4)||(f100==3||f100==4)?"few":"other"},"fields":{"year":{"displayName":"l??to","relative":{"0":"l??tsa","1":"kl??tu","-1":"loni"},"relativeTime":{"future":{"one":"za {0} l??to","two":"za {0} l????e","few":"za {0} l??ta","other":"za {0} l??t"},"past":{"one":"p??ed {0} l??tom","two":"p??ed {0} l??tomaj","few":"p??ed {0} l??tami","other":"p??ed {0} l??tami"}}},"month":{"displayName":"m??sac","relative":{"0":"tut??n m??sac","1":"p??ichodny m??sac","-1":"za????y m??sac"},"relativeTime":{"future":{"one":"za {0} m??sac","two":"za {0} m??sacaj","few":"za {0} m??sacy","other":"za {0} m??sacow"},"past":{"one":"p??ed {0} m??sacom","two":"p??ed {0} m??sacomaj","few":"p??ed {0} m??sacami","other":"p??ed {0} m??sacami"}}},"day":{"displayName":"d??e??","relative":{"0":"d??ensa","1":"jut??e","-1":"w??era"},"relativeTime":{"future":{"one":"za {0} d??e??","two":"za {0} dnjej","few":"za {0} dny","other":"za {0} dnjow"},"past":{"one":"p??ed {0} dnjom","two":"p??ed {0} dnjomaj","few":"p??ed {0} dnjemi","other":"p??ed {0} dnjemi"}}},"hour":{"displayName":"hod??ina","relativeTime":{"future":{"one":"za {0} hod??inu","two":"za {0} hod??inje","few":"za {0} hod??iny","other":"za {0} hod??in"},"past":{"one":"p??ed {0} hod??inu","two":"p??ed {0} hod??inomaj","few":"p??ed {0} hod??inami","other":"p??ed {0} hod??inami"}}},"minute":{"displayName":"minuta","relativeTime":{"future":{"one":"za {0} minutu","two":"za {0} minu??e","few":"za {0} minuty","other":"za {0} minutow"},"past":{"one":"p??ed {0} minutu","two":"p??ed {0} minutomaj","few":"p??ed {0} minutami","other":"p??ed {0} minutami"}}},"second":{"displayName":"sekunda","relative":{"0":"now"},"relativeTime":{"future":{"one":"za {0} sekundu","two":"za {0} sekund??e","few":"za {0} sekundy","other":"za {0} sekundow"},"past":{"one":"p??ed {0} sekundu","two":"p??ed {0} sekundomaj","few":"p??ed {0} sekundami","other":"p??ed {0} sekundami"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"hu","pluralRuleFunction":function (n,ord){if(ord)return n==1||n==5?"one":"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"??v","relative":{"0":"ez az ??v","1":"k??vetkez?? ??v","-1":"el??z?? ??v"},"relativeTime":{"future":{"one":"{0} ??v m??lva","other":"{0} ??v m??lva"},"past":{"one":"{0} ??vvel ezel??tt","other":"{0} ??vvel ezel??tt"}}},"month":{"displayName":"h??nap","relative":{"0":"ez a h??nap","1":"k??vetkez?? h??nap","-1":"el??z?? h??nap"},"relativeTime":{"future":{"one":"{0} h??nap m??lva","other":"{0} h??nap m??lva"},"past":{"one":"{0} h??nappal ezel??tt","other":"{0} h??nappal ezel??tt"}}},"day":{"displayName":"nap","relative":{"0":"ma","1":"holnap","2":"holnaput??n","-2":"tegnapel??tt","-1":"tegnap"},"relativeTime":{"future":{"one":"{0} nap m??lva","other":"{0} nap m??lva"},"past":{"one":"{0} nappal ezel??tt","other":"{0} nappal ezel??tt"}}},"hour":{"displayName":"??ra","relativeTime":{"future":{"one":"{0} ??ra m??lva","other":"{0} ??ra m??lva"},"past":{"one":"{0} ??r??val ezel??tt","other":"{0} ??r??val ezel??tt"}}},"minute":{"displayName":"perc","relativeTime":{"future":{"one":"{0} perc m??lva","other":"{0} perc m??lva"},"past":{"one":"{0} perccel ezel??tt","other":"{0} perccel ezel??tt"}}},"second":{"displayName":"m??sodperc","relative":{"0":"most"},"relativeTime":{"future":{"one":"{0} m??sodperc m??lva","other":"{0} m??sodperc m??lva"},"past":{"one":"{0} m??sodperccel ezel??tt","other":"{0} m??sodperccel ezel??tt"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"hy","pluralRuleFunction":function (n,ord){if(ord)return n==1?"one":"other";return n>=0&&n<2?"one":"other"},"fields":{"year":{"displayName":"????????","relative":{"0":"?????? ????????","1":"???????????? ????????","-1":"???????????? ????????"},"relativeTime":{"future":{"one":"{0} ???????? ??????","other":"{0} ???????? ??????"},"past":{"one":"{0} ???????? ????????","other":"{0} ???????? ????????"}}},"month":{"displayName":"????????","relative":{"0":"?????? ????????","1":"???????????? ????????","-1":"???????????? ????????"},"relativeTime":{"future":{"one":"{0} ???????? ??????","other":"{0} ???????? ??????"},"past":{"one":"{0} ???????? ????????","other":"{0} ???????? ????????"}}},"day":{"displayName":"????","relative":{"0":"??????????","1":"????????","2":"???????? ???? ?????????? ??????","-2":"???????? ???? ?????????? ??????","-1":"????????"},"relativeTime":{"future":{"one":"{0} ???? ??????","other":"{0} ???? ??????"},"past":{"one":"{0} ???? ????????","other":"{0} ???? ????????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"one":"{0} ?????? ??????","other":"{0} ?????? ??????"},"past":{"one":"{0} ?????? ????????","other":"{0} ?????? ????????"}}},"minute":{"displayName":"????????","relativeTime":{"future":{"one":"{0} ???????? ??????","other":"{0} ???????? ??????"},"past":{"one":"{0} ???????? ????????","other":"{0} ???????? ????????"}}},"second":{"displayName":"????????????????","relative":{"0":"????????"},"relativeTime":{"future":{"one":"{0} ???????????????? ??????","other":"{0} ???????????????? ??????"},"past":{"one":"{0} ???????????????? ????????","other":"{0} ???????????????? ????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"id","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Tahun","relative":{"0":"tahun ini","1":"tahun depan","-1":"tahun lalu"},"relativeTime":{"future":{"other":"Dalam {0} tahun"},"past":{"other":"{0} tahun yang lalu"}}},"month":{"displayName":"Bulan","relative":{"0":"bulan ini","1":"Bulan berikutnya","-1":"bulan lalu"},"relativeTime":{"future":{"other":"Dalam {0} bulan"},"past":{"other":"{0} bulan yang lalu"}}},"day":{"displayName":"Hari","relative":{"0":"hari ini","1":"besok","2":"lusa","-2":"kemarin lusa","-1":"kemarin"},"relativeTime":{"future":{"other":"Dalam {0} hari"},"past":{"other":"{0} hari yang lalu"}}},"hour":{"displayName":"Jam","relativeTime":{"future":{"other":"Dalam {0} jam"},"past":{"other":"{0} jam yang lalu"}}},"minute":{"displayName":"Menit","relativeTime":{"future":{"other":"Dalam {0} menit"},"past":{"other":"{0} menit yang lalu"}}},"second":{"displayName":"Detik","relative":{"0":"sekarang"},"relativeTime":{"future":{"other":"Dalam {0} detik"},"past":{"other":"{0} detik yang lalu"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ig","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Af???","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"???nwa","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"???b???ch???","relative":{"0":"Taata","1":"Echi","-1":"Nnyaaf???"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Elekere","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Nkeji","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Nkejinta","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ii","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"???","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"???","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"???","relative":{"0":"??????","1":"?????????","2":"?????????","-2":"????????????","-1":"?????????"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"???","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"???","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"in","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"is","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],t0=Number(s[0])==n,i10=i.slice(-1),i100=i.slice(-2);if(ord)return"other";return t0&&i10==1&&i100!=11||!t0?"one":"other"},"fields":{"year":{"displayName":"??r","relative":{"0":"?? ??essu ??ri","1":"?? n??sta ??ri","-1":"?? s????asta ??ri"},"relativeTime":{"future":{"one":"eftir {0} ??r","other":"eftir {0} ??r"},"past":{"one":"fyrir {0} ??ri","other":"fyrir {0} ??rum"}}},"month":{"displayName":"m??nu??ur","relative":{"0":"?? ??essum m??nu??i","1":"?? n??sta m??nu??i","-1":"?? s????asta m??nu??i"},"relativeTime":{"future":{"one":"eftir {0} m??nu??","other":"eftir {0} m??nu??i"},"past":{"one":"fyrir {0} m??nu??i","other":"fyrir {0} m??nu??um"}}},"day":{"displayName":"dagur","relative":{"0":"?? dag","1":"?? morgun","2":"eftir tvo daga","-2":"?? fyrradag","-1":"?? g??r"},"relativeTime":{"future":{"one":"eftir {0} dag","other":"eftir {0} daga"},"past":{"one":"fyrir {0} degi","other":"fyrir {0} d??gum"}}},"hour":{"displayName":"klukkustund","relativeTime":{"future":{"one":"eftir {0} klukkustund","other":"eftir {0} klukkustundir"},"past":{"one":"fyrir {0} klukkustund","other":"fyrir {0} klukkustundum"}}},"minute":{"displayName":"m??n??ta","relativeTime":{"future":{"one":"eftir {0} m??n??tu","other":"eftir {0} m??n??tur"},"past":{"one":"fyrir {0} m??n??tu","other":"fyrir {0} m??n??tum"}}},"second":{"displayName":"sek??nda","relative":{"0":"n??na"},"relativeTime":{"future":{"one":"eftir {0} sek??ndu","other":"eftir {0} sek??ndur"},"past":{"one":"fyrir {0} sek??ndu","other":"fyrir {0} sek??ndum"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"it","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return n==11||n==8||n==80||n==800?"many":"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"anno","relative":{"0":"quest???anno","1":"anno prossimo","-1":"anno scorso"},"relativeTime":{"future":{"one":"tra {0} anno","other":"tra {0} anni"},"past":{"one":"{0} anno fa","other":"{0} anni fa"}}},"month":{"displayName":"mese","relative":{"0":"questo mese","1":"mese prossimo","-1":"mese scorso"},"relativeTime":{"future":{"one":"tra {0} mese","other":"tra {0} mesi"},"past":{"one":"{0} mese fa","other":"{0} mesi fa"}}},"day":{"displayName":"giorno","relative":{"0":"oggi","1":"domani","2":"dopodomani","-2":"l???altro ieri","-1":"ieri"},"relativeTime":{"future":{"one":"tra {0} giorno","other":"tra {0} giorni"},"past":{"one":"{0} giorno fa","other":"{0} giorni fa"}}},"hour":{"displayName":"ora","relativeTime":{"future":{"one":"tra {0} ora","other":"tra {0} ore"},"past":{"one":"{0} ora fa","other":"{0} ore fa"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"tra {0} minuto","other":"tra {0} minuti"},"past":{"one":"{0} minuto fa","other":"{0} minuti fa"}}},"second":{"displayName":"Secondo","relative":{"0":"ora"},"relativeTime":{"future":{"one":"tra {0} secondo","other":"tra {0} secondi"},"past":{"one":"{0} secondo fa","other":"{0} secondi fa"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"it-CH","parentLocale":"it"});
IntlRelativeFormat.__addLocaleData({"locale":"it-SM","parentLocale":"it"});

IntlRelativeFormat.__addLocaleData({"locale":"iu","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":n==2?"two":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"iu-Latn","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"iw","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],v0=!s[1],t0=Number(s[0])==n,n10=t0&&s[0].slice(-1);if(ord)return"other";return n==1&&v0?"one":i==2&&v0?"two":v0&&(n<0||n>10)&&t0&&n10==0?"many":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ja","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"???","relative":{"0":"??????","1":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0} ??????"},"past":{"other":"{0} ??????"}}},"month":{"displayName":"???","relative":{"0":"??????","1":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0} ?????????"},"past":{"other":"{0} ?????????"}}},"day":{"displayName":"???","relative":{"0":"??????","1":"??????","2":"?????????","-2":"?????????","-1":"??????"},"relativeTime":{"future":{"other":"{0} ??????"},"past":{"other":"{0} ??????"}}},"hour":{"displayName":"???","relativeTime":{"future":{"other":"{0} ?????????"},"past":{"other":"{0} ?????????"}}},"minute":{"displayName":"???","relativeTime":{"future":{"other":"{0} ??????"},"past":{"other":"{0} ??????"}}},"second":{"displayName":"???","relative":{"0":"?????????"},"relativeTime":{"future":{"other":"{0} ??????"},"past":{"other":"{0} ??????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"jbo","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"jgo","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"one":"N??u ??gu??? {0}","other":"N??u ??gu??? {0}"},"past":{"one":"????g???? m???? ??gu??? {0}","other":"????g???? m???? ??gu??? {0}"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"one":"N??u {0} sa??","other":"N??u {0} sa??"},"past":{"one":"???? g???? m???? p??sa?? {0}","other":"???? g???? m???? p??sa?? {0}"}}},"day":{"displayName":"Day","relative":{"0":"l???????","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"one":"N??u l??????? {0}","other":"N??u l??????? {0}"},"past":{"one":"???? g???? m???? l??????? {0}","other":"???? g???? m???? l??????? {0}"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"one":"n??u h??wa {0}","other":"n??u h??wa {0}"},"past":{"one":"???? g?? m???? {0} h??wa","other":"???? g?? m???? {0} h??wa"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"one":"n??u {0} min??t","other":"n??u {0} min??t"},"past":{"one":"???? g???? m???? min??t {0}","other":"???? g???? m???? min??t {0}"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ji","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"jmc","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Maka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mori","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Mfiri","relative":{"0":"Inu","1":"Ngama","-1":"Ukou"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Saa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Dakyika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"jv","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"jw","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ka","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],i100=i.slice(-2);if(ord)return i==1?"one":i==0||(i100>=2&&i100<=20||i100==40||i100==60||i100==80)?"many":"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"????????????","relative":{"0":"?????? ????????????","1":"????????????????????? ????????????","-1":"??????????????? ????????????"},"relativeTime":{"future":{"one":"{0} ???????????????????????????","other":"{0} ???????????????????????????"},"past":{"one":"{0} ???????????? ?????????","other":"{0} ???????????? ?????????"}}},"month":{"displayName":"?????????","relative":{"0":"?????? ???????????????","1":"????????????????????? ????????????","-1":"??????????????? ????????????"},"relativeTime":{"future":{"one":"{0} ???????????????","other":"{0} ???????????????"},"past":{"one":"{0} ???????????? ?????????","other":"{0} ???????????? ?????????"}}},"day":{"displayName":"?????????","relative":{"0":"????????????","1":"????????????","2":"?????????","-2":"????????????????????????","-1":"???????????????"},"relativeTime":{"future":{"one":"{0} ???????????????","other":"{0} ???????????????"},"past":{"one":"{0} ???????????? ?????????","other":"{0} ???????????? ?????????"}}},"hour":{"displayName":"???????????????","relativeTime":{"future":{"one":"{0} ??????????????????","other":"{0} ??????????????????"},"past":{"one":"{0} ?????????????????? ?????????","other":"{0} ?????????????????? ?????????"}}},"minute":{"displayName":"????????????","relativeTime":{"future":{"one":"{0} ???????????????","other":"{0} ???????????????"},"past":{"one":"{0} ??????????????? ?????????","other":"{0} ??????????????? ?????????"}}},"second":{"displayName":"????????????","relative":{"0":"????????????"},"relativeTime":{"future":{"one":"{0} ???????????????","other":"{0} ???????????????"},"past":{"one":"{0} ??????????????? ?????????","other":"{0} ??????????????? ?????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"kab","pluralRuleFunction":function (n,ord){if(ord)return"other";return n>=0&&n<2?"one":"other"},"fields":{"year":{"displayName":"Aseggas","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Aggur","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Ass","relative":{"0":"Ass-a","1":"Azekka","-1":"I???elli"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Tamert","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Tamrect","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Tasint","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"kaj","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"kam","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Mwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mwai","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"M??thenya","relative":{"0":"??m??nth??","1":"??n??","-1":"??yoo"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Saa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Ndat??ka","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"sekondi","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"kcg","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"kde","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Mwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mwedi","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Lihiku","relative":{"0":"Nelo","1":"Nundu","-1":"Lido"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Saa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Dakika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"kea","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Anu","relative":{"0":"es anu li","1":"pr??simu anu","-1":"anu pasadu"},"relativeTime":{"future":{"other":"di li {0} anu"},"past":{"other":"a ten {0} anu"}}},"month":{"displayName":"Mes","relative":{"0":"es mes li","1":"pr??simu mes","-1":"mes pasadu"},"relativeTime":{"future":{"other":"di li {0} mes"},"past":{"other":"a ten {0} mes"}}},"day":{"displayName":"Dia","relative":{"0":"oji","1":"manha","-1":"onti"},"relativeTime":{"future":{"other":"di li {0} dia"},"past":{"other":"a ten {0} dia"}}},"hour":{"displayName":"Ora","relativeTime":{"future":{"other":"di li {0} ora"},"past":{"other":"a ten {0} ora"}}},"minute":{"displayName":"Minutu","relativeTime":{"future":{"other":"di li {0} minutu"},"past":{"other":"a ten {0} minutu"}}},"second":{"displayName":"Sigundu","relative":{"0":"now"},"relativeTime":{"future":{"other":"di li {0} sigundu"},"past":{"other":"a ten {0} sigundu"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"khq","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Jiiri","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Handu","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Jaari","relative":{"0":"H??o","1":"Suba","-1":"Bi"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Guuru","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Miniti","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Miti","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ki","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Mwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mweri","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"M??thenya","relative":{"0":"??m??th??","1":"R??ci??","-1":"Ira"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Ithaa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Ndag??ka","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"kk","pluralRuleFunction":function (n,ord){var s=String(n).split("."),t0=Number(s[0])==n,n10=t0&&s[0].slice(-1);if(ord)return n10==6||n10==9||t0&&n10==0&&n!=0?"many":"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"???????????? ??????","1":"???????????? ??????","-1":"???????????????? ??????"},"relativeTime":{"future":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"},"past":{"one":"{0} ?????? ??????????","other":"{0} ?????? ??????????"}}},"month":{"displayName":"????","relative":{"0":"?????? ????","1":"???????????? ????","-1":"?????????? ????"},"relativeTime":{"future":{"one":"{0} ?????????? ??????????","other":"{0} ?????????? ??????????"},"past":{"one":"{0} ???? ??????????","other":"{0} ???? ??????????"}}},"day":{"displayName":"??????","relative":{"0":"??????????","1":"??????????","2":"??????????????????","-2":"?????????????? ????????","-1":"????????"},"relativeTime":{"future":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"},"past":{"one":"{0} ?????? ??????????","other":"{0} ?????? ??????????"}}},"hour":{"displayName":"??????????","relativeTime":{"future":{"one":"{0} ???????????????? ??????????","other":"{0} ???????????????? ??????????"},"past":{"one":"{0} ?????????? ??????????","other":"{0} ?????????? ??????????"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"one":"{0} ???????????????? ??????????","other":"{0} ???????????????? ??????????"},"past":{"one":"{0} ?????????? ??????????","other":"{0} ?????????? ??????????"}}},"second":{"displayName":"????????????","relative":{"0":"??????????"},"relativeTime":{"future":{"one":"{0} ?????????????????? ??????????","other":"{0} ?????????????????? ??????????"},"past":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"kkj","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"muka","1":"n??m??n??","-1":"kwey"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"kl","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"one":"om {0} ukioq","other":"om {0} ukioq"},"past":{"one":"for {0} ukioq siden","other":"for {0} ukioq siden"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"one":"om {0} qaammat","other":"om {0} qaammat"},"past":{"one":"for {0} qaammat siden","other":"for {0} qaammat siden"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"one":"om {0} ulloq unnuarlu","other":"om {0} ulloq unnuarlu"},"past":{"one":"for {0} ulloq unnuarlu siden","other":"for {0} ulloq unnuarlu siden"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"one":"om {0} nalunaaquttap-akunnera","other":"om {0} nalunaaquttap-akunnera"},"past":{"one":"for {0} nalunaaquttap-akunnera siden","other":"for {0} nalunaaquttap-akunnera siden"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"one":"om {0} minutsi","other":"om {0} minutsi"},"past":{"one":"for {0} minutsi siden","other":"for {0} minutsi siden"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"one":"om {0} sekundi","other":"om {0} sekundi"},"past":{"one":"for {0} sekundi siden","other":"for {0} sekundi siden"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"kln","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Kenyit","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Arawet","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Betut","relative":{"0":"Raini","1":"Mutai","-1":"Amut"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Sait","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minitit","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekondit","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"km","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"???????????????","relative":{"0":"???????????????????????????","1":"?????????????????????????????????","-1":"???????????????????????????"},"relativeTime":{"future":{"other":"??????????????????????????????????????? {0} ???????????????"},"past":{"other":"{0} ???????????????????????????"}}},"month":{"displayName":"??????","relative":{"0":"??????????????????","1":"????????????????????????","-1":"??????????????????"},"relativeTime":{"future":{"other":"??????????????????????????????????????? {0} ??????"},"past":{"other":"{0} ???????????????"}}},"day":{"displayName":"????????????","relative":{"0":"????????????????????????","1":"??????????????????????????????","2":"??????????????????????????????","-2":"?????????????????????????????????","-1":"????????????????????????"},"relativeTime":{"future":{"other":"??????????????????????????????????????? {0} ????????????"},"past":{"other":"{0} ????????????????????????"}}},"hour":{"displayName":"????????????","relativeTime":{"future":{"other":"??????????????????????????????????????? {0} ????????????"},"past":{"other":"{0} ????????????????????????"}}},"minute":{"displayName":"????????????","relativeTime":{"future":{"other":"???????????????????????????????????? {0} ????????????"},"past":{"other":"{0} ????????????????????????"}}},"second":{"displayName":"??????????????????","relative":{"0":"????????????"},"relativeTime":{"future":{"other":"???????????????????????????????????? {0} ??????????????????"},"past":{"other":"{0} ??????????????????????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"kn","pluralRuleFunction":function (n,ord){if(ord)return"other";return n>=0&&n<=1?"one":"other"},"fields":{"year":{"displayName":"????????????","relative":{"0":"??? ????????????","1":"?????????????????? ????????????","-1":"???????????? ????????????"},"relativeTime":{"future":{"one":"{0} ???????????????????????????","other":"{0} ??????????????????????????????"},"past":{"one":"{0} ??????????????? ???????????????","other":"{0} ?????????????????? ???????????????"}}},"month":{"displayName":"??????????????????","relative":{"0":"??? ??????????????????","1":"?????????????????? ??????????????????","-1":"???????????? ??????????????????"},"relativeTime":{"future":{"one":"{0} ???????????????????????????","other":"{0} ????????????????????????????????????"},"past":{"one":"{0} ???????????????????????? ???????????????","other":"{0} ???????????????????????? ???????????????"}}},"day":{"displayName":"?????????","relative":{"0":"????????????","1":"????????????","2":"????????????????????????","-2":"??????????????????","-1":"??????????????????"},"relativeTime":{"future":{"one":"{0} ????????????????????????","other":"{0} ???????????????????????????"},"past":{"one":"{0} ???????????? ???????????????","other":"{0} ??????????????? ???????????????"}}},"hour":{"displayName":"????????????","relativeTime":{"future":{"one":"{0} ???????????????????????????","other":"{0} ??????????????????????????????"},"past":{"one":"{0} ???????????? ???????????????","other":"{0} ?????????????????? ???????????????"}}},"minute":{"displayName":"???????????????","relativeTime":{"future":{"one":"{0} ??????????????????????????????","other":"{0} ?????????????????????????????????"},"past":{"one":"{0} ????????????????????? ???????????????","other":"{0} ????????????????????? ???????????????"}}},"second":{"displayName":"?????????????????????","relative":{"0":"????????????"},"relativeTime":{"future":{"one":"{0} ???????????????????????????????????????","other":"{0} ??????????????????????????????????????????"},"past":{"one":"{0} ????????????????????? ???????????????","other":"{0} ??????????????????????????? ???????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ko","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"???","relative":{"0":"??????","1":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0}??? ???"},"past":{"other":"{0}??? ???"}}},"month":{"displayName":"???","relative":{"0":"?????? ???","1":"?????? ???","-1":"?????????"},"relativeTime":{"future":{"other":"{0}?????? ???"},"past":{"other":"{0}?????? ???"}}},"day":{"displayName":"???","relative":{"0":"??????","1":"??????","2":"??????","-2":"?????????","-1":"??????"},"relativeTime":{"future":{"other":"{0}??? ???"},"past":{"other":"{0}??? ???"}}},"hour":{"displayName":"???","relativeTime":{"future":{"other":"{0}?????? ???"},"past":{"other":"{0}?????? ???"}}},"minute":{"displayName":"???","relativeTime":{"future":{"other":"{0}??? ???"},"past":{"other":"{0}??? ???"}}},"second":{"displayName":"???","relative":{"0":"??????"},"relativeTime":{"future":{"other":"{0}??? ???"},"past":{"other":"{0}??? ???"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ko-KP","parentLocale":"ko"});

IntlRelativeFormat.__addLocaleData({"locale":"kok","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ks","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"??????????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"??????","relative":{"0":"??????","1":"????????","-1":"????????"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"??????????????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"??????????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ksb","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Ng???waka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Ng???ezi","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Siku","relative":{"0":"Evi eo","1":"Keloi","-1":"Ghuo"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Saa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Dakika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ksf","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"B??k","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"??w????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"??w??s","relative":{"0":"G??????n??","1":"Rid??r????","-1":"Rink??????"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"C??m????n","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"M??n??t","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"H??u","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ksh","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==0?"zero":n==1?"one":"other"},"fields":{"year":{"displayName":"Johr","relative":{"0":"diese Johr","1":"n??chste Johr","-1":"l??z Johr"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mohnd","relative":{"0":"diese Mohnd","1":"n??chste Mohnd","-1":"l??tzde Mohnd"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Daach","relative":{"0":"h??ck","1":"morje","2":"??vvermorje","-2":"v??rjestere","-1":"jestere"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Schtund","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Menutt","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekond","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ku","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"kw","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":n==2?"two":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ky","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"??????????","1":"???????????? ????????","-1":"????????????"},"relativeTime":{"future":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"},"past":{"one":"{0} ?????? ??????????","other":"{0} ?????? ??????????"}}},"month":{"displayName":"????","relative":{"0":"?????? ????????","1":"???????????? ????????","-1":"?????????? ????????"},"relativeTime":{"future":{"one":"{0} ?????????? ??????????","other":"{0} ?????????? ??????????"},"past":{"one":"{0} ???? ??????????","other":"{0} ???? ??????????"}}},"day":{"displayName":"??????","relative":{"0":"??????????","1":"??????????","2":"??????????????????","-2":"?????????????? ????????","-1":"??????????"},"relativeTime":{"future":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"},"past":{"one":"{0} ?????? ??????????","other":"{0} ?????? ??????????"}}},"hour":{"displayName":"????????","relativeTime":{"future":{"one":"{0} ?????????????? ??????????","other":"{0} ?????????????? ??????????"},"past":{"one":"{0} ???????? ??????????","other":"{0} ???????? ??????????"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"one":"{0} ???????????????? ??????????","other":"{0} ???????????????? ??????????"},"past":{"one":"{0} ?????????? ??????????","other":"{0} ?????????? ??????????"}}},"second":{"displayName":"????????????","relative":{"0":"????????"},"relativeTime":{"future":{"one":"{0} ?????????????????? ??????????","other":"{0} ?????????????????? ??????????"},"past":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"lag","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0];if(ord)return"other";return n==0?"zero":(i==0||i==1)&&n!=0?"one":"other"},"fields":{"year":{"displayName":"Mwa??ka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mwe??ri","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Sik??","relative":{"0":"Isik??","1":"Lam??toondo","-1":"Niijo"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"S??a","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Dak??ka","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sek??unde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"lb","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Joer","relative":{"0":"d??st Joer","1":"n??chst Joer","-1":"lescht Joer"},"relativeTime":{"future":{"one":"an {0} Joer","other":"a(n) {0} Joer"},"past":{"one":"virun {0} Joer","other":"viru(n) {0} Joer"}}},"month":{"displayName":"Mount","relative":{"0":"d??se Mount","1":"n??chste Mount","-1":"leschte Mount"},"relativeTime":{"future":{"one":"an {0} Mount","other":"a(n) {0} M??int"},"past":{"one":"virun {0} Mount","other":"viru(n) {0} M??int"}}},"day":{"displayName":"Dag","relative":{"0":"haut","1":"muer","-1":"g??schter"},"relativeTime":{"future":{"one":"an {0} Dag","other":"a(n) {0} Deeg"},"past":{"one":"virun {0} Dag","other":"viru(n) {0} Deeg"}}},"hour":{"displayName":"Stonn","relativeTime":{"future":{"one":"an {0} Stonn","other":"a(n) {0} Stonnen"},"past":{"one":"virun {0} Stonn","other":"viru(n) {0} Stonnen"}}},"minute":{"displayName":"Minutt","relativeTime":{"future":{"one":"an {0} Minutt","other":"a(n) {0} Minutten"},"past":{"one":"virun {0} Minutt","other":"viru(n) {0} Minutten"}}},"second":{"displayName":"Sekonn","relative":{"0":"now"},"relativeTime":{"future":{"one":"an {0} Sekonn","other":"a(n) {0} Sekonnen"},"past":{"one":"virun {0} Sekonn","other":"viru(n) {0} Sekonnen"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"lg","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Mwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mwezi","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Lunaku","relative":{"0":"Lwaleero","1":"Nkya","-1":"Ggulo"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Saawa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Dakiika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Kasikonda","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"lkt","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"??mak??a","relative":{"0":"L?? ??mak??a ki??","1":"T??ok??ta ??mak??a ki??h????","-1":"??mak??a k??u?? h??ha??"},"relativeTime":{"future":{"other":"Let????ha?? ??mak??a {0} ki??h????"},"past":{"other":"H??kta ??mak??a {0} k??u?? h??ha??"}}},"month":{"displayName":"W??","relative":{"0":"L?? w?? ki??","1":"W?? ki??h????","-1":"W?? k??u?? h??ha??"},"relativeTime":{"future":{"other":"Let????ha?? w??yawapi {0} ki??h????"},"past":{"other":"H??kta w??yawapi {0} k??u?? h??ha??"}}},"day":{"displayName":"A??p??tu","relative":{"0":"L?? a??p??tu ki??","1":"H????ha??ni ki??h????","-1":"L?? a??p??tu ki??"},"relativeTime":{"future":{"other":"Let????ha?? {0}-??h???? ki??h????"},"past":{"other":"H??kta {0}-??h???? k???u?? h??ha??"}}},"hour":{"displayName":"Ow??p??e","relativeTime":{"future":{"other":"Let????ha?? ow??p??e {0} ki??h????"},"past":{"other":"H??kta ow??p??e {0} k??u?? h??ha??"}}},"minute":{"displayName":"Ow??p??e o????????k??o","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Okp??","relative":{"0":"now"},"relativeTime":{"future":{"other":"Let????ha?? okp?? {0} ki??h????"},"past":{"other":"H??kta okp?? {0} k???u?? h??ha??"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ln","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==0||n==1?"one":"other"},"fields":{"year":{"displayName":"Mob??","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"S??nz??","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Mok??l??","relative":{"0":"L??l????","1":"L??bi ekoy??","-1":"L??bi el??k??"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Ngonga","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Mon??ti","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"S??k????nd??","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ln-AO","parentLocale":"ln"});
IntlRelativeFormat.__addLocaleData({"locale":"ln-CF","parentLocale":"ln"});
IntlRelativeFormat.__addLocaleData({"locale":"ln-CG","parentLocale":"ln"});

IntlRelativeFormat.__addLocaleData({"locale":"lo","pluralRuleFunction":function (n,ord){if(ord)return n==1?"one":"other";return"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"???????????????","1":"???????????????","-1":"???????????????"},"relativeTime":{"future":{"other":"??????????????? {0} ??????"},"past":{"other":"{0} ??????????????????"}}},"month":{"displayName":"???????????????","relative":{"0":"????????????????????????","1":"????????????????????????","-1":"???????????????????????????"},"relativeTime":{"future":{"other":"??????????????? {0} ???????????????"},"past":{"other":"{0} ???????????????????????????"}}},"day":{"displayName":"?????????","relative":{"0":"??????????????????","1":"?????????????????????","2":"???????????????","-2":"?????????????????????","-1":"??????????????????"},"relativeTime":{"future":{"other":"??????????????? {0} ?????????"},"past":{"other":"{0} ?????????????????????"}}},"hour":{"displayName":"?????????????????????","relativeTime":{"future":{"other":"??????????????? {0} ?????????????????????"},"past":{"other":"{0} ?????????????????????????????????"}}},"minute":{"displayName":"????????????","relativeTime":{"future":{"other":"{0} ??????????????? 0 ????????????"},"past":{"other":"{0} ????????????????????????"}}},"second":{"displayName":"??????????????????","relative":{"0":"??????????????????"},"relativeTime":{"future":{"other":"??????????????? {0} ??????????????????"},"past":{"other":"{0} ??????????????????????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"lrc","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"????????","relative":{"0":"??????????","1":"????????????","-1":"????????????"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"????????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"??????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"lrc-IQ","parentLocale":"lrc"});

IntlRelativeFormat.__addLocaleData({"locale":"lt","pluralRuleFunction":function (n,ord){var s=String(n).split("."),f=s[1]||"",t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2);if(ord)return"other";return n10==1&&(n100<11||n100>19)?"one":n10>=2&&n10<=9&&(n100<11||n100>19)?"few":f!=0?"many":"other"},"fields":{"year":{"displayName":"metai","relative":{"0":"??iais metais","1":"kitais metais","-1":"pra??jusiais metais"},"relativeTime":{"future":{"one":"po {0} met??","few":"po {0} met??","many":"po {0} met??","other":"po {0} met??"},"past":{"one":"prie?? {0} metus","few":"prie?? {0} metus","many":"prie?? {0} met??","other":"prie?? {0} met??"}}},"month":{"displayName":"m??nuo","relative":{"0":"???? m??nes??","1":"kit?? m??nes??","-1":"pra??jus?? m??nes??"},"relativeTime":{"future":{"one":"po {0} m??nesio","few":"po {0} m??nesi??","many":"po {0} m??nesio","other":"po {0} m??nesi??"},"past":{"one":"prie?? {0} m??nes??","few":"prie?? {0} m??nesius","many":"prie?? {0} m??nesio","other":"prie?? {0} m??nesi??"}}},"day":{"displayName":"diena","relative":{"0":"??iandien","1":"rytoj","2":"poryt","-2":"u??vakar","-1":"vakar"},"relativeTime":{"future":{"one":"po {0} dienos","few":"po {0} dien??","many":"po {0} dienos","other":"po {0} dien??"},"past":{"one":"prie?? {0} dien??","few":"prie?? {0} dienas","many":"prie?? {0} dienos","other":"prie?? {0} dien??"}}},"hour":{"displayName":"valanda","relativeTime":{"future":{"one":"po {0} valandos","few":"po {0} valand??","many":"po {0} valandos","other":"po {0} valand??"},"past":{"one":"prie?? {0} valand??","few":"prie?? {0} valandas","many":"prie?? {0} valandos","other":"prie?? {0} valand??"}}},"minute":{"displayName":"minut??","relativeTime":{"future":{"one":"po {0} minut??s","few":"po {0} minu??i??","many":"po {0} minut??s","other":"po {0} minu??i??"},"past":{"one":"prie?? {0} minut??","few":"prie?? {0} minutes","many":"prie?? {0} minut??s","other":"prie?? {0} minu??i??"}}},"second":{"displayName":"sekund??","relative":{"0":"dabar"},"relativeTime":{"future":{"one":"po {0} sekund??s","few":"po {0} sekund??i??","many":"po {0} sekund??s","other":"po {0} sekund??i??"},"past":{"one":"prie?? {0} sekund??","few":"prie?? {0} sekundes","many":"prie?? {0} sekund??s","other":"prie?? {0} sekund??i??"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"lu","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Tshidimu","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Ngondo","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Dituku","relative":{"0":"Lelu","1":"Malaba","-1":"Makelela"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Diba","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Kasunsu","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Kasunsukusu","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"luo","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"higa","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"dwe","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"chieng???","relative":{"0":"kawuono","1":"kiny","-1":"nyoro"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"saa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"dakika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"nyiriri mar saa","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"luy","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Muhiga","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mweri","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Ridiku","relative":{"0":"Lero","1":"Mgamba","-1":"Mgorova"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Isaa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Idagika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"lv","pluralRuleFunction":function (n,ord){var s=String(n).split("."),f=s[1]||"",v=f.length,t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2),f100=f.slice(-2),f10=f.slice(-1);if(ord)return"other";return t0&&n10==0||n100>=11&&n100<=19||v==2&&(f100>=11&&f100<=19)?"zero":n10==1&&n100!=11||v==2&&f10==1&&f100!=11||v!=2&&f10==1?"one":"other"},"fields":{"year":{"displayName":"gads","relative":{"0":"??aj?? gad??","1":"n??kamaj?? gad??","-1":"pag??ju??aj?? gad??"},"relativeTime":{"future":{"zero":"p??c {0} gadiem","one":"p??c {0} gada","other":"p??c {0} gadiem"},"past":{"zero":"pirms {0} gadiem","one":"pirms {0} gada","other":"pirms {0} gadiem"}}},"month":{"displayName":"m??nesis","relative":{"0":"??aj?? m??nes??","1":"n??kamaj?? m??nes??","-1":"pag??ju??aj?? m??nes??"},"relativeTime":{"future":{"zero":"p??c {0} m??ne??iem","one":"p??c {0} m??ne??a","other":"p??c {0} m??ne??iem"},"past":{"zero":"pirms {0} m??ne??iem","one":"pirms {0} m??ne??a","other":"pirms {0} m??ne??iem"}}},"day":{"displayName":"diena","relative":{"0":"??odien","1":"r??t","2":"par??t","-2":"aizvakar","-1":"vakar"},"relativeTime":{"future":{"zero":"p??c {0} dien??m","one":"p??c {0} dienas","other":"p??c {0} dien??m"},"past":{"zero":"pirms {0} dien??m","one":"pirms {0} dienas","other":"pirms {0} dien??m"}}},"hour":{"displayName":"stundas","relativeTime":{"future":{"zero":"p??c {0} stund??m","one":"p??c {0} stundas","other":"p??c {0} stund??m"},"past":{"zero":"pirms {0} stund??m","one":"pirms {0} stundas","other":"pirms {0} stund??m"}}},"minute":{"displayName":"min??tes","relativeTime":{"future":{"zero":"p??c {0} min??t??m","one":"p??c {0} min??tes","other":"p??c {0} min??t??m"},"past":{"zero":"pirms {0} min??t??m","one":"pirms {0} min??tes","other":"pirms {0} min??t??m"}}},"second":{"displayName":"sekundes","relative":{"0":"tagad"},"relativeTime":{"future":{"zero":"p??c {0} sekund??m","one":"p??c {0} sekundes","other":"p??c {0} sekund??m"},"past":{"zero":"pirms {0} sekund??m","one":"pirms {0} sekundes","other":"pirms {0} sekund??m"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"mas","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"??l??r??","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"??l??p??","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"??nk??l??????","relative":{"0":"T??at??","1":"T????is??r??","-1":"??ol??"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"????s????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Old??kika??","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"mas-TZ","parentLocale":"mas"});

IntlRelativeFormat.__addLocaleData({"locale":"mer","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Mwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mweri","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Ntuk??","relative":{"0":"Narua","1":"R??j??","-1":"??goro"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"??thaa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Ndagika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekondi","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"mfe","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Lane","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mwa","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Zour","relative":{"0":"Zordi","1":"Demin","-1":"Yer"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Ler","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minit","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Segonn","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"mg","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==0||n==1?"one":"other"},"fields":{"year":{"displayName":"Taona","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Volana","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Andro","relative":{"0":"Anio","1":"Rahampitso","-1":"Omaly"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Ora","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minitra","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Segondra","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"mgh","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"yaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"mweri","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"nihuku","relative":{"0":"lel???lo","1":"me???llo","-1":"n???chana"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"isaa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"idakika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"isekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"mgo","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"fitu??","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"im??g","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"one":"+{0} m","other":"+{0} m"},"past":{"one":"-{0} m","other":"-{0} m"}}},"day":{"displayName":"an??g","relative":{"0":"t??ch??????","1":"isu","2":"isu ywi","-1":"ikwiri"},"relativeTime":{"future":{"one":"+{0} d","other":"+{0} d"},"past":{"one":"-{0} d","other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"one":"+{0} h","other":"+{0} h"},"past":{"one":"-{0} h","other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"one":"+{0} min","other":"+{0} min"},"past":{"one":"-{0} min","other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"one":"+{0} s","other":"+{0} s"},"past":{"one":"-{0} s","other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"mk","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],f=s[1]||"",v0=!s[1],i10=i.slice(-1),i100=i.slice(-2),f10=f.slice(-1);if(ord)return i10==1&&i100!=11?"one":i10==2&&i100!=12?"two":(i10==7||i10==8)&&i100!=17&&i100!=18?"many":"other";return v0&&i10==1||f10==1?"one":"other"},"fields":{"year":{"displayName":"????????????","relative":{"0":"???????? ????????????","1":"???????????????? ????????????","-1":"???????????????? ????????????"},"relativeTime":{"future":{"one":"???? {0} ????????????","other":"???? {0} ????????????"},"past":{"one":"???????? {0} ????????????","other":"???????? {0} ????????????"}}},"month":{"displayName":"??????????","relative":{"0":"???????? ??????????","1":"???????????????? ??????????","-1":"???????????????? ??????????"},"relativeTime":{"future":{"one":"???? {0} ??????????","other":"???? {0} ????????????"},"past":{"one":"???????? {0} ??????????","other":"???????? {0} ????????????"}}},"day":{"displayName":"??????","relative":{"0":"??????????","1":"????????","2":"??????????????","-2":"??????????????","-1":"??????????"},"relativeTime":{"future":{"one":"???? {0} ??????","other":"???? {0} ????????"},"past":{"one":"???????? {0} ??????","other":"???????? {0} ????????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"one":"???? {0} ??????","other":"???? {0} ????????"},"past":{"one":"???????? {0} ??????","other":"???????? {0} ????????"}}},"minute":{"displayName":"????????????","relativeTime":{"future":{"one":"???? {0} ????????????","other":"???? {0} ????????????"},"past":{"one":"???????? {0} ????????????","other":"???????? {0} ????????????"}}},"second":{"displayName":"??????????????","relative":{"0":"????????"},"relativeTime":{"future":{"one":"???? {0} ??????????????","other":"???? {0} ??????????????"},"past":{"one":"???????? {0} ??????????????","other":"???????? {0} ??????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ml","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"????????????","relative":{"0":"??? ???????????????","1":"??????????????????????????????","-1":"?????????????????? ????????????"},"relativeTime":{"future":{"one":"{0} ????????????????????????","other":"{0} ????????????????????????"},"past":{"one":"{0} ???????????? ??????????????????","other":"{0} ???????????? ??????????????????"}}},"month":{"displayName":"????????????","relative":{"0":"??? ????????????","1":"?????????????????? ????????????","-1":"?????????????????? ????????????"},"relativeTime":{"future":{"one":"{0} ????????????????????????","other":"{0} ????????????????????????"},"past":{"one":"{0} ???????????? ??????????????????","other":"{0} ???????????? ??????????????????"}}},"day":{"displayName":"???????????????","relative":{"0":"???????????????","1":"????????????","2":"???????????????????????????","-2":"????????????????????????????????????","-1":"??????????????????"},"relativeTime":{"future":{"one":"{0} ???????????????????????????","other":"{0} ???????????????????????????"},"past":{"one":"{0} ??????????????? ??????????????????","other":"{0} ??????????????? ??????????????????"}}},"hour":{"displayName":"????????????????????????","relativeTime":{"future":{"one":"{0} ??????????????????????????????","other":"{0} ??????????????????????????????"},"past":{"one":"{0} ???????????????????????? ??????????????????","other":"{0} ???????????????????????? ??????????????????"}}},"minute":{"displayName":"????????????????????????","relativeTime":{"future":{"one":"{0} ???????????????????????????","other":"{0} ???????????????????????????"},"past":{"one":"{0} ???????????????????????? ??????????????????","other":"{0} ???????????????????????? ??????????????????"}}},"second":{"displayName":"????????????????????????","relative":{"0":"??????????????????"},"relativeTime":{"future":{"one":"{0} ???????????????????????????","other":"{0} ???????????????????????????"},"past":{"one":"{0} ???????????????????????? ??????????????????","other":"{0} ???????????????????????? ??????????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"mn","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"?????? ??????","1":"???????? ??????","-1":"???????????????? ??????"},"relativeTime":{"future":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"},"past":{"one":"{0} ???????????? ????????","other":"{0} ???????????? ????????"}}},"month":{"displayName":"??????","relative":{"0":"?????? ??????","1":"???????? ??????","-1":"???????????????? ??????"},"relativeTime":{"future":{"one":"{0} ?????????? ??????????","other":"{0} ?????????? ??????????"},"past":{"one":"{0} ?????????? ????????","other":"{0} ?????????? ????????"}}},"day":{"displayName":"????????","relative":{"0":"??????????????","1":"??????????????","2":"????????????????","-2":"????????????????","-1":"??????????????"},"relativeTime":{"future":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"},"past":{"one":"{0} ???????????? ????????","other":"{0} ???????????? ????????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"},"past":{"one":"{0} ???????????? ????????","other":"{0} ???????????? ????????"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"one":"{0} ?????????????? ??????????","other":"{0} ?????????????? ??????????"},"past":{"one":"{0} ?????????????? ????????","other":"{0} ?????????????? ????????"}}},"second":{"displayName":"????????????","relative":{"0":"????????"},"relativeTime":{"future":{"one":"{0} ???????????????? ??????????","other":"{0} ???????????????? ??????????"},"past":{"one":"{0} ???????????????? ????????","other":"{0} ???????????????? ????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"mn-Mong","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"mo","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1],t0=Number(s[0])==n,n100=t0&&s[0].slice(-2);if(ord)return n==1?"one":"other";return n==1&&v0?"one":!v0||n==0||n!=1&&(n100>=1&&n100<=19)?"few":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"mr","pluralRuleFunction":function (n,ord){if(ord)return n==1?"one":n==2||n==3?"two":n==4?"few":"other";return n>=0&&n<=1?"one":"other"},"fields":{"year":{"displayName":"????????????","relative":{"0":"?????? ????????????","1":"??????????????? ????????????","-1":"??????????????? ????????????"},"relativeTime":{"future":{"one":"{0} ??????????????????????????????","other":"{0} ?????????????????????????????????"},"past":{"one":"{0} ?????????????????????????????????","other":"{0} ????????????????????????????????????"}}},"month":{"displayName":"???????????????","relative":{"0":"?????? ???????????????","1":"??????????????? ???????????????","-1":"??????????????? ???????????????"},"relativeTime":{"future":{"one":"{0} ????????????????????????????????????","other":"{0} ???????????????????????????????????????"},"past":{"one":"{0} ???????????????????????????????????????","other":"{0} ??????????????????????????????????????????"}}},"day":{"displayName":"????????????","relative":{"0":"??????","1":"???????????????","-1":"?????????"},"relativeTime":{"future":{"one":"{0} ??????????????????????????????","other":"{0} ?????????????????????????????????"},"past":{"one":"{0} ?????????????????????????????????","other":"{0} ????????????????????????????????????"}}},"hour":{"displayName":"?????????","relativeTime":{"future":{"one":"{0} ???????????????????????????","other":"{0} ??????????????????????????????"},"past":{"one":"{0} ??????????????????????????????","other":"{0} ?????????????????????????????????"}}},"minute":{"displayName":"???????????????","relativeTime":{"future":{"one":"{0} ?????????????????????????????????","other":"{0} ????????????????????????????????????"},"past":{"one":"{0} ????????????????????????????????????","other":"{0} ???????????????????????????????????????"}}},"second":{"displayName":"???????????????","relative":{"0":"???????????????"},"relativeTime":{"future":{"one":"{0} ?????????????????????????????????","other":"{0} ????????????????????????????????????"},"past":{"one":"{0} ????????????????????????????????????","other":"{0} ???????????????????????????????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ms","pluralRuleFunction":function (n,ord){if(ord)return n==1?"one":"other";return"other"},"fields":{"year":{"displayName":"Tahun","relative":{"0":"tahun ini","1":"tahun depan","-1":"tahun lepas"},"relativeTime":{"future":{"other":"dalam {0} saat"},"past":{"other":"{0} tahun lalu"}}},"month":{"displayName":"Bulan","relative":{"0":"bulan ini","1":"bulan depan","-1":"bulan lalu"},"relativeTime":{"future":{"other":"dalam {0} bulan"},"past":{"other":"{0} bulan lalu"}}},"day":{"displayName":"Hari","relative":{"0":"hari ini","1":"esok","2":"lusa","-2":"kelmarin","-1":"semalam"},"relativeTime":{"future":{"other":"dalam {0} hari"},"past":{"other":"{0} hari lalu"}}},"hour":{"displayName":"Jam","relativeTime":{"future":{"other":"dalam {0} jam"},"past":{"other":"{0} jam yang lalu"}}},"minute":{"displayName":"Minit","relativeTime":{"future":{"other":"dalam {0} minit"},"past":{"other":"{0} minit yang lalu"}}},"second":{"displayName":"Saat","relative":{"0":"sekarang"},"relativeTime":{"future":{"other":"dalam {0} saat"},"past":{"other":"{0} saat lalu"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ms-Arab","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ms-BN","parentLocale":"ms"});
IntlRelativeFormat.__addLocaleData({"locale":"ms-SG","parentLocale":"ms"});

IntlRelativeFormat.__addLocaleData({"locale":"mt","pluralRuleFunction":function (n,ord){var s=String(n).split("."),t0=Number(s[0])==n,n100=t0&&s[0].slice(-2);if(ord)return"other";return n==1?"one":n==0||n100>=2&&n100<=10?"few":n100>=11&&n100<=19?"many":"other"},"fields":{"year":{"displayName":"Sena","relative":{"0":"din is-sena","1":"Is-sena d-die??la","-1":"Is-sena li g??addiet"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"one":"{0} sena ilu","few":"{0} snin ilu","many":"{0} snin ilu","other":"{0} snin ilu"}}},"month":{"displayName":"Xahar","relative":{"0":"Dan ix-xahar","1":"Ix-xahar id-die??el","-1":"Ix-xahar li g??adda"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Jum","relative":{"0":"Illum","1":"G??ada","-1":"Ilbiera??"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Sieg??a","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minuta","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekonda","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"mua","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Syii","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"F??i","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Zah???nane\u002F Comme","relative":{"0":"T?????nahko","1":"T?????nane","-1":"T??soo"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Cok comme","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Cok comme ma la??ne","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Cok comme ma la?? t?? bi??","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"my","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"????????????","relative":{"0":"?????????????????????","1":"???????????????????????????","-1":"????????????????????????"},"relativeTime":{"future":{"other":"{0}??????????????????????????????"},"past":{"other":"??????????????????????????????{0}????????????"}}},"month":{"displayName":"???","relative":{"0":"????????????","1":"??????????????????","-1":"???????????????"},"relativeTime":{"future":{"other":"{0}?????????????????????"},"past":{"other":"??????????????????????????????{0}???"}}},"day":{"displayName":"?????????","relative":{"0":"????????????","1":"????????????????????????","2":"??????????????????","-2":"???????????????","-1":"???????????????"},"relativeTime":{"future":{"other":"{0}???????????????????????????"},"past":{"other":"??????????????????????????????{0}?????????"}}},"hour":{"displayName":"????????????","relativeTime":{"future":{"other":"{0}??????????????????????????????"},"past":{"other":"??????????????????????????????{0}????????????"}}},"minute":{"displayName":"???????????????","relativeTime":{"future":{"other":"{0}?????????????????????????????????"},"past":{"other":"??????????????????????????????{0}???????????????"}}},"second":{"displayName":"?????????????????????","relative":{"0":"?????????"},"relativeTime":{"future":{"other":"{0}???????????????????????????????????????"},"past":{"other":"??????????????????????????????{0}?????????????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"mzn","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"??????????","1":"?????? ????????","-1":"????????????"},"relativeTime":{"future":{"other":"{0} ?????? ??????"},"past":{"other":"{0} ?????? ??????"}}},"month":{"displayName":"??????","relative":{"0":"?????? ??????","1":"?????? ????????","-1":"?????? ??????"},"relativeTime":{"future":{"other":"{0} ?????? ??????"},"past":{"other":"{0} ?????? ??????"}}},"day":{"displayName":"??????","relative":{"0":"????????????","1":"??????????","-1":"??????????"},"relativeTime":{"future":{"other":"{0} ?????? ??????"},"past":{"other":"{0} ?????? ??????"}}},"hour":{"displayName":"??????????","relativeTime":{"future":{"other":"{0} ?????????? ??????"},"past":{"other":"{0} ?????????? ??????"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"other":"{0} ?????????? ??????"},"past":{"other":"{0} ???????? ??????"}}},"second":{"displayName":"??????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"{0} ?????????? ??????"},"past":{"other":"{0} ?????????? ??????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"nah","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"naq","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":n==2?"two":"other"},"fields":{"year":{"displayName":"Kurib","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"??Kh??b","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Tsees","relative":{"0":"Neetsee","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Iiri","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Haib","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"??G??ub","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"nb","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"??r","relative":{"0":"i ??r","1":"neste ??r","-1":"i fjor"},"relativeTime":{"future":{"one":"om {0} ??r","other":"om {0} ??r"},"past":{"one":"for {0} ??r siden","other":"for {0} ??r siden"}}},"month":{"displayName":"m??ned","relative":{"0":"denne m??neden","1":"neste m??ned","-1":"forrige m??ned"},"relativeTime":{"future":{"one":"om {0} m??ned","other":"om {0} m??neder"},"past":{"one":"for {0} m??ned siden","other":"for {0} m??neder siden"}}},"day":{"displayName":"dag","relative":{"0":"i dag","1":"i morgen","2":"i overmorgen","-2":"i forg??rs","-1":"i g??r"},"relativeTime":{"future":{"one":"om {0} d??gn","other":"om {0} d??gn"},"past":{"one":"for {0} d??gn siden","other":"for {0} d??gn siden"}}},"hour":{"displayName":"time","relativeTime":{"future":{"one":"om {0} time","other":"om {0} timer"},"past":{"one":"for {0} time siden","other":"for {0} timer siden"}}},"minute":{"displayName":"minutt","relativeTime":{"future":{"one":"om {0} minutt","other":"om {0} minutter"},"past":{"one":"for {0} minutt siden","other":"for {0} minutter siden"}}},"second":{"displayName":"sekund","relative":{"0":"n??"},"relativeTime":{"future":{"one":"om {0} sekund","other":"om {0} sekunder"},"past":{"one":"for {0} sekund siden","other":"for {0} sekunder siden"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"nb-SJ","parentLocale":"nb"});

IntlRelativeFormat.__addLocaleData({"locale":"nd","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Umnyaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Inyangacale","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Ilanga","relative":{"0":"Lamuhla","1":"Kusasa","-1":"Izolo"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Ihola","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Umuzuzu","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Isekendi","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ne","pluralRuleFunction":function (n,ord){var s=String(n).split("."),t0=Number(s[0])==n;if(ord)return t0&&n>=1&&n<=4?"one":"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"????????????","relative":{"0":"?????? ????????????","1":"??????????????? ????????????","-1":"??????????????? ????????????"},"relativeTime":{"future":{"one":"{0} ??????????????????","other":"{0} ??????????????????"},"past":{"one":"{0} ???????????? ?????????","other":"{0} ???????????? ?????????"}}},"month":{"displayName":"???????????????","relative":{"0":"?????? ???????????????","1":"??????????????? ???????????????","-1":"???????????? ???????????????"},"relativeTime":{"future":{"one":"{0} ?????????????????????","other":"{0} ?????????????????????"},"past":{"one":"{0} ??????????????? ???????????????","other":"{0} ??????????????? ???????????????"}}},"day":{"displayName":"?????????","relative":{"0":"??????","1":"????????????","2":"???????????????","-2":"???????????????","-1":"????????????"},"relativeTime":{"future":{"one":"{0} ???????????????","other":"{0} ???????????????"},"past":{"one":"{0} ????????? ???????????????","other":"{0} ????????? ???????????????"}}},"hour":{"displayName":"???????????????","relativeTime":{"future":{"one":"{0} ?????????????????????","other":"{0} ?????????????????????"},"past":{"one":"{0} ??????????????? ???????????????","other":"{0} ??????????????? ???????????????"}}},"minute":{"displayName":"???????????????","relativeTime":{"future":{"one":"{0} ?????????????????????","other":"{0} ?????????????????????"},"past":{"one":"{0} ??????????????? ???????????????","other":"{0} ??????????????? ???????????????"}}},"second":{"displayName":"?????????????????????","relative":{"0":"??????"},"relativeTime":{"future":{"one":"{0} ???????????????????????????","other":"{0} ???????????????????????????"},"past":{"one":"{0} ????????????????????? ???????????????","other":"{0} ????????????????????? ???????????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ne-IN","parentLocale":"ne"});

IntlRelativeFormat.__addLocaleData({"locale":"nl","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"jaar","relative":{"0":"dit jaar","1":"volgend jaar","-1":"vorig jaar"},"relativeTime":{"future":{"one":"over {0} jaar","other":"over {0} jaar"},"past":{"one":"{0} jaar geleden","other":"{0} jaar geleden"}}},"month":{"displayName":"maand","relative":{"0":"deze maand","1":"volgende maand","-1":"vorige maand"},"relativeTime":{"future":{"one":"over {0} maand","other":"over {0} maanden"},"past":{"one":"{0} maand geleden","other":"{0} maanden geleden"}}},"day":{"displayName":"dag","relative":{"0":"vandaag","1":"morgen","2":"overmorgen","-2":"eergisteren","-1":"gisteren"},"relativeTime":{"future":{"one":"over {0} dag","other":"over {0} dagen"},"past":{"one":"{0} dag geleden","other":"{0} dagen geleden"}}},"hour":{"displayName":"Uur","relativeTime":{"future":{"one":"over {0} uur","other":"over {0} uur"},"past":{"one":"{0} uur geleden","other":"{0} uur geleden"}}},"minute":{"displayName":"minuut","relativeTime":{"future":{"one":"over {0} minuut","other":"over {0} minuten"},"past":{"one":"{0} minuut geleden","other":"{0} minuten geleden"}}},"second":{"displayName":"seconde","relative":{"0":"nu"},"relativeTime":{"future":{"one":"over {0} seconde","other":"over {0} seconden"},"past":{"one":"{0} seconde geleden","other":"{0} seconden geleden"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"nl-AW","parentLocale":"nl"});
IntlRelativeFormat.__addLocaleData({"locale":"nl-BE","parentLocale":"nl"});
IntlRelativeFormat.__addLocaleData({"locale":"nl-BQ","parentLocale":"nl"});
IntlRelativeFormat.__addLocaleData({"locale":"nl-CW","parentLocale":"nl"});
IntlRelativeFormat.__addLocaleData({"locale":"nl-SR","parentLocale":"nl"});
IntlRelativeFormat.__addLocaleData({"locale":"nl-SX","parentLocale":"nl"});

IntlRelativeFormat.__addLocaleData({"locale":"nmg","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Mbvu","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Ngw??n","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Du??","relative":{"0":"D??l","1":"Nam??n??","-1":"Nakug??"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Wul??","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Mp??l??","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Nyi??l","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"nn","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"??r","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"one":"om {0} ??r","other":"om {0} ??r"},"past":{"one":"for {0} ??r siden","other":"for {0} ??r siden"}}},"month":{"displayName":"m??nad","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"one":"om {0} m??ned","other":"om {0} m??neder"},"past":{"one":"for {0} m??ned siden","other":"for {0} m??neder siden"}}},"day":{"displayName":"dag","relative":{"0":"i dag","1":"i morgon","2":"i overmorgon","-2":"i forg??rs","-1":"i g??r"},"relativeTime":{"future":{"one":"om {0} d??gn","other":"om {0} d??gn"},"past":{"one":"for {0} d??gn siden","other":"for {0} d??gn siden"}}},"hour":{"displayName":"time","relativeTime":{"future":{"one":"om {0} time","other":"om {0} timer"},"past":{"one":"for {0} time siden","other":"for {0} timer siden"}}},"minute":{"displayName":"minutt","relativeTime":{"future":{"one":"om {0} minutt","other":"om {0} minutter"},"past":{"one":"for {0} minutt siden","other":"for {0} minutter siden"}}},"second":{"displayName":"sekund","relative":{"0":"now"},"relativeTime":{"future":{"one":"om {0} sekund","other":"om {0} sekunder"},"past":{"one":"for {0} sekund siden","other":"for {0} sekunder siden"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"nnh","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"ng????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"ly??????","relative":{"0":"ly??????????n","1":"j???? g???ie ?? ne nt??o","-1":"j???? g???ie ?? ka t????g"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"f?????? n??m","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"no","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"nqo","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"nr","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"nso","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==0||n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"nus","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Ru????n","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Pay","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"C????","relative":{"0":"Wal??","1":"Ruun","-1":"Pan"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Thaak","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minit","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Th??k??ni","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ny","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"nyn","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Omwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Omwezi","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Eizooba","relative":{"0":"Erizooba","1":"Nyenkyakare","-1":"Nyomwabazyo"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Shaaha","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Edakiika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Obucweka\u002FEsekendi","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"om","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"om-KE","parentLocale":"om"});

IntlRelativeFormat.__addLocaleData({"locale":"or","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"os","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"??????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"??????","relative":{"0":"????????","1":"??????","2":"??????????????","-2":"??????????????????","-1":"????????"},"relativeTime":{"future":{"one":"{0} ???????? ??????????","other":"{0} ???????? ??????????"},"past":{"one":"{0} ?????? ????????????","other":"{0} ???????? ??????????"}}},"hour":{"displayName":"??????????","relativeTime":{"future":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"},"past":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"????????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"os-RU","parentLocale":"os"});

IntlRelativeFormat.__addLocaleData({"locale":"pa","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==0||n==1?"one":"other"},"fields":{"year":{"displayName":"?????????","relative":{"0":"?????? ?????????","1":"???????????? ?????????","-1":"??????????????? ?????????"},"relativeTime":{"future":{"one":"{0} ????????? ????????????","other":"{0} ??????????????? ????????????"},"past":{"one":"{0} ????????? ??????????????????","other":"{0} ????????? ??????????????????"}}},"month":{"displayName":"???????????????","relative":{"0":"?????? ???????????????","1":"???????????? ???????????????","-1":"??????????????? ???????????????"},"relativeTime":{"future":{"one":"{0} ??????????????? ????????????","other":"{0} ????????????????????? ????????????"},"past":{"one":"{0} ??????????????? ??????????????????","other":"{0} ??????????????? ??????????????????"}}},"day":{"displayName":"?????????","relative":{"0":"?????????","1":"????????????","-1":"??????????????? ???????????????"},"relativeTime":{"future":{"one":"{0} ????????? ????????????","other":"{0} ??????????????? ????????????"},"past":{"one":"{0} ????????? ??????????????????","other":"{0} ????????? ??????????????????"}}},"hour":{"displayName":"????????????","relativeTime":{"future":{"one":"{0} ???????????? ????????????","other":"{0} ?????????????????? ????????????"},"past":{"one":"{0} ???????????? ??????????????????","other":"{0} ???????????? ??????????????????"}}},"minute":{"displayName":"????????????","relativeTime":{"future":{"one":"{0} ???????????? ????????????","other":"{0} ?????????????????? ????????????"},"past":{"one":"{0} ???????????? ??????????????????","other":"{0} ???????????? ??????????????????"}}},"second":{"displayName":"???????????????","relative":{"0":"?????????"},"relativeTime":{"future":{"one":"{0} ??????????????? ????????????","other":"{0} ????????????????????? ????????????"},"past":{"one":"{0} ??????????????? ??????????????????","other":"{0} ??????????????? ??????????????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"pa-Arab","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"????????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"??????????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"??????","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"??????????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"??????","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"pa-Guru","parentLocale":"pa"});

IntlRelativeFormat.__addLocaleData({"locale":"pap","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"pl","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],v0=!s[1],i10=i.slice(-1),i100=i.slice(-2);if(ord)return"other";return n==1&&v0?"one":v0&&(i10>=2&&i10<=4)&&(i100<12||i100>14)?"few":v0&&i!=1&&(i10==0||i10==1)||v0&&(i10>=5&&i10<=9)||v0&&(i100>=12&&i100<=14)?"many":"other"},"fields":{"year":{"displayName":"rok","relative":{"0":"w tym roku","1":"w przysz??ym roku","-1":"w zesz??ym roku"},"relativeTime":{"future":{"one":"za {0} rok","few":"za {0} lata","many":"za {0} lat","other":"za {0} roku"},"past":{"one":"{0} rok temu","few":"{0} lata temu","many":"{0} lat temu","other":"{0} roku temu"}}},"month":{"displayName":"miesi??c","relative":{"0":"w tym miesi??cu","1":"w przysz??ym miesi??cu","-1":"w zesz??ym miesi??cu"},"relativeTime":{"future":{"one":"za {0} miesi??c","few":"za {0} miesi??ce","many":"za {0} miesi??cy","other":"za {0} miesi??ca"},"past":{"one":"{0} miesi??c temu","few":"{0} miesi??ce temu","many":"{0} miesi??cy temu","other":"{0} miesi??ca temu"}}},"day":{"displayName":"dzie??","relative":{"0":"dzisiaj","1":"jutro","2":"pojutrze","-2":"przedwczoraj","-1":"wczoraj"},"relativeTime":{"future":{"one":"za {0} dzie??","few":"za {0} dni","many":"za {0} dni","other":"za {0} dnia"},"past":{"one":"{0} dzie?? temu","few":"{0} dni temu","many":"{0} dni temu","other":"{0} dnia temu"}}},"hour":{"displayName":"godzina","relativeTime":{"future":{"one":"za {0} godzin??","few":"za {0} godziny","many":"za {0} godzin","other":"za {0} godziny"},"past":{"one":"{0} godzin?? temu","few":"{0} godziny temu","many":"{0} godzin temu","other":"{0} godziny temu"}}},"minute":{"displayName":"minuta","relativeTime":{"future":{"one":"za {0} minut??","few":"za {0} minuty","many":"za {0} minut","other":"za {0} minuty"},"past":{"one":"{0} minut?? temu","few":"{0} minuty temu","many":"{0} minut temu","other":"{0} minuty temu"}}},"second":{"displayName":"sekunda","relative":{"0":"teraz"},"relativeTime":{"future":{"one":"za {0} sekund??","few":"za {0} sekundy","many":"za {0} sekund","other":"za {0} sekundy"},"past":{"one":"{0} sekund?? temu","few":"{0} sekundy temu","many":"{0} sekund temu","other":"{0} sekundy temu"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"prg","pluralRuleFunction":function (n,ord){var s=String(n).split("."),f=s[1]||"",v=f.length,t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2),f100=f.slice(-2),f10=f.slice(-1);if(ord)return"other";return t0&&n10==0||n100>=11&&n100<=19||v==2&&(f100>=11&&f100<=19)?"zero":n10==1&&n100!=11||v==2&&f10==1&&f100!=11||v!=2&&f10==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ps","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"pt","pluralRuleFunction":function (n,ord){var s=String(n).split("."),t0=Number(s[0])==n;if(ord)return"other";return t0&&n>=0&&n<=2&&n!=2?"one":"other"},"fields":{"year":{"displayName":"ano","relative":{"0":"este ano","1":"pr??ximo ano","-1":"ano passado"},"relativeTime":{"future":{"one":"em {0} ano","other":"em {0} anos"},"past":{"one":"h?? {0} ano","other":"h?? {0} anos"}}},"month":{"displayName":"m??s","relative":{"0":"este m??s","1":"pr??ximo m??s","-1":"m??s passado"},"relativeTime":{"future":{"one":"em {0} m??s","other":"em {0} meses"},"past":{"one":"h?? {0} m??s","other":"h?? {0} meses"}}},"day":{"displayName":"dia","relative":{"0":"hoje","1":"amanh??","2":"depois de amanh??","-2":"anteontem","-1":"ontem"},"relativeTime":{"future":{"one":"em {0} dia","other":"em {0} dias"},"past":{"one":"h?? {0} dia","other":"h?? {0} dias"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"em {0} hora","other":"em {0} horas"},"past":{"one":"h?? {0} hora","other":"h?? {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"em {0} minuto","other":"em {0} minutos"},"past":{"one":"h?? {0} minuto","other":"h?? {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"agora"},"relativeTime":{"future":{"one":"em {0} segundo","other":"em {0} segundos"},"past":{"one":"h?? {0} segundo","other":"h?? {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"pt-AO","parentLocale":"pt-PT"});
IntlRelativeFormat.__addLocaleData({"locale":"pt-PT","parentLocale":"pt","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"ano","relative":{"0":"este ano","1":"pr??ximo ano","-1":"ano passado"},"relativeTime":{"future":{"one":"dentro de {0} ano","other":"dentro de {0} anos"},"past":{"one":"h?? {0} ano","other":"h?? {0} anos"}}},"month":{"displayName":"m??s","relative":{"0":"este m??s","1":"pr??ximo m??s","-1":"m??s passado"},"relativeTime":{"future":{"one":"dentro de {0} m??s","other":"dentro de {0} meses"},"past":{"one":"h?? {0} m??s","other":"h?? {0} meses"}}},"day":{"displayName":"dia","relative":{"0":"hoje","1":"amanh??","2":"depois de amanh??","-2":"anteontem","-1":"ontem"},"relativeTime":{"future":{"one":"dentro de {0} dia","other":"dentro de {0} dias"},"past":{"one":"h?? {0} dia","other":"h?? {0} dias"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"h?? {0} hora","other":"h?? {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"h?? {0} minuto","other":"h?? {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"agora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"h?? {0} segundo","other":"h?? {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"pt-CV","parentLocale":"pt-PT"});
IntlRelativeFormat.__addLocaleData({"locale":"pt-GW","parentLocale":"pt-PT"});
IntlRelativeFormat.__addLocaleData({"locale":"pt-MO","parentLocale":"pt-PT"});
IntlRelativeFormat.__addLocaleData({"locale":"pt-MZ","parentLocale":"pt-PT"});
IntlRelativeFormat.__addLocaleData({"locale":"pt-ST","parentLocale":"pt-PT"});
IntlRelativeFormat.__addLocaleData({"locale":"pt-TL","parentLocale":"pt-PT"});

IntlRelativeFormat.__addLocaleData({"locale":"qu","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"qu-BO","parentLocale":"qu"});
IntlRelativeFormat.__addLocaleData({"locale":"qu-EC","parentLocale":"qu"});

IntlRelativeFormat.__addLocaleData({"locale":"rm","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"onn","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"mais","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Tag","relative":{"0":"oz","1":"damaun","2":"puschmaun","-2":"stersas","-1":"ier"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"ura","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"minuta","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"secunda","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"rn","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Umwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Ukwezi","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Umusi","relative":{"0":"Uyu musi","1":"Ejo (hazoza)","-1":"Ejo (haheze)"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Isaha","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Umunota","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Isegonda","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ro","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1],t0=Number(s[0])==n,n100=t0&&s[0].slice(-2);if(ord)return n==1?"one":"other";return n==1&&v0?"one":!v0||n==0||n!=1&&(n100>=1&&n100<=19)?"few":"other"},"fields":{"year":{"displayName":"An","relative":{"0":"anul acesta","1":"anul viitor","-1":"anul trecut"},"relativeTime":{"future":{"one":"peste {0} an","few":"peste {0} ani","other":"peste {0} de ani"},"past":{"one":"acum {0} an","few":"acum {0} ani","other":"acum {0} de ani"}}},"month":{"displayName":"Lun??","relative":{"0":"luna aceasta","1":"luna viitoare","-1":"luna trecut??"},"relativeTime":{"future":{"one":"peste {0} lun??","few":"peste {0} luni","other":"peste {0} de luni"},"past":{"one":"acum {0} lun??","few":"acum {0} luni","other":"acum {0} de luni"}}},"day":{"displayName":"Zi","relative":{"0":"azi","1":"m??ine","2":"poim??ine","-2":"alalt??ieri","-1":"ieri"},"relativeTime":{"future":{"one":"peste {0} zi","few":"peste {0} zile","other":"peste {0} de zile"},"past":{"one":"acum {0} zi","few":"acum {0} zile","other":"acum {0} de zile"}}},"hour":{"displayName":"Or??","relativeTime":{"future":{"one":"peste {0} or??","few":"peste {0} ore","other":"peste {0} de ore"},"past":{"one":"acum {0} or??","few":"acum {0} ore","other":"acum {0} de ore"}}},"minute":{"displayName":"Minut","relativeTime":{"future":{"one":"peste {0} minut","few":"peste {0} minute","other":"peste {0} de minute"},"past":{"one":"acum {0} minut","few":"acum {0} minute","other":"acum {0} de minute"}}},"second":{"displayName":"Secund??","relative":{"0":"acum"},"relativeTime":{"future":{"one":"peste {0} secund??","few":"peste {0} secunde","other":"peste {0} de secunde"},"past":{"one":"acum {0} secund??","few":"acum {0} secunde","other":"acum {0} de secunde"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ro-MD","parentLocale":"ro"});

IntlRelativeFormat.__addLocaleData({"locale":"rof","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Muaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mweri","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Mfiri","relative":{"0":"Linu","1":"Ng???ama","-1":"Hiyo"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Isaa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Dakika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ru","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],v0=!s[1],i10=i.slice(-1),i100=i.slice(-2);if(ord)return"other";return v0&&i10==1&&i100!=11?"one":v0&&(i10>=2&&i10<=4)&&(i100<12||i100>14)?"few":v0&&i10==0||v0&&(i10>=5&&i10<=9)||v0&&(i100>=11&&i100<=14)?"many":"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"?? ???????? ????????","1":"?? ?????????????????? ????????","-1":"?? ?????????????? ????????"},"relativeTime":{"future":{"one":"?????????? {0} ??????","few":"?????????? {0} ????????","many":"?????????? {0} ??????","other":"?????????? {0} ????????"},"past":{"one":"{0} ?????? ??????????","few":"{0} ???????? ??????????","many":"{0} ?????? ??????????","other":"{0} ???????? ??????????"}}},"month":{"displayName":"??????????","relative":{"0":"?? ???????? ????????????","1":"?? ?????????????????? ????????????","-1":"?? ?????????????? ????????????"},"relativeTime":{"future":{"one":"?????????? {0} ??????????","few":"?????????? {0} ????????????","many":"?????????? {0} ??????????????","other":"?????????? {0} ????????????"},"past":{"one":"{0} ?????????? ??????????","few":"{0} ???????????? ??????????","many":"{0} ?????????????? ??????????","other":"{0} ???????????? ??????????"}}},"day":{"displayName":"????????","relative":{"0":"??????????????","1":"????????????","2":"??????????????????????","-2":"??????????????????","-1":"??????????"},"relativeTime":{"future":{"one":"?????????? {0} ????????","few":"?????????? {0} ??????","many":"?????????? {0} ????????","other":"?????????? {0} ????????"},"past":{"one":"{0} ???????? ??????????","few":"{0} ?????? ??????????","many":"{0} ???????? ??????????","other":"{0} ?????? ??????????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"one":"?????????? {0} ??????","few":"?????????? {0} ????????","many":"?????????? {0} ??????????","other":"?????????? {0} ????????"},"past":{"one":"{0} ?????? ??????????","few":"{0} ???????? ??????????","many":"{0} ?????????? ??????????","other":"{0} ???????? ??????????"}}},"minute":{"displayName":"????????????","relativeTime":{"future":{"one":"?????????? {0} ????????????","few":"?????????? {0} ????????????","many":"?????????? {0} ??????????","other":"?????????? {0} ????????????"},"past":{"one":"{0} ???????????? ??????????","few":"{0} ???????????? ??????????","many":"{0} ?????????? ??????????","other":"{0} ???????????? ??????????"}}},"second":{"displayName":"??????????????","relative":{"0":"????????????"},"relativeTime":{"future":{"one":"?????????? {0} ??????????????","few":"?????????? {0} ??????????????","many":"?????????? {0} ????????????","other":"?????????? {0} ??????????????"},"past":{"one":"{0} ?????????????? ??????????","few":"{0} ?????????????? ??????????","many":"{0} ???????????? ??????????","other":"{0} ?????????????? ??????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ru-BY","parentLocale":"ru"});
IntlRelativeFormat.__addLocaleData({"locale":"ru-KG","parentLocale":"ru"});
IntlRelativeFormat.__addLocaleData({"locale":"ru-KZ","parentLocale":"ru"});
IntlRelativeFormat.__addLocaleData({"locale":"ru-MD","parentLocale":"ru"});
IntlRelativeFormat.__addLocaleData({"locale":"ru-UA","parentLocale":"ru"});

IntlRelativeFormat.__addLocaleData({"locale":"rw","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"rwk","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Maka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mori","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Mfiri","relative":{"0":"Inu","1":"Ngama","-1":"Ukou"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Saa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Dakyika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"sah","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"???? ??????","1":"?????????? ??????","-1":"???????????? ??????"},"relativeTime":{"future":{"other":"{0} ??????????????"},"past":{"other":"{0} ?????? ???????????? ??????????????"}}},"month":{"displayName":"????","relative":{"0":"???? ????","1":"???????????????? ????","-1":"???????????? ????"},"relativeTime":{"future":{"other":"{0} ????????????"},"past":{"other":"{0} ???? ???????????? ??????????????"}}},"day":{"displayName":"??????","relative":{"0":"??????????","1":"????????????","2":"??????????","-2":"?????????????? ??????","-1":"??????????????"},"relativeTime":{"future":{"other":"{0} ??????????????"},"past":{"other":"{0} ?????? ???????????? ??????????????"}}},"hour":{"displayName":"????????","relativeTime":{"future":{"other":"{0} ????????????????"},"past":{"other":"{0} ???????? ???????????? ??????????????"}}},"minute":{"displayName":"??????????????","relativeTime":{"future":{"other":"{0} ??????????????????????"},"past":{"other":"{0} ?????????????? ???????????? ??????????????"}}},"second":{"displayName":"????????????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"{0} ????????????????????????"},"past":{"other":"{0} ???????????????? ???????????? ??????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"saq","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Lari","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Lapa","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Mpari","relative":{"0":"Duo","1":"Taisere","-1":"Ng???ole"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Saai","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Idakika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Isekondi","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"sbp","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Mwakha","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mwesi","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Lusiku","relative":{"0":"Ineng???uni","1":"Pamulaawu","-1":"Imehe"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Ilisala","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Idakika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Isekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"sdh","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"se","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":n==2?"two":"other"},"fields":{"year":{"displayName":"j??hki","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"one":"{0} jahki ma????ilit","two":"{0} jahkki ma????ilit","other":"{0} jahkki ma????ilit"},"past":{"one":"{0} jahki ??rat","two":"{0} jahkki ??rat","other":"{0} jahkki ??rat"}}},"month":{"displayName":"m??nnu","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"one":"{0} m??notbadji ma????ilit","two":"{0} m??notbadji ma????ilit","other":"{0} m??notbadji ma????ilit"},"past":{"one":"{0} m??notbadji ??rat","two":"{0} m??notbadji ??rat","other":"{0} m??notbadji ??rat"}}},"day":{"displayName":"beaivi","relative":{"0":"odne","1":"ihttin","2":"paijeelitt????","-2":"oovdebpeivvi","-1":"ikte"},"relativeTime":{"future":{"one":"{0} j??ndor ma????ilit","two":"{0} j??ndor ama????ilit","other":"{0} j??ndora ma????ilit"},"past":{"one":"{0} j??ndor ??rat","two":"{0} j??ndora ??rat","other":"{0} j??ndora ??rat"}}},"hour":{"displayName":"diibmu","relativeTime":{"future":{"one":"{0} diibmu ma????ilit","two":"{0} diibmur ma????ilit","other":"{0} diibmur ma????ilit"},"past":{"one":"{0} diibmu ??rat","two":"{0} diibmur ??rat","other":"{0} diibmur ??rat"}}},"minute":{"displayName":"minuhtta","relativeTime":{"future":{"one":"{0} minuhta ma????ilit","two":"{0} minuhtta ma????ilit","other":"{0} minuhtta ma????ilit"},"past":{"one":"{0} minuhta ??rat","two":"{0} minuhtta ??rat","other":"{0} minuhtta ??rat"}}},"second":{"displayName":"sekunda","relative":{"0":"now"},"relativeTime":{"future":{"one":"{0} sekunda ma????ilit","two":"{0} sekundda ma????ilit","other":"{0} sekundda ma????ilit"},"past":{"one":"{0} sekunda ??rat","two":"{0} sekundda ??rat","other":"{0} sekundda ??rat"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"se-FI","parentLocale":"se","fields":{"year":{"displayName":"jahki","relative":{"0":"d??n jagi","1":"boahtte jagi","-1":"mannan jagi"},"relativeTime":{"future":{"one":"{0} jagi siste","two":"{0} jagi siste","other":"{0} jagi siste"},"past":{"one":"{0} jagi ??rat","two":"{0} jagi ??rat","other":"{0} jagi ??rat"}}},"month":{"displayName":"m??nnu","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"one":"{0} m??notbadji ma????ilit","two":"{0} m??notbadji ma????ilit","other":"{0} m??notbadji ma????ilit"},"past":{"one":"{0} m??notbadji ??rat","two":"{0} m??notbadji ??rat","other":"{0} m??notbadji ??rat"}}},"day":{"displayName":"beaivi","relative":{"0":"odne","1":"ihttin","2":"paijeelitt????","-2":"oovdebpeivvi","-1":"ikte"},"relativeTime":{"future":{"one":"{0} j??ndor ma????ilit","two":"{0} j??ndor ama????ilit","other":"{0} j??ndora ma????ilit"},"past":{"one":"{0} j??ndor ??rat","two":"{0} j??ndora ??rat","other":"{0} j??ndora ??rat"}}},"hour":{"displayName":"diibmu","relativeTime":{"future":{"one":"{0} diibmu ma????ilit","two":"{0} diibmur ma????ilit","other":"{0} diibmur ma????ilit"},"past":{"one":"{0} diibmu ??rat","two":"{0} diibmur ??rat","other":"{0} diibmur ??rat"}}},"minute":{"displayName":"minuhtta","relativeTime":{"future":{"one":"{0} minuhta ma????ilit","two":"{0} minuhtta ma????ilit","other":"{0} minuhtta ma????ilit"},"past":{"one":"{0} minuhta ??rat","two":"{0} minuhtta ??rat","other":"{0} minuhtta ??rat"}}},"second":{"displayName":"sekunda","relative":{"0":"now"},"relativeTime":{"future":{"one":"{0} sekunda ma????ilit","two":"{0} sekundda ma????ilit","other":"{0} sekundda ma????ilit"},"past":{"one":"{0} sekunda ??rat","two":"{0} sekundda ??rat","other":"{0} sekundda ??rat"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"se-SE","parentLocale":"se"});

IntlRelativeFormat.__addLocaleData({"locale":"seh","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Chaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mwezi","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Ntsiku","relative":{"0":"Lero","1":"Manguana","-1":"Zuro"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hora","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minuto","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Segundo","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ses","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Jiiri","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Handu","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Zaari","relative":{"0":"H??o","1":"Suba","-1":"Bi"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Guuru","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Miniti","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Miti","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"sg","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Ng??","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Nze","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"L??","relative":{"0":"L??s??","1":"K??ker??ke","-1":"B??r??"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Ngbonga","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Ndur?? ngbonga","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Nz??na ngbonga","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"sh","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],f=s[1]||"",v0=!s[1],i10=i.slice(-1),i100=i.slice(-2),f10=f.slice(-1),f100=f.slice(-2);if(ord)return"other";return v0&&i10==1&&i100!=11||f10==1&&f100!=11?"one":v0&&(i10>=2&&i10<=4)&&(i100<12||i100>14)||f10>=2&&f10<=4&&(f100<12||f100>14)?"few":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"shi","pluralRuleFunction":function (n,ord){var s=String(n).split("."),t0=Number(s[0])==n;if(ord)return"other";return n>=0&&n<=1?"one":t0&&n>=2&&n<=10?"few":"other"},"fields":{"year":{"displayName":"?????????????????????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"???????????????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"?????????","relative":{"0":"????????????","1":"???????????????","-1":"???????????????"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"?????????????????????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"?????????????????????","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"??????????????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"shi-Latn","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"asgg??as","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"ayyur","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"ass","relative":{"0":"assa","1":"askka","-1":"i???lli"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"tasragt","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"tusdidt","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"tasint","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"shi-Tfng","parentLocale":"shi"});

IntlRelativeFormat.__addLocaleData({"locale":"si","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],f=s[1]||"";if(ord)return"other";return n==0||n==1||i==0&&f==1?"one":"other"},"fields":{"year":{"displayName":"???????????????","relative":{"0":"????????? ?????????","1":"????????? ?????????","-1":"?????????????????? ?????????"},"relativeTime":{"future":{"one":"????????? {0} ????????????","other":"????????? {0} ????????????"},"past":{"one":"????????? {0}??? ?????????","other":"????????? {0}??? ?????????"}}},"month":{"displayName":"????????????","relative":{"0":"????????? ????????????","1":"????????? ????????????","-1":"?????????????????? ????????????"},"relativeTime":{"future":{"one":"????????? {0}????????????","other":"????????? {0}????????????"},"past":{"one":"????????? {0}?????? ?????????","other":"????????? {0}?????? ?????????"}}},"day":{"displayName":"????????????","relative":{"0":"??????","1":"?????????","2":"?????????????????????","-2":"??????????????????","-1":"?????????"},"relativeTime":{"future":{"one":"????????? {0}??????","other":"????????? {0}??????"},"past":{"one":"????????? {0} ??? ?????????","other":"????????? {0} ??? ?????????"}}},"hour":{"displayName":"?????????","relativeTime":{"future":{"one":"????????? {0} ????????????","other":"????????? {0} ????????????"},"past":{"one":"????????? {0}??? ?????????","other":"????????? {0}??? ?????????"}}},"minute":{"displayName":"???????????????????????????","relativeTime":{"future":{"one":"???????????????????????? {0} ????????????","other":"???????????????????????? {0} ????????????"},"past":{"one":"???????????????????????? {0}??? ?????????","other":"???????????????????????? {0}??? ?????????"}}},"second":{"displayName":"??????????????????","relative":{"0":"????????????"},"relativeTime":{"future":{"one":"??????????????? {0} ????????????","other":"??????????????? {0} ????????????"},"past":{"one":"??????????????? {0}?????? ?????????","other":"??????????????? {0}?????? ?????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"sk","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],v0=!s[1];if(ord)return"other";return n==1&&v0?"one":i>=2&&i<=4&&v0?"few":!v0?"many":"other"},"fields":{"year":{"displayName":"rok","relative":{"0":"tento rok","1":"bud??ci rok","-1":"minul?? rok"},"relativeTime":{"future":{"one":"o {0} rok","few":"o {0} roky","many":"o {0} roka","other":"o {0} rokov"},"past":{"one":"pred {0} rokom","few":"pred {0} rokmi","many":"pred {0} roka","other":"pred {0} rokmi"}}},"month":{"displayName":"mesiac","relative":{"0":"tento mesiac","1":"bud??ci mesiac","-1":"minul?? mesiac"},"relativeTime":{"future":{"one":"o {0} mesiac","few":"o {0} mesiace","many":"o {0} mesiaca","other":"o {0} mesiacov"},"past":{"one":"pred {0} mesiacom","few":"pred {0} mesiacmi","many":"pred {0} mesiaca","other":"pred {0} mesiacmi"}}},"day":{"displayName":"de??","relative":{"0":"dnes","1":"zajtra","2":"pozajtra","-2":"predv??erom","-1":"v??era"},"relativeTime":{"future":{"one":"o {0} de??","few":"o {0} dni","many":"o {0} d??a","other":"o {0} dn??"},"past":{"one":"pred {0} d??om","few":"pred {0} d??ami","many":"pred {0} d??a","other":"pred {0} d??ami"}}},"hour":{"displayName":"hodina","relativeTime":{"future":{"one":"o {0} hodinu","few":"o {0} hodiny","many":"o {0} hodiny","other":"o {0} hod??n"},"past":{"one":"pred {0} hodinou","few":"pred {0} hodinami","many":"pred {0} hodinou","other":"pred {0} hodinami"}}},"minute":{"displayName":"min??ta","relativeTime":{"future":{"one":"o {0} min??tu","few":"o {0} min??ty","many":"o {0} min??ty","other":"o {0} min??t"},"past":{"one":"pred {0} min??tou","few":"pred {0} min??tami","many":"pred {0} min??ty","other":"pred {0} min??tami"}}},"second":{"displayName":"sekunda","relative":{"0":"teraz"},"relativeTime":{"future":{"one":"o {0} sekundu","few":"o {0} sekundy","many":"o {0} sekundy","other":"o {0} sek??nd"},"past":{"one":"pred {0} sekundou","few":"pred {0} sekundami","many":"pred {0} sekundy","other":"pred {0} sekundami"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"sl","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],v0=!s[1],i100=i.slice(-2);if(ord)return"other";return v0&&i100==1?"one":v0&&i100==2?"two":v0&&(i100==3||i100==4)||!v0?"few":"other"},"fields":{"year":{"displayName":"leto","relative":{"0":"letos","1":"naslednje leto","-1":"lani"},"relativeTime":{"future":{"one":"??ez {0} leto","two":"??ez {0} leti","few":"??ez {0} leta","other":"??ez {0} let"},"past":{"one":"pred {0} letom","two":"pred {0} letoma","few":"pred {0} leti","other":"pred {0} leti"}}},"month":{"displayName":"mesec","relative":{"0":"ta mesec","1":"naslednji mesec","-1":"prej??nji mesec"},"relativeTime":{"future":{"one":"??ez {0} mesec","two":"??ez {0} meseca","few":"??ez {0} mesece","other":"??ez {0} mesecev"},"past":{"one":"pred {0} mesecem","two":"pred {0} mesecema","few":"pred {0} meseci","other":"pred {0} meseci"}}},"day":{"displayName":"Dan","relative":{"0":"danes","1":"jutri","2":"pojutri??njem","-2":"predv??eraj??njim","-1":"v??eraj"},"relativeTime":{"future":{"one":"??ez {0} dan","two":"??ez {0} dneva","few":"??ez {0} dni","other":"??ez {0} dni"},"past":{"one":"pred {0} dnevom","two":"pred {0} dnevoma","few":"pred {0} dnevi","other":"pred {0} dnevi"}}},"hour":{"displayName":"ura","relativeTime":{"future":{"one":"??ez {0} uro","two":"??ez {0} uri","few":"??ez {0} ure","other":"??ez {0} ur"},"past":{"one":"pred {0} uro","two":"pred {0} urama","few":"pred {0} urami","other":"pred {0} urami"}}},"minute":{"displayName":"minuta","relativeTime":{"future":{"one":"??ez {0} minuto","two":"??ez {0} minuti","few":"??ez {0} minute","other":"??ez {0} minut"},"past":{"one":"pred {0} minuto","two":"pred {0} minutama","few":"pred {0} minutami","other":"pred {0} minutami"}}},"second":{"displayName":"sekunda","relative":{"0":"zdaj"},"relativeTime":{"future":{"one":"??ez {0} sekundo","two":"??ez {0} sekundi","few":"??ez {0} sekunde","other":"??ez {0} sekund"},"past":{"one":"pred {0} sekundo","two":"pred {0} sekundama","few":"pred {0} sekundami","other":"pred {0} sekundami"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"sma","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":n==2?"two":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"smi","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":n==2?"two":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"smj","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":n==2?"two":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"smn","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":n==2?"two":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"sms","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":n==2?"two":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"sn","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Gore","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mwedzi","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Zuva","relative":{"0":"Nhasi","1":"Mangwana","-1":"Nezuro"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Awa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Mineti","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekondi","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"so","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Sanad","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Bil","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Maalin","relative":{"0":"Maanta","1":"Berri","-1":"Shalay"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Saacad","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Daqiiqad","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Il biriqsi","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"so-DJ","parentLocale":"so"});
IntlRelativeFormat.__addLocaleData({"locale":"so-ET","parentLocale":"so"});
IntlRelativeFormat.__addLocaleData({"locale":"so-KE","parentLocale":"so"});

IntlRelativeFormat.__addLocaleData({"locale":"sq","pluralRuleFunction":function (n,ord){var s=String(n).split("."),t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2);if(ord)return n==1?"one":n10==4&&n100!=14?"many":"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"vit","relative":{"0":"k??t?? vit","1":"vitin e ardhsh??m","-1":"vitin e kaluar"},"relativeTime":{"future":{"one":"pas {0} viti","other":"pas {0} vjet??sh"},"past":{"one":"{0} vit m?? par??","other":"{0} vjet m?? par??"}}},"month":{"displayName":"muaj","relative":{"0":"k??t?? muaj","1":"muajin e ardhsh??m","-1":"muajin e kaluar"},"relativeTime":{"future":{"one":"pas {0} muaji","other":"pas {0} muajsh"},"past":{"one":"{0} muaj m?? par??","other":"{0} muaj m?? par??"}}},"day":{"displayName":"dit??","relative":{"0":"sot","1":"nes??r","-1":"dje"},"relativeTime":{"future":{"one":"pas {0} dite","other":"pas {0} dit??sh"},"past":{"one":"{0} dit?? m?? par??","other":"{0} dit?? m?? par??"}}},"hour":{"displayName":"or??","relativeTime":{"future":{"one":"pas {0} ore","other":"pas {0} or??sh"},"past":{"one":"{0} or?? m?? par??","other":"{0} or?? m?? par??"}}},"minute":{"displayName":"minut??","relativeTime":{"future":{"one":"pas {0} minute","other":"pas {0} minutash"},"past":{"one":"{0} minut?? m?? par??","other":"{0} minuta m?? par??"}}},"second":{"displayName":"sekond??","relative":{"0":"tani"},"relativeTime":{"future":{"one":"pas {0} sekonde","other":"pas {0} sekondash"},"past":{"one":"{0} sekond?? m?? par??","other":"{0} sekonda m?? par??"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"sq-MK","parentLocale":"sq"});
IntlRelativeFormat.__addLocaleData({"locale":"sq-XK","parentLocale":"sq"});

IntlRelativeFormat.__addLocaleData({"locale":"sr","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],f=s[1]||"",v0=!s[1],i10=i.slice(-1),i100=i.slice(-2),f10=f.slice(-1),f100=f.slice(-2);if(ord)return"other";return v0&&i10==1&&i100!=11||f10==1&&f100!=11?"one":v0&&(i10>=2&&i10<=4)&&(i100<12||i100>14)||f10>=2&&f10<=4&&(f100<12||f100>14)?"few":"other"},"fields":{"year":{"displayName":"????????????","relative":{"0":"?????? ????????????","1":"?????????????? ????????????","-1":"???????????? ????????????"},"relativeTime":{"future":{"one":"???? {0} ????????????","few":"???? {0} ????????????","other":"???? {0} ????????????"},"past":{"one":"?????? {0} ????????????","few":"?????? {0} ????????????","other":"?????? {0} ????????????"}}},"month":{"displayName":"??????????","relative":{"0":"???????? ????????????","1":"???????????????? ????????????","-1":"?????????????? ????????????"},"relativeTime":{"future":{"one":"???? {0} ??????????","few":"???? {0} ????????????","other":"???? {0} ????????????"},"past":{"one":"?????? {0} ????????????","few":"?????? {0} ????????????","other":"?????? {0} ????????????"}}},"day":{"displayName":"??????","relative":{"0":"??????????","1":"??????????","2":"????????????????????","-2":"????????????????","-1":"????????"},"relativeTime":{"future":{"one":"???? {0} ??????","few":"???? {0} ????????","other":"???? {0} ????????"},"past":{"one":"?????? {0} ????????","few":"?????? {0} ????????","other":"?????? {0} ????????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"one":"???? {0} ??????","few":"???? {0} ????????","other":"???? {0} ????????"},"past":{"one":"?????? {0} ????????","few":"?????? {0} ????????","other":"?????? {0} ????????"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"one":"???? {0} ??????????","few":"???? {0} ????????????","other":"???? {0} ????????????"},"past":{"one":"?????? {0} ????????????","few":"?????? {0} ????????????","other":"?????? {0} ????????????"}}},"second":{"displayName":"????????????","relative":{"0":"????????"},"relativeTime":{"future":{"one":"???? {0} ??????????????","few":"???? {0} ??????????????","other":"???? {0} ??????????????"},"past":{"one":"?????? {0} ??????????????","few":"?????? {0} ??????????????","other":"?????? {0} ??????????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"sr-Cyrl","parentLocale":"sr"});
IntlRelativeFormat.__addLocaleData({"locale":"sr-Cyrl-BA","parentLocale":"sr-Cyrl"});
IntlRelativeFormat.__addLocaleData({"locale":"sr-Cyrl-ME","parentLocale":"sr-Cyrl"});
IntlRelativeFormat.__addLocaleData({"locale":"sr-Cyrl-XK","parentLocale":"sr-Cyrl"});
IntlRelativeFormat.__addLocaleData({"locale":"sr-Latn","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"godina","relative":{"0":"ove godine","1":"slede??e godine","-1":"pro??le godine"},"relativeTime":{"future":{"one":"za {0} godinu","few":"za {0} godine","other":"za {0} godina"},"past":{"one":"pre {0} godine","few":"pre {0} godine","other":"pre {0} godina"}}},"month":{"displayName":"mesec","relative":{"0":"ovog meseca","1":"slede??eg meseca","-1":"pro??log meseca"},"relativeTime":{"future":{"one":"za {0} mesec","few":"za {0} meseca","other":"za {0} meseci"},"past":{"one":"pre {0} meseca","few":"pre {0} meseca","other":"pre {0} meseci"}}},"day":{"displayName":"dan","relative":{"0":"danas","1":"sutra","2":"prekosutra","-2":"prekju??e","-1":"ju??e"},"relativeTime":{"future":{"one":"za {0} dan","few":"za {0} dana","other":"za {0} dana"},"past":{"one":"pre {0} dana","few":"pre {0} dana","other":"pre {0} dana"}}},"hour":{"displayName":"sat","relativeTime":{"future":{"one":"za {0} sat","few":"za {0} sata","other":"za {0} sati"},"past":{"one":"pre {0} sata","few":"pre {0} sata","other":"pre {0} sati"}}},"minute":{"displayName":"minut","relativeTime":{"future":{"one":"za {0} minut","few":"za {0} minuta","other":"za {0} minuta"},"past":{"one":"pre {0} minuta","few":"pre {0} minuta","other":"pre {0} minuta"}}},"second":{"displayName":"sekund","relative":{"0":"sada"},"relativeTime":{"future":{"one":"za {0} sekundu","few":"za {0} sekunde","other":"za {0} sekundi"},"past":{"one":"pre {0} sekunde","few":"pre {0} sekunde","other":"pre {0} sekundi"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"sr-Latn-BA","parentLocale":"sr-Latn"});
IntlRelativeFormat.__addLocaleData({"locale":"sr-Latn-ME","parentLocale":"sr-Latn"});
IntlRelativeFormat.__addLocaleData({"locale":"sr-Latn-XK","parentLocale":"sr-Latn"});

IntlRelativeFormat.__addLocaleData({"locale":"ss","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ssy","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"st","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"sv","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1],t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2);if(ord)return(n10==1||n10==2)&&n100!=11&&n100!=12?"one":"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"??r","relative":{"0":"i ??r","1":"n??sta ??r","-1":"i fjol"},"relativeTime":{"future":{"one":"om {0} ??r","other":"om {0} ??r"},"past":{"one":"f??r {0} ??r sedan","other":"f??r {0} ??r sedan"}}},"month":{"displayName":"m??nad","relative":{"0":"denna m??nad","1":"n??sta m??nad","-1":"f??rra m??naden"},"relativeTime":{"future":{"one":"om {0} m??nad","other":"om {0} m??nader"},"past":{"one":"f??r {0} m??nad sedan","other":"f??r {0} m??nader sedan"}}},"day":{"displayName":"dag","relative":{"0":"i dag","1":"i morgon","2":"i ??vermorgon","-2":"i f??rrg??r","-1":"i g??r"},"relativeTime":{"future":{"one":"om {0} dag","other":"om {0} dagar"},"past":{"one":"f??r {0} dag sedan","other":"f??r {0} dagar sedan"}}},"hour":{"displayName":"timme","relativeTime":{"future":{"one":"om {0} timme","other":"om {0} timmar"},"past":{"one":"f??r {0} timme sedan","other":"f??r {0} timmar sedan"}}},"minute":{"displayName":"minut","relativeTime":{"future":{"one":"om {0} minut","other":"om {0} minuter"},"past":{"one":"f??r {0} minut sedan","other":"f??r {0} minuter sedan"}}},"second":{"displayName":"sekund","relative":{"0":"nu"},"relativeTime":{"future":{"one":"om {0} sekund","other":"om {0} sekunder"},"past":{"one":"f??r {0} sekund sedan","other":"f??r {0} sekunder sedan"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"sv-AX","parentLocale":"sv"});
IntlRelativeFormat.__addLocaleData({"locale":"sv-FI","parentLocale":"sv"});

IntlRelativeFormat.__addLocaleData({"locale":"sw","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"Mwaka","relative":{"0":"mwaka huu","1":"mwaka ujao","-1":"mwaka uliopita"},"relativeTime":{"future":{"one":"baada ya mwaka {0}","other":"baada ya miaka {0}"},"past":{"one":"mwaka {0} uliopita","other":"miaka {0} iliyopita"}}},"month":{"displayName":"Mwezi","relative":{"0":"mwezi huu","1":"mwezi ujao","-1":"mwezi uliopita"},"relativeTime":{"future":{"one":"baada ya mwezi {0}","other":"baada ya miezi {0}"},"past":{"one":"mwezi {0} uliopita","other":"miezi {0} iliyopita"}}},"day":{"displayName":"Siku","relative":{"0":"leo","1":"kesho","2":"kesho kutwa","-2":"juzi","-1":"jana"},"relativeTime":{"future":{"one":"baada ya siku {0}","other":"baada ya siku {0}"},"past":{"one":"siku {0} iliyopita","other":"siku {0} zilizopita"}}},"hour":{"displayName":"Saa","relativeTime":{"future":{"one":"baada ya saa {0}","other":"baada ya saa {0}"},"past":{"one":"saa {0} iliyopita","other":"saa {0} zilizopita"}}},"minute":{"displayName":"Dakika","relativeTime":{"future":{"one":"baada ya dakika {0}","other":"baada ya dakika {0}"},"past":{"one":"dakika {0} iliyopita","other":"dakika {0} zilizopita"}}},"second":{"displayName":"Sekunde","relative":{"0":"sasa"},"relativeTime":{"future":{"one":"baada ya sekunde {0}","other":"baada ya sekunde {0}"},"past":{"one":"Sekunde {0} iliyopita","other":"Sekunde {0} zilizopita"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"sw-CD","parentLocale":"sw"});
IntlRelativeFormat.__addLocaleData({"locale":"sw-KE","parentLocale":"sw"});
IntlRelativeFormat.__addLocaleData({"locale":"sw-UG","parentLocale":"sw"});

IntlRelativeFormat.__addLocaleData({"locale":"syr","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ta","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"???????????????","relative":{"0":"???????????? ???????????????","1":"?????????????????? ???????????????","-1":"??????????????? ???????????????"},"relativeTime":{"future":{"one":"{0} ?????????????????????","other":"{0} ??????????????????????????????"},"past":{"one":"{0} ??????????????????????????? ????????????","other":"{0} ???????????????????????????????????? ????????????"}}},"month":{"displayName":"???????????????","relative":{"0":"???????????? ???????????????","1":"?????????????????? ???????????????","-1":"??????????????? ???????????????"},"relativeTime":{"future":{"one":"{0} ???????????????????????????","other":"{0} ??????????????????????????????"},"past":{"one":"{0} ????????????????????????????????? ????????????","other":"{0} ???????????????????????????????????? ????????????"}}},"day":{"displayName":"????????????","relative":{"0":"???????????????","1":"????????????","2":"???????????? ?????????????????????","-2":"?????????????????? ???????????? ???????????????","-1":"??????????????????"},"relativeTime":{"future":{"one":"{0} ??????????????????","other":"{0} ???????????????????????????"},"past":{"one":"{0} ???????????????????????? ????????????","other":"{0} ????????????????????????????????? ????????????"}}},"hour":{"displayName":"?????????","relativeTime":{"future":{"one":"{0} ????????????????????????????????????","other":"{0} ????????????????????????????????????"},"past":{"one":"{0} ???????????????????????? ????????????","other":"{0} ???????????????????????? ????????????"}}},"minute":{"displayName":"?????????????????????","relativeTime":{"future":{"one":"{0} ?????????????????????????????????","other":"{0} ????????????????????????????????????"},"past":{"one":"{0} ??????????????????????????????????????? ????????????","other":"{0} ?????????????????????????????????????????? ????????????"}}},"second":{"displayName":"??????????????????","relative":{"0":"?????????????????????"},"relativeTime":{"future":{"one":"{0} ??????????????????????????????","other":"{0} ?????????????????????????????????"},"past":{"one":"{0} ?????????????????????????????? ????????????","other":"{0} ??????????????????????????????????????? ????????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ta-LK","parentLocale":"ta"});
IntlRelativeFormat.__addLocaleData({"locale":"ta-MY","parentLocale":"ta"});
IntlRelativeFormat.__addLocaleData({"locale":"ta-SG","parentLocale":"ta"});

IntlRelativeFormat.__addLocaleData({"locale":"te","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"????????????????????????","relative":{"0":"??? ????????????????????????","1":"?????????????????? ????????????????????????","-1":"?????? ????????????????????????"},"relativeTime":{"future":{"one":"{0} ??????????????????????????????","other":"{0} ????????????????????????????????????"},"past":{"one":"{0} ???????????????????????? ??????????????????","other":"{0} ??????????????????????????? ??????????????????"}}},"month":{"displayName":"?????????","relative":{"0":"??? ?????????","1":"?????????????????? ?????????","-1":"?????? ?????????"},"relativeTime":{"future":{"one":"{0} ???????????????","other":"{0} ?????????????????????"},"past":{"one":"{0} ????????? ??????????????????","other":"{0} ???????????? ??????????????????"}}},"day":{"displayName":"????????????","relative":{"0":"??? ????????????","1":"????????????","2":"????????????????????????","-2":"???????????????","-1":"???????????????"},"relativeTime":{"future":{"one":"{0} ??????????????????","other":"{0} ????????????????????????"},"past":{"one":"{0} ???????????? ??????????????????","other":"{0} ??????????????? ??????????????????"}}},"hour":{"displayName":"?????????","relativeTime":{"future":{"one":"{0} ???????????????","other":"{0} ?????????????????????"},"past":{"one":"{0} ????????? ??????????????????","other":"{0} ???????????? ??????????????????"}}},"minute":{"displayName":"?????????????????????","relativeTime":{"future":{"one":"{0} ????????????????????????","other":"{0} ??????????????????????????????"},"past":{"one":"{0} ?????????????????? ??????????????????","other":"{0} ????????????????????? ??????????????????"}}},"second":{"displayName":"???????????????","relative":{"0":"???????????????????????????"},"relativeTime":{"future":{"one":"{0} ????????????????????????","other":"{0} ????????????????????????"},"past":{"one":"{0} ??????????????? ??????????????????","other":"{0} ?????????????????? ??????????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"teo","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Ekan","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Elap","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Aparan","relative":{"0":"Lolo","1":"Moi","-1":"Jaan"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Esaa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Idakika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Isekonde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"teo-KE","parentLocale":"teo"});

IntlRelativeFormat.__addLocaleData({"locale":"th","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"???????????????","1":"??????????????????","-1":"???????????????????????????"},"relativeTime":{"future":{"other":"??????????????? {0} ??????"},"past":{"other":"{0} ???????????????????????????"}}},"month":{"displayName":"???????????????","relative":{"0":"????????????????????????","1":"???????????????????????????","-1":"????????????????????????????????????"},"relativeTime":{"future":{"other":"??????????????? {0} ???????????????"},"past":{"other":"{0} ??????????????????????????????????????????"}}},"day":{"displayName":"?????????","relative":{"0":"??????????????????","1":"????????????????????????","2":"????????????????????????","-2":"?????????????????????????????????","-1":"????????????????????????"},"relativeTime":{"future":{"other":"??????????????? {0} ?????????"},"past":{"other":"{0} ????????????????????????????????????"}}},"hour":{"displayName":"?????????????????????","relativeTime":{"future":{"other":"??????????????? {0} ?????????????????????"},"past":{"other":"{0} ????????????????????????????????????????????????"}}},"minute":{"displayName":"????????????","relativeTime":{"future":{"other":"??????????????? {0} ????????????"},"past":{"other":"{0} ???????????????????????????????????????"}}},"second":{"displayName":"??????????????????","relative":{"0":"??????????????????"},"relativeTime":{"future":{"other":"??????????????? {0} ??????????????????"},"past":{"other":"{0} ?????????????????????????????????????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ti","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==0||n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ti-ER","parentLocale":"ti"});

IntlRelativeFormat.__addLocaleData({"locale":"tig","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"tk","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"??yl","relative":{"0":"??u ??yl","1":"indiki ??yl","-1":"ge??en ??yl"},"relativeTime":{"future":{"one":"{0} ??yldan","other":"{0} ??yldan"},"past":{"one":"{0} ??yl ????","other":"{0} ??yl ????"}}},"month":{"displayName":"a??","relative":{"0":"??u a??","1":"indiki a??","-1":"ge??en a??"},"relativeTime":{"future":{"one":"{0} a??dan","other":"{0} a??dan"},"past":{"one":"{0} a?? ????","other":"{0} a?? ????"}}},"day":{"displayName":"g??n","relative":{"0":"??u g??n","1":"ertir","-1":"d????n"},"relativeTime":{"future":{"one":"{0} g??nden","other":"{0} g??nden"},"past":{"one":"{0} g??n ????","other":"{0} g??n ????"}}},"hour":{"displayName":"sagat","relativeTime":{"future":{"one":"{0} sagatdan","other":"{0} sagatdan"},"past":{"one":"{0} sagat ????","other":"{0} sagat ????"}}},"minute":{"displayName":"minut","relativeTime":{"future":{"one":"{0} minutdan","other":"{0} minutdan"},"past":{"one":"{0} minut ????","other":"{0} minut ????"}}},"second":{"displayName":"sekunt","relative":{"0":"now"},"relativeTime":{"future":{"one":"{0} sekuntdan","other":"{0} sekuntdan"},"past":{"one":"{0} sekunt ????","other":"{0} sekunt ????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"tl","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],f=s[1]||"",v0=!s[1],i10=i.slice(-1),f10=f.slice(-1);if(ord)return n==1?"one":"other";return v0&&(i==1||i==2||i==3)||v0&&i10!=4&&i10!=6&&i10!=9||!v0&&f10!=4&&f10!=6&&f10!=9?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"tn","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"to","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"ta??u","relative":{"0":"ta???? ni","1":"ta??u kaha??u","-1":"ta??u kuo??osi"},"relativeTime":{"future":{"other":"??i he ta??u ??e {0}"},"past":{"other":"ta??u ??e {0} kuo??osi"}}},"month":{"displayName":"m??hina","relative":{"0":"m??hin?? ni","1":"m??hina kaha??u","-1":"m??hina kuo??osi"},"relativeTime":{"future":{"other":"??i he m??hina ??e {0}"},"past":{"other":"m??hina ??e {0} kuo??osi"}}},"day":{"displayName":"??aho","relative":{"0":"??ah?? ni","1":"??apongipongi","2":"??ahepongipongi","-2":"??aneheafi","-1":"??aneafi"},"relativeTime":{"future":{"other":"??i he ??aho ??e {0}"},"past":{"other":"??aho ??e {0} kuo??osi"}}},"hour":{"displayName":"houa","relativeTime":{"future":{"other":"??i he houa ??e {0}"},"past":{"other":"houa ??e {0} kuo??osi"}}},"minute":{"displayName":"miniti","relativeTime":{"future":{"other":"??i he miniti ??e {0}"},"past":{"other":"miniti ??e {0} kuo??osi"}}},"second":{"displayName":"sekoni","relative":{"0":"taimi??ni"},"relativeTime":{"future":{"other":"??i he sekoni ??e {0}"},"past":{"other":"sekoni ??e {0} kuo??osi"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"tr","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Y??l","relative":{"0":"bu y??l","1":"gelecek y??l","-1":"ge??en y??l"},"relativeTime":{"future":{"one":"{0} y??l sonra","other":"{0} y??l sonra"},"past":{"one":"{0} y??l ??nce","other":"{0} y??l ??nce"}}},"month":{"displayName":"Ay","relative":{"0":"bu ay","1":"gelecek ay","-1":"ge??en ay"},"relativeTime":{"future":{"one":"{0} ay sonra","other":"{0} ay sonra"},"past":{"one":"{0} ay ??nce","other":"{0} ay ??nce"}}},"day":{"displayName":"G??n","relative":{"0":"bug??n","1":"yar??n","2":"??b??r g??n","-2":"evvelsi g??n","-1":"d??n"},"relativeTime":{"future":{"one":"{0} g??n sonra","other":"{0} g??n sonra"},"past":{"one":"{0} g??n ??nce","other":"{0} g??n ??nce"}}},"hour":{"displayName":"Saat","relativeTime":{"future":{"one":"{0} saat sonra","other":"{0} saat sonra"},"past":{"one":"{0} saat ??nce","other":"{0} saat ??nce"}}},"minute":{"displayName":"Dakika","relativeTime":{"future":{"one":"{0} dakika sonra","other":"{0} dakika sonra"},"past":{"one":"{0} dakika ??nce","other":"{0} dakika ??nce"}}},"second":{"displayName":"Saniye","relative":{"0":"??imdi"},"relativeTime":{"future":{"one":"{0} saniye sonra","other":"{0} saniye sonra"},"past":{"one":"{0} saniye ??nce","other":"{0} saniye ??nce"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"tr-CY","parentLocale":"tr"});

IntlRelativeFormat.__addLocaleData({"locale":"ts","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"twq","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Jiiri","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Handu","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Zaari","relative":{"0":"H??o","1":"Suba","-1":"Bi"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Guuru","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Miniti","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Miti","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"tzm","pluralRuleFunction":function (n,ord){var s=String(n).split("."),t0=Number(s[0])==n;if(ord)return"other";return n==0||n==1||t0&&n>=11&&n<=99?"one":"other"},"fields":{"year":{"displayName":"Asseggas","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Ayur","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Ass","relative":{"0":"Assa","1":"Asekka","-1":"Assena???"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Tasragt","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Tusdat","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Tusnat","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ug","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"???? ??????","1":"?????????? ??????","-1":"???????????? ??????"},"relativeTime":{"future":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"},"past":{"one":"{0} ?????? ??????????????","other":"{0} ?????? ??????????????"}}},"month":{"displayName":"??????","relative":{"0":"???? ??????","1":"?????????? ??????","-1":"???????????? ??????"},"relativeTime":{"future":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"},"past":{"one":"{0} ?????? ??????????????","other":"{0} ?????? ??????????????"}}},"day":{"displayName":"??????","relative":{"0":"??????????","1":"????????","-1":"??????????????"},"relativeTime":{"future":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"},"past":{"one":"{0} ?????? ??????????????","other":"{0} ?????? ??????????????"}}},"hour":{"displayName":"??????????","relativeTime":{"future":{"one":"{0} ???????????????? ??????????","other":"{0} ???????????????? ??????????"},"past":{"one":"{0} ?????????? ??????????????","other":"{0} ?????????? ??????????????"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"one":"{0} ???????????????? ??????????","other":"{0} ???????????????? ??????????"},"past":{"one":"{0} ?????????? ??????????????","other":"{0} ?????????? ??????????????"}}},"second":{"displayName":"????????????","relative":{"0":"now"},"relativeTime":{"future":{"one":"{0} ?????????????????? ??????????","other":"{0} ?????????????????? ??????????"},"past":{"one":"{0} ???????????? ??????????????","other":"{0} ???????????? ??????????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"uk","pluralRuleFunction":function (n,ord){var s=String(n).split("."),i=s[0],v0=!s[1],t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2),i10=i.slice(-1),i100=i.slice(-2);if(ord)return n10==3&&n100!=13?"few":"other";return v0&&i10==1&&i100!=11?"one":v0&&(i10>=2&&i10<=4)&&(i100<12||i100>14)?"few":v0&&i10==0||v0&&(i10>=5&&i10<=9)||v0&&(i100>=11&&i100<=14)?"many":"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"?????????? ????????","1":"???????????????????? ????????","-1":"??????????"},"relativeTime":{"future":{"one":"?????????? {0} ??????","few":"?????????? {0} ????????","many":"?????????? {0} ??????????","other":"?????????? {0} ????????"},"past":{"one":"{0} ?????? ????????","few":"{0} ???????? ????????","many":"{0} ?????????? ????????","other":"{0} ???????? ????????"}}},"month":{"displayName":"????????????","relative":{"0":"?????????? ????????????","1":"???????????????????? ????????????","-1":"???????????????? ????????????"},"relativeTime":{"future":{"one":"?????????? {0} ????????????","few":"?????????? {0} ????????????","many":"?????????? {0} ??????????????","other":"?????????? {0} ????????????"},"past":{"one":"{0} ???????????? ????????","few":"{0} ???????????? ????????","many":"{0} ?????????????? ????????","other":"{0} ???????????? ????????"}}},"day":{"displayName":"????????","relative":{"0":"????????????????","1":"????????????","2":"??????????????????????","-2":"??????????????????","-1":"??????????"},"relativeTime":{"future":{"one":"?????????? {0} ????????","few":"?????????? {0} ??????","many":"?????????? {0} ????????","other":"?????????? {0} ??????"},"past":{"one":"{0} ???????? ????????","few":"{0} ?????? ????????","many":"{0} ???????? ????????","other":"{0} ?????? ????????"}}},"hour":{"displayName":"????????????","relativeTime":{"future":{"one":"?????????? {0} ????????????","few":"?????????? {0} ????????????","many":"?????????? {0} ??????????","other":"?????????? {0} ????????????"},"past":{"one":"{0} ???????????? ????????","few":"{0} ???????????? ????????","many":"{0} ?????????? ????????","other":"{0} ???????????? ????????"}}},"minute":{"displayName":"??????????????","relativeTime":{"future":{"one":"?????????? {0} ??????????????","few":"?????????? {0} ??????????????","many":"?????????? {0} ????????????","other":"?????????? {0} ??????????????"},"past":{"one":"{0} ?????????????? ????????","few":"{0} ?????????????? ????????","many":"{0} ???????????? ????????","other":"{0} ?????????????? ????????"}}},"second":{"displayName":"??????????????","relative":{"0":"??????????"},"relativeTime":{"future":{"one":"?????????? {0} ??????????????","few":"?????????? {0} ??????????????","many":"?????????? {0} ????????????","other":"?????????? {0} ??????????????"},"past":{"one":"{0} ?????????????? ????????","few":"{0} ?????????????? ????????","many":"{0} ???????????? ????????","other":"{0} ?????????????? ????????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"ur","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"???? ??????","1":"???????? ??????","-1":"?????????? ??????"},"relativeTime":{"future":{"one":"{0} ?????? ??????","other":"{0} ?????? ??????"},"past":{"one":"{0} ?????? ????????","other":"{0} ?????? ????????"}}},"month":{"displayName":"??????????","relative":{"0":"???? ??????????","1":"???????? ??????????","-1":"?????????? ??????????"},"relativeTime":{"future":{"one":"{0} ?????????? ??????","other":"{0} ?????????? ??????"},"past":{"one":"{0} ?????????? ????????","other":"{0} ?????????? ????????"}}},"day":{"displayName":"????","relative":{"0":"????","1":"?????????? ????","2":"?????? ???????? ??????????","-2":"?????????? ??????????","-1":"?????????? ????"},"relativeTime":{"future":{"one":"{0} ???? ??????","other":"{0} ???????? ??????"},"past":{"one":"{0} ???? ????????","other":"{0} ???????? ????????"}}},"hour":{"displayName":"??????????","relativeTime":{"future":{"one":"{0} ?????????? ??????","other":"{0} ?????????? ??????"},"past":{"one":"{0} ?????????? ????????","other":"{0} ?????????? ????????"}}},"minute":{"displayName":"??????","relativeTime":{"future":{"one":"{0} ?????? ??????","other":"{0} ?????? ??????"},"past":{"one":"{0} ?????? ????????","other":"{0} ?????? ????????"}}},"second":{"displayName":"??????????","relative":{"0":"????"},"relativeTime":{"future":{"one":"{0} ?????????? ??????","other":"{0} ?????????? ??????"},"past":{"one":"{0} ?????????? ????????","other":"{0} ?????????? ????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"ur-IN","parentLocale":"ur","fields":{"year":{"displayName":"??????","relative":{"0":"???? ??????","1":"???????? ??????","-1":"?????????? ??????"},"relativeTime":{"future":{"one":"{0} ?????? ??????","other":"{0} ?????????? ??????"},"past":{"one":"{0} ?????? ????????","other":"{0} ?????? ????????"}}},"month":{"displayName":"??????????","relative":{"0":"???? ??????","1":"???????? ??????","-1":"?????????? ??????"},"relativeTime":{"future":{"one":"{0} ?????? ??????","other":"{0} ?????? ??????"},"past":{"one":"{0} ?????? ??????","other":"{0} ?????? ??????"}}},"day":{"displayName":"????","relative":{"0":"????","1":"?????????? ????","2":"?????? ???????? ??????????","-2":"?????????? ??????????","-1":"?????????? ????"},"relativeTime":{"future":{"one":"{0} ???? ??????","other":"{0} ???????? ??????"},"past":{"one":"{0} ???? ????????","other":"{0} ???????? ????????"}}},"hour":{"displayName":"??????????","relativeTime":{"future":{"one":"{0} ?????????? ??????","other":"{0} ?????????? ??????"},"past":{"one":"{0} ?????????? ????????","other":"{0} ?????????? ????????"}}},"minute":{"displayName":"??????","relativeTime":{"future":{"one":"{0} ?????? ??????","other":"{0} ?????? ??????"},"past":{"one":"{0} ?????? ??????","other":"{0} ?????? ??????"}}},"second":{"displayName":"??????????","relative":{"0":"????"},"relativeTime":{"future":{"one":"{0} ?????????? ??????","other":"{0} ?????????? ??????"},"past":{"one":"{0} ?????????? ??????","other":"{0} ?????????? ??????"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"uz","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"yil","relative":{"0":"bu yil","1":"keyingi yil","-1":"o??tgan yil"},"relativeTime":{"future":{"one":"{0} yildan so??ng","other":"{0} yildan so???ng"},"past":{"one":"{0} yil oldin","other":"{0} yil oldin"}}},"month":{"displayName":"oy","relative":{"0":"shu oy","1":"keyingi oy","-1":"o???tgan oy"},"relativeTime":{"future":{"one":"{0} oydan so???ng","other":"{0} oydan so???ng"},"past":{"one":"{0} oy oldin","other":"{0} oy oldin"}}},"day":{"displayName":"kun","relative":{"0":"bugun","1":"ertaga","-1":"kecha"},"relativeTime":{"future":{"one":"{0} kundan so???ng","other":"{0} kundan so???ng"},"past":{"one":"{0} kun oldin","other":"{0} kun oldin"}}},"hour":{"displayName":"soat","relativeTime":{"future":{"one":"{0} soatdan so???ng","other":"{0} soatdan so???ng"},"past":{"one":"{0} soat oldin","other":"{0} soat oldin"}}},"minute":{"displayName":"daqiqa","relativeTime":{"future":{"one":"{0} daqiqadan so???ng","other":"{0} daqiqadan so???ng"},"past":{"one":"{0} daqiqa oldin","other":"{0} daqiqa oldin"}}},"second":{"displayName":"soniya","relative":{"0":"hozir"},"relativeTime":{"future":{"one":"{0} soniyadan so???ng","other":"{0} soniyadan so???ng"},"past":{"one":"{0} soniya oldin","other":"{0} soniya oldin"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"uz-Arab","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"uz-Cyrl","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"???? ??????","1":"?????????????? ??????","-1":"?????????? ??????"},"relativeTime":{"future":{"one":"{0} ???????????? ????????","other":"{0} ???????????? ????????"},"past":{"one":"{0} ?????? ??????????","other":"{0} ?????? ??????????"}}},"month":{"displayName":"????","relative":{"0":"???? ????","1":"?????????????? ????","-1":"?????????? ????"},"relativeTime":{"future":{"one":"{0} ?????????? ????????","other":"{0} ?????????? ????????"},"past":{"one":"{0} ???? ??????????","other":"{0} ???? ??????????"}}},"day":{"displayName":"??????","relative":{"0":"??????????","1":"????????????","-1":"????????"},"relativeTime":{"future":{"one":"{0} ???????????? ????????","other":"{0} ???????????? ????????"},"past":{"one":"{0} ?????? ??????????","other":"{0} ?????? ??????????"}}},"hour":{"displayName":"????????","relativeTime":{"future":{"one":"{0} ?????????????? ????????","other":"{0} ?????????????? ????????"},"past":{"one":"{0} ???????? ??????????","other":"{0} ???????? ??????????"}}},"minute":{"displayName":"????????????","relativeTime":{"future":{"one":"{0} ?????????????????? ????????","other":"{0} ?????????????????? ????????"},"past":{"one":"{0} ???????????? ??????????","other":"{0} ???????????? ??????????"}}},"second":{"displayName":"??????????","relative":{"0":"??????????"},"relativeTime":{"future":{"one":"{0} ???????????????? ????????","other":"{0} ???????????????? ????????"},"past":{"one":"{0} ?????????? ??????????","other":"{0} ?????????? ??????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"uz-Latn","parentLocale":"uz"});

IntlRelativeFormat.__addLocaleData({"locale":"vai","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"??????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"??????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"??????","relative":{"0":"??????","1":"??????","-1":"??????"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"??????","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"????????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"vai-Latn","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"sa??","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"kalo","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"tele","relative":{"0":"w??l??","1":"sina","-1":"kunu"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"hawa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"mini","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"jaki-jaka","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"vai-Vaii","parentLocale":"vai"});

IntlRelativeFormat.__addLocaleData({"locale":"ve","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"vi","pluralRuleFunction":function (n,ord){if(ord)return n==1?"one":"other";return"other"},"fields":{"year":{"displayName":"N??m","relative":{"0":"n??m nay","1":"n??m sau","-1":"n??m ngo??i"},"relativeTime":{"future":{"other":"sau {0} n??m n???a"},"past":{"other":"{0} n??m tr?????c"}}},"month":{"displayName":"Th??ng","relative":{"0":"th??ng n??y","1":"th??ng sau","-1":"th??ng tr?????c"},"relativeTime":{"future":{"other":"sau {0} th??ng n???a"},"past":{"other":"{0} th??ng tr?????c"}}},"day":{"displayName":"Ng??y","relative":{"0":"H??m nay","1":"Ng??y mai","2":"Ng??y kia","-2":"H??m kia","-1":"H??m qua"},"relativeTime":{"future":{"other":"sau {0} ng??y n???a"},"past":{"other":"{0} ng??y tr?????c"}}},"hour":{"displayName":"Gi???","relativeTime":{"future":{"other":"sau {0} gi??? n???a"},"past":{"other":"{0} gi??? tr?????c"}}},"minute":{"displayName":"Ph??t","relativeTime":{"future":{"other":"sau {0} ph??t n???a"},"past":{"other":"{0} ph??t tr?????c"}}},"second":{"displayName":"Gi??y","relative":{"0":"b??y gi???"},"relativeTime":{"future":{"other":"sau {0} gi??y n???a"},"past":{"other":"{0} gi??y tr?????c"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"vo","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"vun","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Maka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Mori","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Mfiri","relative":{"0":"Inu","1":"Ngama","-1":"Ukou"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Saa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Dakyika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Sekunde","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"wa","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==0||n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"wae","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"J??r","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"one":"I {0} j??r","other":"I {0} j??r"},"past":{"one":"vor {0} j??r","other":"cor {0} j??r"}}},"month":{"displayName":"M??net","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"one":"I {0} m??net","other":"I {0} m??net"},"past":{"one":"vor {0} m??net","other":"vor {0} m??net"}}},"day":{"displayName":"Tag","relative":{"0":"Hitte","1":"M??re","2":"Uberm??re","-2":"Vorge??ter","-1":"Ge??ter"},"relativeTime":{"future":{"one":"i {0} tag","other":"i {0} t??g"},"past":{"one":"vor {0} tag","other":"vor {0} t??g"}}},"hour":{"displayName":"Schtund","relativeTime":{"future":{"one":"i {0} stund","other":"i {0} stunde"},"past":{"one":"vor {0} stund","other":"vor {0} stunde"}}},"minute":{"displayName":"M??n??tta","relativeTime":{"future":{"one":"i {0} min??ta","other":"i {0} min??te"},"past":{"one":"vor {0} min??ta","other":"vor {0} min??te"}}},"second":{"displayName":"Sekunda","relative":{"0":"now"},"relativeTime":{"future":{"one":"i {0} sekund","other":"i {0} sekunde"},"past":{"one":"vor {0} sekund","other":"vor {0} sekunde"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"wo","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"xh","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"xog","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"Omwaka","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Omwezi","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Olunaku","relative":{"0":"Olwaleelo (leelo)","1":"Enkyo","-1":"Edho"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Essawa","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Edakiika","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Obutikitiki","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"yav","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"y??????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"o??li","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"pu????s????","relative":{"0":"??naan","1":"nakiny??m","-1":"p??yo??"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"kisik??l,","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"min??t","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"s??k??n","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"yi","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1];if(ord)return"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"????????","relative":{"0":"?????? ????????","1":"?????????? ?? ????????","-1":"??????????????????????"},"relativeTime":{"future":{"one":"?????????? {0} ????????","other":"?????????? {0} ????????"},"past":{"one":"?????????? {0} ????????","other":"?????????? {0} ????????"}}},"month":{"displayName":"????????????","relative":{"0":"?????? ????????","1":"?????????????????? ????????","-1":"?????????????????????????? ????????"},"relativeTime":{"future":{"one":"?????????? {0} ????????","other":"?????????? {0} ??????????"},"past":{"one":"?????????? {0} ????????","other":"?????????? {0} ??????????"}}},"day":{"displayName":"????????","relative":{"0":"??????????","1":"??????????","-1":"??????????"},"relativeTime":{"future":{"one":"?????? {0} ???????? ??????????","other":"?????? {0} ?????? ??????????"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"??????????","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"??????????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"yo","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"???d??n","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Os??","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"???j?????","relative":{"0":"??n??","1":"?????la","2":"??t????nla","-2":"??j???ta","-1":"??n??"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"w??k??t??","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"??s?????j??","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"??s?????j?? ????y??","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"yo-BJ","parentLocale":"yo","fields":{"year":{"displayName":"??d??n","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Os??","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"??j????","relative":{"0":"??n??","1":"????la","2":"??t????nla","-2":"??j??ta","-1":"??n??"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"w??k??t??","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"??s????j??","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"??s????j?? ????y??","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"zgh","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"?????????????????????","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"???????????????","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"?????????","relative":{"0":"????????????","1":"???????????????","-1":"???????????????"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"?????????????????????","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"?????????????????????","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"??????????????????","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});

IntlRelativeFormat.__addLocaleData({"locale":"zh","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"???","relative":{"0":"??????","1":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0}??????"},"past":{"other":"{0}??????"}}},"month":{"displayName":"???","relative":{"0":"??????","1":"?????????","-1":"?????????"},"relativeTime":{"future":{"other":"{0}?????????"},"past":{"other":"{0}?????????"}}},"day":{"displayName":"???","relative":{"0":"??????","1":"??????","2":"??????","-2":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0}??????"},"past":{"other":"{0}??????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"other":"{0}?????????"},"past":{"other":"{0}?????????"}}},"minute":{"displayName":"??????","relativeTime":{"future":{"other":"{0}?????????"},"past":{"other":"{0}?????????"}}},"second":{"displayName":"??????","relative":{"0":"??????"},"relativeTime":{"future":{"other":"{0}?????????"},"past":{"other":"{0}?????????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"zh-Hans","parentLocale":"zh"});
IntlRelativeFormat.__addLocaleData({"locale":"zh-Hans-HK","parentLocale":"zh-Hans","fields":{"year":{"displayName":"???","relative":{"0":"??????","1":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0}??????"},"past":{"other":"{0}??????"}}},"month":{"displayName":"???","relative":{"0":"??????","1":"?????????","-1":"?????????"},"relativeTime":{"future":{"other":"{0}?????????"},"past":{"other":"{0}?????????"}}},"day":{"displayName":"???","relative":{"0":"??????","1":"??????","2":"??????","-2":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0}??????"},"past":{"other":"{0}??????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"other":"{0}?????????"},"past":{"other":"{0}?????????"}}},"minute":{"displayName":"??????","relativeTime":{"future":{"other":"{0}?????????"},"past":{"other":"{0}?????????"}}},"second":{"displayName":"??????","relative":{"0":"??????"},"relativeTime":{"future":{"other":"{0}??????"},"past":{"other":"{0}??????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"zh-Hans-MO","parentLocale":"zh-Hans","fields":{"year":{"displayName":"???","relative":{"0":"??????","1":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0}??????"},"past":{"other":"{0}??????"}}},"month":{"displayName":"???","relative":{"0":"??????","1":"?????????","-1":"?????????"},"relativeTime":{"future":{"other":"{0}?????????"},"past":{"other":"{0}?????????"}}},"day":{"displayName":"???","relative":{"0":"??????","1":"??????","2":"??????","-2":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0}??????"},"past":{"other":"{0}??????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"other":"{0}?????????"},"past":{"other":"{0}?????????"}}},"minute":{"displayName":"??????","relativeTime":{"future":{"other":"{0}?????????"},"past":{"other":"{0}?????????"}}},"second":{"displayName":"??????","relative":{"0":"??????"},"relativeTime":{"future":{"other":"{0}??????"},"past":{"other":"{0}??????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"zh-Hans-SG","parentLocale":"zh-Hans","fields":{"year":{"displayName":"???","relative":{"0":"??????","1":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0}??????"},"past":{"other":"{0}??????"}}},"month":{"displayName":"???","relative":{"0":"??????","1":"?????????","-1":"?????????"},"relativeTime":{"future":{"other":"{0}?????????"},"past":{"other":"{0}?????????"}}},"day":{"displayName":"???","relative":{"0":"??????","1":"??????","2":"??????","-2":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0}??????"},"past":{"other":"{0}??????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"other":"{0}?????????"},"past":{"other":"{0}?????????"}}},"minute":{"displayName":"??????","relativeTime":{"future":{"other":"{0}?????????"},"past":{"other":"{0}?????????"}}},"second":{"displayName":"??????","relative":{"0":"??????"},"relativeTime":{"future":{"other":"{0}??????"},"past":{"other":"{0}??????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"zh-Hant","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"???","relative":{"0":"??????","1":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0} ??????"},"past":{"other":"{0} ??????"}}},"month":{"displayName":"???","relative":{"0":"??????","1":"?????????","-1":"?????????"},"relativeTime":{"future":{"other":"{0} ?????????"},"past":{"other":"{0} ?????????"}}},"day":{"displayName":"???","relative":{"0":"??????","1":"??????","2":"??????","-2":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0} ??????"},"past":{"other":"{0} ??????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"other":"{0} ?????????"},"past":{"other":"{0} ?????????"}}},"minute":{"displayName":"??????","relativeTime":{"future":{"other":"{0} ?????????"},"past":{"other":"{0} ?????????"}}},"second":{"displayName":"???","relative":{"0":"??????"},"relativeTime":{"future":{"other":"{0} ??????"},"past":{"other":"{0} ??????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"zh-Hant-HK","parentLocale":"zh-Hant","fields":{"year":{"displayName":"???","relative":{"0":"??????","1":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0} ??????"},"past":{"other":"{0} ??????"}}},"month":{"displayName":"???","relative":{"0":"??????","1":"?????????","-1":"?????????"},"relativeTime":{"future":{"other":"{0} ?????????"},"past":{"other":"{0} ?????????"}}},"day":{"displayName":"???","relative":{"0":"??????","1":"??????","2":"??????","-2":"??????","-1":"??????"},"relativeTime":{"future":{"other":"{0} ??????"},"past":{"other":"{0} ??????"}}},"hour":{"displayName":"??????","relativeTime":{"future":{"other":"{0} ?????????"},"past":{"other":"{0} ?????????"}}},"minute":{"displayName":"??????","relativeTime":{"future":{"other":"{0} ?????????"},"past":{"other":"{0} ?????????"}}},"second":{"displayName":"???","relative":{"0":"??????"},"relativeTime":{"future":{"other":"{0} ??????"},"past":{"other":"{0} ??????"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"zh-Hant-MO","parentLocale":"zh-Hant-HK"});

IntlRelativeFormat.__addLocaleData({"locale":"zu","pluralRuleFunction":function (n,ord){if(ord)return"other";return n>=0&&n<=1?"one":"other"},"fields":{"year":{"displayName":"Unyaka","relative":{"0":"kulo nyaka","1":"unyaka ozayo","-1":"onyakeni odlule"},"relativeTime":{"future":{"one":"onyakeni ongu-{0} ozayo","other":"eminyakeni engu-{0} ezayo"},"past":{"one":"{0} unyaka odlule","other":"{0} iminyaka edlule"}}},"month":{"displayName":"Inyanga","relative":{"0":"le nyanga","1":"inyanga ezayo","-1":"inyanga edlule"},"relativeTime":{"future":{"one":"enyangeni engu-{0}","other":"ezinyangeni ezingu-{0} ezizayo"},"past":{"one":"{0} inyanga edlule","other":"{0} izinyanga ezedlule"}}},"day":{"displayName":"Usuku","relative":{"0":"namhlanje","1":"kusasa","2":"usuku olulandela olwakusasa","-2":"usuku olwandulela olwayizolo","-1":"izolo"},"relativeTime":{"future":{"one":"osukwini olungu-{0} oluzayo","other":"ezinsukwini ezingu-{0} ezizayo"},"past":{"one":"osukwini olungu-{0} olwedlule","other":"ezinsukwini ezingu-{0} ezedlule."}}},"hour":{"displayName":"Ihora","relativeTime":{"future":{"one":"ehoreni elingu-{0} elizayo","other":"emahoreni angu-{0} ezayo"},"past":{"one":"{0} ihora eledlule","other":"emahoreni angu-{0} edlule"}}},"minute":{"displayName":"Iminithi","relativeTime":{"future":{"one":"kuminithi elingu-{0} elizayo","other":"kumaminithi angu-{0} ezayo"},"past":{"one":"{0} iminithi eledlule","other":"{0} amaminithi edlule"}}},"second":{"displayName":"Isekhondi","relative":{"0":"manje"},"relativeTime":{"future":{"one":"kusekhondi elingu-{0} elizayo","other":"kumasekhondi angu-{0} ezayo"},"past":{"one":"{0} isekhondi eledlule","other":"{0} amasekhondi edlule"}}}}});

//# sourceMappingURL=intl-relativeformat-with-locales.js.map