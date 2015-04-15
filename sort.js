/**
 * Util for sort functions
 *
 * @author Jordan Garcia
 */
var _ = require('lodash');

// CONSTANTS
var ASC = 'asc';
var DESC = 'desc';

var sortFunctions = {
  string: function(a, b) {
    a = a.toLowerCase ? a.toLowerCase() : a;
    b = b.toLowerCase ? b.toLowerCase() : b;
    if (a < b) {
      return 1;
    } else if (a > b) {
      return -1;
    } else {
      return 0;
    }
  },
  number: function(a, b) {
    return b - a;
  },
  date: function(a, b) {
    return new Date(b) - new Date(a);
  },
  length: function(a, b) {
    return b.length - a.length;
  },
  /**
   * Sort function based on truthiness
   * If a is truthy and b is falsy than a
   * comes before b in desc order
   */
  boolean: function(a, b) {
    if (a == b) {
      return 0;
    }
    if (a) {
      return -1;
    }
    if (b) {
      return 1;
    }
  }
};

/**
 * Returns a new function that sorts by some object property
 * @param {function} fn
 * @param {string} field
 * @param {string} getFn
 * @return {function}
 */
function sortByField(fn, field, getFn){
  if (!getFn) {
    return function(a, b) {
      return fn(a[field], b[field]);
    }
  } else {
    return function(a, b){
      return fn(getFn(a, field), getFn(b, field))
    }
  }
}

/**
 * Reverse the sort result of a compare function
 * @param {function} fn
 * @return {number}
 */
function reverse(fn) {
  return function(a, b) {
    return -fn(a, b);
  }
}

/**
 * Combines an array of functions into a sort function
 * that handles ties by calling the next function
 * @param {array.<function>} fns
 * @return {function}
 */
function combineComparators(fns) {
  var len = fns.length;
  return function(a, b) {
    var i = 0;
    var result = 0;
    while (i < len && result === 0) {
      result = fns[i](a, b);
      i++;
    }
    return result;
  }
}

/**
 * Usage:
 * sortObjectsBy([
 *   { field: 'goal_type', type: 'number', dir: sort.ASC },
 *   { field: 'goal_ids', type: 'number', dir: sort.ASC }
 * ])
 * opts.sortFns - custom mapping of type => sort function
 * opts.fieldGetFn - getter function
 *
 * @param {array<object>|object} sortBy sort by definition shown above
 * @param {array<function>} sortFns (optional) array of field type => sort function -- default order must be desc
 *
 * @return {function}
 */
function sortObjects(sortBy, opts) {
  opts = opts || {}

  if (!_.isArray(sortBy)) {
    // allow passing a single object as sortBy rules
    sortBy = [sortBy];
  }

  // fallback to default sort functions
  var fieldTypeSortFns = opts.sortFns || sortFunctions;

  var sortFns = sortBy.map(function(entry) {
    if (!entry.type || !entry.field || !entry.dir) {
      throw new Error("Must supply type, field and dir when generating object sort function");
    }

    var comparator = fieldTypeSortFns[entry.type];
    if (!comparator) {
      console.warn("No sort comparator for type=" + entry.type + "  Defaulting to string");
      comparator = sortFunctions.string;
    }
    // generate a sort function that sorts by the proper type
    // and looks at the proper field
    var sortFn = sortByField(comparator, entry.field, opts.fieldGetFn);
    if (entry.dir === ASC) {
      sortFn = reverse(sortFn);
    }
    return sortFn;
  });

  return combineComparators(sortFns);
}

function generateObjectSortFn(sortBy, customSortFns) {
  return sortObjects(sortBy, {
    sortFns: customSortFns
  })
}

function generateImmutableObjectSortFn(sortBy, customSortFns) {
  return sortObjects(sortBy, {
    sortFns: customSortFns,
    fieldGetFn: function(obj, field) {
      return obj.get(field)
    }
  })
}

module.exports = {
  functions: sortFunctions,
  field: sortByField,
  reverse: reverse,
  combineComparators: combineComparators,
  generateObjectSortFn: generateObjectSortFn,
  generateImmutableObjectSortFn: generateImmutableObjectSortFn,
  ASC: ASC,
  DESC: DESC,
};
