var _ = require('lodash')
var $ = require('jquery')

/**
 * Config Options
 * config.headers {Object}
 * config.baseUrl {String}
 *
 * @constructor
 * @param {Object} config
 */
function Api(config) {
  // config
  this._config = config || {};

  // stack of [('one' | 'all'), <noun>, <id?>]
  // ex [['all', 'experiments'] or ['one', 'projects', 4001]]
  this._stack = [];

  /**
   * Array of filters to apply to URL
   * ex: /api/v1/projects/4001/experiments?filter=status:Started&filter=project_id:55
   * @var Array.<{field: string, value: string}>
   */
  this._filter = [];

  /**
   * Array of filters to apply to URL
   * ex: /api/v1/projects/4001/experiments?order=created:desc
   * @var Array.<{field: string, value: string}>
   */
  this._order = [];

  /**
   *  to apply to URL
   * ex: /api/v1/projects/4001/experiments?limit:100
   * @var Array.<{field: string, value: string}>
   */
  this._limit = null;

  /**
   * Array of filters to apply to URL
   * ex: /api/v1/projects/4001/experiments?limit:20&offset:40
   * @var Array.<{field: string, value: string}>
   */
  this._offset = null;
}

/**
 * Class level method to make an ajax request
 * Exists at class level for ease of testability
 *
 * Opts:
 * 'data' {Object}
 * 'type' {String} 'GET', 'PUT', 'POST', 'DELETE'
 * 'url' {String}
 *
 * @param {Object} opts
 * @param {Object=} headers
 * @return {Deferred}
 */
Api.request = function(opts, headers) {
  if (!opts.type || !opts.url) {
    throw new Error("Must supply `opts.type` and `opts.url` to Api.request(opts)");
  }

  var ajaxOpts = {
    type: opts.type,
    url: opts.url,
    contentType: 'application/json',
    // Provide no default ajax error handler
    // Instead, use the one defined above as errorHandler
    // in the .fail() handler
    error: null,
  };

  if (headers) {
    ajaxOpts.headers = headers;
  }

  if (opts.data) {
    ajaxOpts.data = JSON.stringify(opts.data);
    ajaxOpts.dataType = 'json';
  }

  return $.ajax(ajaxOpts)
    .fail(function(jqXHR, textStatus, errorThrown) {
      var ui = require('sandbox/ui');
      var errorService = require('services/error');
      var errorData = errorService.getAjaxErrorData(jqXHR, textStatus, errorThrown)
      ui.error(errorData);
    });
}

/**
 * Appends '/{noun}/{id}' to the endpoint
 * @param {string} noun
 * @param {number} id
 * @return {Api}
 */
Api.prototype.one = function(noun, id) {
  this._stack.push(['one', noun, id]);
  return this;
};

/**
 * Appends '/{noun}' to the endpoint
 * @param {string} noun
 * @return {Api}
 */
Api.prototype.all = function(noun) {
  this._stack.push(['all', noun]);
  return this;
};

/**
 * Adds property to filter
 *
 * @param {String|Object} keyOrObject single key (to associate with val) or object of key/value pairs
 * @param {String=} val Value to match against
 * @return {Api}
 */
Api.prototype.filter = function(keyOrObject, val) {
  if (this._getMode() !== 'all') {
    throw new Error("ApiService Error: .filter() must be called in 'all' mode");
  }

  var filters = keyOrObject;
  if (typeof keyOrObject === 'string') {
    filters = {};
    // use 'true' if no value is provided
    filters[keyOrObject] = val;
  }

  _.each(filters, function(val, key) {
    if (_.isArray(val)) {
      val.forEach(function (el) {
        this._filter.push([key, el]);
      }.bind(this));
    } else {
      this._filter.push([key, val]);
    }
  }.bind(this));

  return this;
};

/**
 * Adds property to order
 *
 * @param {Array|String} order string or array of key/value pair strings
 * @return {Api}
 */
Api.prototype.order = function(order) {
  if (this._getMode() !== 'all') {
    throw new Error("ApiService Error: .order() must be called in 'all' mode");
  }

  if (order) {
    // If a string is passed in, coerce to an array
    if (typeof order === 'string') {
      order = [order];
    }

    order.forEach(function(val) {
      this._order.push(val);
    }.bind(this));
  }

  return this;
};

/**
 * Adds property to offset
 *
 * @param {Object} offset integer specifying page offset
 * @return {Api}
 */
Api.prototype.offset = function(offset) {
  if (this._getMode() !== 'all') {
    throw new Error("ApiService Error: .offset() must be called in 'all' mode");
  }

  this._offset = offset;
  return this;
};

/**
 * Adds property to filter
 *
 * @param {Object} Object single key (to associate with val) or object of key/value pairs
 * @return {Api}
 */
Api.prototype.limit = function(limit) {
  if (this._getMode() !== 'all') {
    throw new Error("ApiService Error: .limit() must be called in 'all' mode");
  }

  this._limit = limit;
  return this;
};

/**
 * Make POST request to current endpoint
 * @param {Object} data
 * @return {Deferred}
 */
Api.prototype.post = function(data) {
  if (this._getMode() !== 'all') {
    throw new Error("ApiService Error: .post() must be called in 'all' mode");
  }

  var entity = this._getEntity();

  var opts = {
    type: 'POST',
    data: data,
    url: this._getUrl()
  };

  return Api.request(opts, this._config.headers)
};

/**
 * Update with data
 * @param {Object} data
 * @return {Deferred}
 */
Api.prototype.put = function(data) {
  if (this._getMode() !== 'one') {
    throw new Error("ApiService Error: .put() must be called in 'one' mode");
  }

  var entity = this._getEntity();

  var opts = {
    type: 'PUT',
    data: data,
    url: this._getUrl()
  };

  return Api.request(opts, this._config.headers)
};

/**
 * Performs a GET request to the current endpoint the instance
 * is set to.
 *
 * @return {Deferred}
 */
Api.prototype.get = function() {
  var opts = {
    type: 'GET',
    url: this._getUrl()
  };

  return Api.request(opts, this._config.headers)
};

/**
 * Performs a DELETE request to the current endpoint
 *
 * @return {Deferred}
 */
Api.prototype.delete = function() {
  // TODO(jordan): should .delete() be callable after .all()
  if (this._getMode() !== 'one') {
    throw new Error("ApiService Error: .delete() must be called in 'one' mode");
  }

  var opts = {
    type: 'DELETE',
    url: this._getUrl()
  };

  return Api.request(opts, this._config.headers);
};

/**
 * Builds the url from this._stack
 * @private
 */
Api.prototype._getUrl = function() {
  var url = this._config.baseUrl || '';
  var filters = [];
  var order = [];
  var params = [];

  url = this._stack.reduce(function(memo, item) {
    var mode = item[0]; // 'one' or 'all'
    memo += '/' + item[1] // noun
    if (mode === 'one') {
      memo += '/' + item[2] // id
    }
    return memo;
  }, url);

  if (this._filter.length > 0) {
    this._filter.forEach(function(tuple) {
      params.push('filter=' + tuple[0] + ':' + tuple[1]);
    });
  }

  if (this._order.length > 0) {
    this._order.forEach(function(order) {
      params.push('order=' + order);
    });
  }

  if (this._limit) {
    params.push('limit=' + this._limit);
  }

  if (this._offset) {
    params.push('offset=' + this._offset);
  }

  if (params.length > 0) {
    url += '?';
    url += params.join('&');
  }

  return url;
};

/**
 * Gets the entity of the url
 * @private
 */
Api.prototype._getEntity = function() {
  return this._stack[this._stack.length - 1][1];
};

/**
 * Gets the mode of the request ('one' | 'all')
 * @private
 */
Api.prototype._getMode = function() {
  return this._stack[this._stack.length - 1][0];
};

module.exports = {
  // expose the Api constructor
  Api: Api,
  // the create function used to make an api instance
  /**
   * @param {{
   *    headers: object,
   *    baseUrl: string,
   * }} config
   */
  create: function(config) {
    return function() {
      return new Api(config);
    }
  }
};
