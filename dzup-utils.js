var dzupUtils = angular.module('dzupUtils',[]);

dzupUtils.filter('capitalize', function () {
    return function (input) {
        return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
    }
});

dzupUtils.filter('firstletter', function () {
    return function (input) {
        return (!!input) ? input.charAt(0) : '';
    }
});

dzupUtils.filter('selectfilter', function () {
    return function (input, r, c) {
        return input;
    }
});

dzupUtils.filter('prettyJSON', function () {
    return function (json) {
        return angular.toJson(json, true);
    }
});

dzupUtils.filter('isEmpty', function () {
    var bar;
    return function (obj) {
        for (bar in obj) {
            if (obj.hasOwnProperty(bar)) {
                return false;
            }
        }
        return true;
    };
});



dzupUtils.provider('$dzupConfigUtils', [function () {
    var templateUrlBase = {
        
    };
    var service = {
        setTemplateUrlBase: function (service, value) {
            templateUrlBase[service] = value;
        },  
        templateUrlBase: templateUrlBase,
        $get: function () {
            return {
                templateUrlBase: templateUrlBase
            };
        }
    };
    return service;
    
}]);

dzupUtils.factory('JsonSchemaUtilService', [
    function () {

        return {
            toJsonSchema: function (content, type) {
                if (!content || !type) {
                    throw new Error('Content or type not defined');
                    return;
                }

                switch (type) {
                    case 'CSV':
                        return this.csvToJsonSchema(content);
                    case 'XML':
                        return this.xmlToJsonSchema(content);
                    case 'JSON':
                        return this.jsonToSchema(content);
                    default:
                        throw new Error('Unknown type: ' + type);
                }
            },
            xmlToJsonSchema: function (content) {
                var json = this.xmlToJSON(content);
                var jsonSchema = this.jsonToSchema(json);
                return jsonSchema;
            },
            csvToJsonSchema: function (content) {
                var json = this.csvToJSONArray(content); //this.csvToArray(content);
                var jsonSchema = this.jsonToSchema(json);
                return jsonSchema;
            },
            jsonToSchema: function (jsonContent) {
                var self = this;
                var json = jsonContent;
                if (!_.isObject(json)) {
                    json = JSON.parse(json);
                }

                var schema = {};

                var singleJson = null;

                if (_.isArray(json)) {
                    singleJson = json[0];
                } else if (_.isObject(json)) {
                    singleJson = json;
                } else {
                    throw new Error('Not valid JSON format for content: ' + json);
                }

                schema = this.__recursiveDiscovery(singleJson);

                return schema;
            },
            __recursiveDiscovery: function (json) {
                var schema = {};
                var self = this;
                
                if (_.isArray(json)) {
                    schema = {
                        items: [self.__recursiveDiscovery(json[0])],
                        type: 'array'
                    }
                } else if (_.isObject(json)) {
                    var keys = Object.keys(json);
                    schema = {
                        properties: {},
                        type: "object"
                    }

                    keys.forEach(function (key) {
                        schema.properties[key] = self.__recursiveDiscovery(json[key]);
                        schema.properties[key].name = key;
                    })

                } else {
                    var type = self.__discoverPrimitiveType(json);
                    schema = {
                        type: type
                    };
                }
                return schema;
            },
            __discoverPrimitiveType: function (content) {
                if (_.isNull(content) || _.isUndefined(content)){
                    return 'string'; // this is default for null/undefined values
                }
                
                if (_.isNumber(content)){
                    return 'number';
                }
                
                if (_.isBoolean(content)){
                    return 'boolean';
                }
                
                var type = 'number';
                var tmp = null;
                
                tmp = _.toNumber(content);

                /*tmp = _.toNumber(content);

                if (!tmp) {
                    content = content.toString();// we need to convert to string before checking
                    tmp =  content.toLowerCase()==='true' || content.toLowerCase()==='false'; 
                    type = 'boolean';
                }*/
                
                if (!tmp){
                    tmp = Date.parse(content); 
                    if (_.isDate(tmp)){
                        tmp = tmp.toDateString().toLowerCase().lastIndexOf('invalid') == -1;
                    }
                    type = 'datetime';
                }
                
                if (!tmp) {
                    type = 'string';
                }
                return type;

            },
            xmlToJSON: function (content) {
                var xml2json = new X2JS();
                var jsonXml = xml2json.xml_str2json(content);
                return jsonXml;
            },
            csvToJSON: function (content) {
                // content = { csv:csvString, separator = ',' }
                var separator = content.separator || ',';
                var lines = content.split(/\r\n|\r/g); //('\n');
                var result = [];
                var start = 0;
                var columnCount = lines[0].split(separator).length;

                var headers = [];
                if (content.header) {
                    headers = lines[0].split(separator);
                    start = 1;
                }

                for (var i = start; i < lines.length; i++) {
                    var obj = {};
                    var currentline = lines[i].split(new RegExp(separator + '(?![^"]*"(?:(?:[^"]*"){2})*[^"]*$)'));
                    if (currentline.length === columnCount) {
                        if (content.header) {
                            for (var j = 0; j < headers.length; j++) {
                                obj[headers[j]] = currentline[j];
                            }
                        } else {
                            for (var k = 0; k < currentline.length; k++) {
                                obj[k] = currentline[k];
                            }
                        }
                        result.push(obj);
                    }
                }

                return {
                    headers: headers,
                    json: result
                };
            },
            csvToJSONArray: function(content){
                var separator = content.separator || ',';
                var lines = content.split(/\r\n|\r/g); //('\n');
                var result = [];
                var start = 1;
                var colums = lines[0].split(separator);
                var columnCount = colums.length;
                
                for (var i = start; i < lines.length; i++) {
                    var obj = {};
                    var currentline = lines[i].split(new RegExp(separator + '(?![^"]*"(?:(?:[^"]*"){2})*[^"]*$)'));
                    if (currentline.length === columnCount) {

                        for (var k=0;k<columnCount;k++){
                            var col = colums[k];
                            var val = currentline[k];
                            obj[col] = val;
                        }
                        
                        result.push(obj);
                        /*var row = [];
                        for (var k = 0; k < currentline.length; k++) {
                            row.push(currentline[k]);
                        }
                        result.push(row);*/
                    }
                }

                return result;              
            },
            csvToArray: function (content) {
                var separator = content.separator || ',';
                var lines = content.split(/\r\n|\r/g); //('\n');
                var result = [];
                var start = 0;
                var columnCount = lines[0].split(separator).length;

                for (var i = start; i < lines.length; i++) {
                    var obj = {};
                    var currentline = lines[i].split(new RegExp(separator + '(?![^"]*"(?:(?:[^"]*"){2})*[^"]*$)'));
                    if (currentline.length === columnCount) {

                        var row = [];
                        for (var k = 0; k < currentline.length; k++) {
                            row.push(currentline[k]);
                        }
                        result.push(row);
                    }
                }

                return result;
            }
        }

}]);

dzupUtils.factory('RecursionHelper', ['$compile', function($compile){
	return {
		/**
		 * Manually compiles the element, fixing the recursion loop.
		 * @param element
		 * @param [link] A post-link function, or an object with function(s) registered via pre and post properties.
		 * @returns An object containing the linking functions.
		 */
		compile: function(element, link){
			// Normalize the link parameter
			if(angular.isFunction(link)){
				link = { post: link };
			}

			// Break the recursion loop by removing the contents
			var contents = element.contents().remove();
			var compiledContents;
			return {
				pre: (link && link.pre) ? link.pre : null,
				/**
				 * Compiles and re-adds the contents
				 */
				post: function(scope, element){
					// Compile the contents
					if(!compiledContents){
						compiledContents = $compile(contents);
					}
					// Re-add the compiled contents to the element
					compiledContents(scope, function(clone){
						element.append(clone);
					});

					// Call the post-linking function, if any
					if(link && link.post){
						link.post.apply(null, arguments);
					}
				}
			};
		}
	};
}]);


// 

(function (ng, _) {
  'use strict';

  var
    lodashModule = ng.module('angular-lodash', []),
    utilsModule = ng.module('angular-lodash/utils', []),
    filtersModule = ng.module('angular-lodash/filters', []);

  // begin custom _

  function propGetterFactory(prop) {
    return function(obj) {return obj[prop];};
  }

  _._ = _;

  // Shiv "min", "max" ,"sortedIndex" to accept property predicate.
  _.each(['min', 'max', 'sortedIndex'], function(fnName) {
    _[fnName] = _.wrap(_[fnName], function(fn) {
      var args = _.toArray(arguments).slice(1);

      if(_.isString(args[2])) {
        // for "sortedIndex", transmuting str to property getter
        args[2] = propGetterFactory(args[2]);
      }
      else if(_.isString(args[1])) {
        // for "min" or "max", transmuting str to property getter
        args[1] = propGetterFactory(args[1]);
      }

      return fn.apply(_, args);
    });
  });

  // Shiv "filter", "reject" to angular's built-in,
  // and reserve lodash's feature(works on obj).
  ng.injector(['ng']).invoke(['$filter', function($filter) {
    _.filter = _.wrap($filter('filter'), function(filter, obj, exp) {
      if(!(_.isArray(obj))) {
        obj = _.toArray(obj);
      }

      return filter(obj, exp);
    });

    _.reject = function(obj, exp) {
      // use angular built-in negated predicate
      if(_.isString(exp)) {
        return _.filter(obj, '!' + exp);
      }

      var diff = _.bind(_.difference, _, obj);

      return diff(_.filter(obj, exp));
    };
  }]);

  // end custom _


  // begin register angular-lodash/utils

  _.each(_.functions(_), function(methodName) {
    function register($rootScope) {$rootScope[methodName] = _.bind(_[methodName], _);}

    _.each([
      lodashModule,
      utilsModule,
      ng.module('angular-lodash/utils/' + methodName, [])
      ], function(module) {
        module.run(['$rootScope', register]);
    });
  });

  // end register angular-lodash/utils


  // begin register angular-lodash/filters

  var
    adapList = [
      ['map', 'collect'],
      ['reduce', 'inject', 'foldl'],
      ['reduceRight', 'foldr'],
      ['find', 'detect'],
      ['filter', 'select'],
      'reject',
      'invoke',
      'max',
      'min',
      'sortBy',
      'groupBy',
      'countBy',
      'shuffle',
      'toArray',
      'size',
      ['first', 'head', 'take'],
      'initial',
      'last',
      ['tail', 'drop'],
      'compact',
      'flatten',
      'without',
      'union',
      'intersection',
      'difference',
      'uniq',
      'zip',
      'fromPairs',
      'indexOf',
      'lastIndexOf',
      'sortedIndex',
      'keys',
      'values',
      'toPairs',
      'invert',
      ['functions', 'methods'],
      'pick',
      'omit',
      'tap',
      'identity',
      'uniqueId',
      'escape',
      'result',
      'template'
    ];

  _.each(adapList, function(filterNames) {
    if(!(_.isArray(filterNames))) {
      filterNames = [filterNames];
    }

    var
      filter = _.bind(_[filterNames[0]], _),
      filterFactory = function() {return filter;};

    _.each(filterNames, function(filterName) {
      _.each([
        lodashModule,
        filtersModule,
        ng.module('angular-lodash/filters/' + filterName, [])
        ], function(module) {
          module.filter(filterName, filterFactory);
      });
    });
  });

  // end register angular-lodash/filters

}(angular, _));