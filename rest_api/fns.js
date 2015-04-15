var Immutable = require('immutable')
var sort = require('utils/sort')
var fieldTypes = require('./field_types')

module.exports = {
  createSortFn: createSortFn,
  createFilterFn: createFilterFn,
  getPage: getPage,
  getAll: getAll,
}

/**
 * Creates a sorting function based on the model.fieldTypes
 * and order string/array
 *
 * order is of the format 'created:desc' or ['created:desc', 'id:asc']
 * @param {Object} entityFieldTypes
 * @param {Array|String} order
 * @return {Function}
 */
function createSortFn(order, entityFieldTypes) {
  entityFieldTypes = entityFieldTypes || {}
  // If a string is passed in, coerce to an array
  if (typeof order  === 'string') {
    order = [order]
  }

  // transform ['created:desc', 'id:asc'] => [
  //   { field: 'created', dir: 'desc', type: 'date' },
  //   { field: 'id', dir: 'asc', type: 'number' },
  // ]
  var sortBy = order.map(function(orderString) {
    var orderParts = orderString.split(':')
    var field = orderParts[0]
    var direction = (orderParts.length > 1 && orderParts[1] === sort.DESC) ?
      sort.DESC :
      sort.ASC
    var type = entityFieldTypes[field]

    // default to string or number if id
    if (!type && field === 'id') {
      type = (field === 'id') ?
        fieldTypes.NUMBER :
        fieldTypes.STRING
    }

    return {
      field: field,
      dir: direction,
      type: type,
    }
  })

  return sort.generateImmutableObjectSortFn(sortBy)
}

/**
 * Creates and returns a single function that returns true/false
 * whether an item meets all of the filters
 *
 * Supports doing a _.contains for ARRAY types
 *
 * @param {Object} entityFieldTypes
 * @param {Object?} filters
 */
function createFilterFn(filters, entityFieldTypes) {
  entityFieldTypes = entityFieldTypes || {};

  // Filter keys starting with $ are only used by fetchAll & fetchPage (pagination).
  filters = _.omit(filters, function(value, key) {
    return key[0] === '$';
  });
  // map the current filters to filterFns
  var filterFns = _.map(filters, function(val, field) {
    if (entityFieldTypes[field] === fieldTypes.ARRAY) {
      return function(item) {
        return _.contains(item.get(field), val)
      }
    } else if (_.isArray(val)) {
      return function(item) {
        return _.contains(val, item.get(field));
      }
    } else {
      return function(item) {
        return item.get(field) === val
      }
    }
  })
  return function(item) {
    return filterFns.every(function(fn) {
      return fn(item)
    })
  }
}

/**
 * Gets a cached paged result from entity store
 * @param {Immutable.Map} entityMap supplied by the modelCache store
 * @param {object} modelDef
 * @param {object|undefined} filters
 * @return {array.<Immutable.Map>}
 */
function getPage(map, modelDef, filters) {
  filters = filters || {}
  var data = getAll(map, modelDef, filters)

  if (filters.$limit || filters.$offset) {
    var $limit = filters.$limit
    var $offset = filters.$offset ? filters.$offset : 0

    return data.skip($offset).take($limit)
  }
  return data
}

/**
 * Gets a cached paged result from entity store
 *
 * Get all data in the store, can supply map of filters
 * @param {Immutable.Map} entityMap supplied by the modelCache store
 * @param {object} modelDef
 * @param {object|undefined} filters
 * @return {array.<Immutable.Map>}
 */
function getAll(entityMap, modelDef, filters) {
  if (!entityMap) {
    return Immutable.List([])
  }
  var data = entityMap.toList()

  filters = filters || {}
  var $order = filters.$order
  var $filters = _.omit(filters, ["$order", "$limit", "$offset"])

  if (!_.isEmpty($filters)) {
    data = data.filter(createFilterFn($filters, modelDef))
  }

  if ($order) {
    data = data.sort(createSortFn($order, modelDef.fieldTypes))
  }

  return data
}
