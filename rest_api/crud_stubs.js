/**
 * module analagous to crud_acions but with entirely stubbed data
 * Used for testing
 *
 * @author Jordan Garcia (jordan@optimizely.com)
 */
var _ = require('lodash');
var flux = require('flux2');
var fns = require('./fns');
var toImmutable = require('nuclear-js').toImmutable;
var sprintf = require('sprintf');

exports.fetch = function(entityDef, id) {
  var entityData = getTestData(entityDef);

  if (!entityData) {
    throw new Error(sprintf("API is stubbed, no entries for entity: '%s'", entityDef.entity));
  }

  var results = (_.isObject(id))
    ? _.find(entityData, id)
    : _.find(entityData, { id: id });

  if (!results) {
    return reject()
  }
  return resolve(results);
};

exports.fetchAll = function(entityDef, filters) {
  var entityData = getTestData(entityDef);

  if (!entityData) {
    throw new Error(sprintf("API is stubbed, no entries for entity: '%s'", entityDef.entity));
  } else if (_.has(entityDef, 'deserialize')) {
    entityData = entityData.map(function(entry) {
      return entityDef.deserialize(_.cloneDeep(entry));
    });
  }

  // coerce to map
  var entityMap = toImmutable({}).withMutations(function(entityMap) {
    entityData.forEach(function(item, id) {
      entityMap.set(id, toImmutable(item));
    });
  });

  var results = fns.getAll(entityMap, entityDef, filters);
  return resolve(results.toJS());
};

exports.fetchPage = function(entityDef, filters) {
  var entityData = getTestData(entityDef);

  if (!entityData) {
    throw new Error(sprintf("API is stubbed, no entries for entity: '%s'", entityDef.entity));
  } else if (_.has(entityDef, 'deserialize')) {
    entityData = entityData.map(function(entry) {
      return entityDef.deserialize(_.cloneDeep(entry));
    });
  }

  // coerce to map
  var entityMap = toImmutable({}).withMutations(function(entityMap) {
    entityData.forEach(function(item, id) {
      entityMap.set(id, toImmutable(item));
    });
  });

  var results = fns.getPage(entityMap, entityDef, filters);
  return resolve(results.toJS());
};

exports.save = function(entityDef, instance) {
  var entityData = getTestData(entityDef);

  if (!entityData) {
    throw new Error(sprintf("API is stubbed, no entries for entity: '%s'", entityDef.entity));
  }

  var res = _.clone(instance);
  if (!instance.id) {
    res.id = Math.floor((Math.random() * 1000000) + 1);
    res.created = (new Date()).toString();
    res.last_modified = (new Date()).toString();
  } else {
    // saving by id, simulate a PATCH
    var existing = _.find(entityData, { id: instance.id });
    if (!existing) {
      throw new Error("Cannot find existing entity by id to do PUT, id = " + instance.id);
    }

    // do a PATCH style operation and assign properties on the existing object
    res = _.assign(_.clone(existing), res);
    res.last_modified = (new Date()).toString();
  }

  return resolve(res, 0);
};

exports.delete = function(entityDef, instance) {
  return resolve(null, 0);
};

function getTestData(entityDef) {
  return flux.evaluateToJS(['apiStubs', 'entityData', entityDef.entity]);
}

/**
 * Returns a deferred that will resolve with the passed in data
 */
function resolve(data, timeout) {
  var def = $.Deferred();
  if (timeout === undefined) {
    timeout = flux.evaluate(['apiStubs', 'timeout']);
  }

  if (timeout !== null) {
    setTimeout(function () {
      def.resolve(data)
    }, timeout);
  } else {
    def.resolve(data)
  }
  return def;
};

/**
 * Returns a deferred that will reject with the passed in data
 */
function reject(data, timeout) {
  var def = $.Deferred();
  if (timeout === undefined) {
    timeout = flux.evaluate(['apiStubs', 'timeout']);
  }

  if (timeout !== null) {
    setTimeout(function () {
      def.reject(data)
    }, timeout);
  } else {
    def.reject(data)
  }
  return def;
};
