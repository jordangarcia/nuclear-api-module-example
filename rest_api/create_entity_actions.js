/**
 * Rest API CRUD actions that utilize Flux as a frontend datastore
 */
var _ = require('lodash')
var flux = require('flux2')
var toJS = require('nuclear-js').toJS

var createRequestInfo = require('./api/create_request_info')
var crudActions = require('./crud_actions')
var fns = require('./fns')
var apiActionTypes = require('./action_types')

/**
 * Returns an object closing over the context of the entityDef
 * Use in creation of entity module actions
 * @param {Object} entityDef
 * @return {Object}
 */
module.exports = function(entityDef) {
  return {
    /**
     * Makes an apiActionTypes request to delete entity and sends the proper result
     * event into the flux system
     * @param {object} instance
     */
    delete: function(instance) {
      var onSuccess = onDeleteSuccess.bind(null, entityDef.entity, instance.id)
      var onFail = onDeleteFail.bind(null, entityDef.entity, instance.id)
      if (isEntityStubbed(entityDef)) {
        var crudStubs = require('./crud_stubs');
        return crudStubs.delete(entityDef, instance).then(onSuccess, onFail)
      } else {
        return crudActions.delete(entityDef, instance).then(onSuccess, onFail)
      }
    },

    /**
     * Persists an entity to the database
     * @param {object} data
     */
    save: function(data) {
      var onSuccess = onPersistSuccess.bind(this, entityDef.entity)
      var onFail = onPersistFail.bind(this, entityDef.entity, data)

      flux.dispatch(apiActionTypes.API_ENTITY_PERSIST_START, {
        entity: entityDef.entity,
        data: data
      })

      if (isEntityStubbed(entityDef)) {
        var crudStubs = require('./crud_stubs');
        return crudStubs.save(entityDef, data).then(onSuccess, onFail)
      } else {
        return crudActions.save(entityDef, data).then(onSuccess, onFail)
      }
    },

    /**
     * Does a Model.fetch() generically and wraps with request caching
     * and flux-specific deferred resolve/reject functionality
     * @param {number|object} fetchParams
     * @param {boolean} force a model fetch instead of using cache
     */
    fetch: function(fetchParams, force) {
      return executeModelFetch(entityDef, 'fetch', fetchParams, force)
    },

    /**
     * Does a Model.fetchPage() generically and wraps with request caching
     * and flux-specific deferred resolve/reject functionality
     * @param {object} filters
     * @param {boolean} force a model fetch instead of using cache
     */
    fetchPage: function(filters, force) {
      if (!filters.$limit) {
        throw new Error("fetchPage: must take a limit. Otherwise use fetchAll instead.")
      }
      return executeModelFetch(entityDef, 'fetchPage', filters, force)
    },

    /**
     * Generic fetchAll function, wraps Model.fetchAll with request caching
     * and flux-specific deferred resolve/reject functionality
     * @param {object|undefined} filters
     * @param {boolean} force a model fetch instead of using cache
     */
    fetchAll: function(filters, force) {
      return executeModelFetch(entityDef, 'fetchAll', filters, force)
    },

    /**
     * Flush everything from the given entity cache
     *
     */
    flush: function() {
      return flux.dispatch(apiActionTypes.FLUSH_ENTITY_STORE, {
        entity: entityDef.entity,
      })
    }
  }
}

/**
 * Dispatches action when an API fetch request starts
 * @private
 *
 * @param {Immutable.Map} requestInfo with `method` and `requestArgs`
 * @param {Deferred} deferred
 */
function onFetchStart(requestInfo, deferred) {
  flux.dispatch(apiActionTypes.API_ENTITY_FETCH_START, {
    entity: requestInfo.get('entity'),
    requestInfo: requestInfo,
    deferred: deferred,
  })
}

/**
 * Dispatch an API_ENTITY_FETCH_SUCCESS event to the system
 * @private
 *
 * @param {Immutable.Map} requestInfo with `method` and `requestArgs`
 * @param {object|array} response
 */
function onFetchSuccess(requestInfo, response) {
  flux.dispatch(apiActionTypes.API_ENTITY_FETCH_SUCCESS, {
    entity: requestInfo.get('entity'),
    data: response,
    requestInfo: requestInfo,
  })
  return response
}

/**
 * Dispatch an API_ENTITY_FETCH_FAIL event to the system
 * @private
 *
 * @param {Immutable.Map} requestInfo with `method` and `requestArgs`
 * @param {string} reason
 */
function onFetchFail(requestInfo, reason) {
  flux.dispatch(apiActionTypes.API_ENTITY_FETCH_FAIL, {
    entity: requestInfo.get('entity'),
    reason: reason,
    requestInfo: requestInfo,
  })
  return reason
}

/**
 * Dispatch an API_ENTITY_PERSIST_SUCCESS event to the system
 * @private
 *
 * @param {string} entity
 * @param {object|array} instance
 */
function onPersistSuccess(entity, instance) {
  flux.dispatch(apiActionTypes.API_ENTITY_PERSIST_SUCCESS, {
    entity: entity,
    data: instance,
  })
  return instance
}

/**
 * Dispatch an API_ENTITY_PERSIST_FAIL event to the system
 * @private
 *
 * @param {string} entity
 * @param {object} data of the instance
 * @param {string} reason
 */
function onPersistFail(entity, data, reason) {
  flux.dispatch(apiActionTypes.API_ENTITY_PERSIST_FAIL, {
    entity: entity,
    reason: reason,
    data: data,
  })
  return reason
}

/**
 * Dispatch an API_ENTITY_DELETE_SUCCESS event to the system
 * @private
 *
 * @param {string} entity
 * @param {number} id
 */
function onDeleteSuccess(entity, id) {
  flux.dispatch(apiActionTypes.API_ENTITY_DELETE_SUCCESS, {
    entity: entity,
    id: id,
  })
}

/**
 * Sees if a request is already in progress and returns the
 * in progress deferred
 * @param {Immutable.Map} args
 * @return {Deferred|undefined}
 */
function getRequestInProgress(requestInfo) {
  return flux.evaluate(['apiRequestInProgress', requestInfo])
}

/**
 * Sees if a request is already in progress and returns the
 * in progress deferred
 * @param {Immutable.Map} args
 * @return {Deferred|undefined}
 */
function isRequestCached(requestInfo) {
  return flux.evaluate(['apiRequestCache', requestInfo])
}

/**
 * Calls to the flux entityCache instead of making an ajax request to the REST API
 * The result of this is indistinguishable between making a real API call given that the
 * data hasn't changed server-side
 * @param {Object} entityDef
 * @param {number} id
 * @return {Object|undefined}
 */
function simulateApiFetch(entityDef, id) {
  return flux.evaluateToJS([
    ['entityCache', entityDef.entity],
    function(entityMap) {
      return entityMap.get(id)
    }
  ])
}

/**
 * Calls to the flux entityCache instead of making an ajax request to the REST API
 * The result of this is indistinguishable between making a real API call given that the
 * data hasn't changed server-side
 * @param {Object} entityDef
 * @param {Object} filters
 * @return {Array}
 */
function simulateApiFetchPage(entityDef, filters) {
  return flux.evaluateToJS([
    ['entityCache', entityDef.entity],
    function(entityMap) {
      return fns.getPage(entityMap, entityDef, filters)
    }
  ])
}

/**
 * Calls to the flux entityCache instead of making an ajax request to the REST API
 * The result of this is indistinguishable between making a real API call given that the
 * data hasn't changed server-side
 * @param {Object} entityDef
 * @param {Object?} filters
 * @return {Array}
 */
function simulateApiFetchAll(entityDef, filters) {
  return flux.evaluateToJS([
    ['entityCache', entityDef.entity],
    function(entityMap) {
      return fns.getAll(entityMap, entityDef, filters)
    }
  ])
}

/**
 * Function that calls all model fetch* functions
 * with a cache wrapper
 * @param {Model} model
 * @param {string} method
 * @param {number|object} args the single argument passed to fetch*
 *                            in the case of fetch() it can be just a number (id)
 * @param {boolean} force bypass of the cache layer and always fetch a result from apiActionTypes
 *
 * @return {Deferred}
 */
function executeModelFetch(entityDef, method, args, force) {
  var deferred
  var entity = entityDef.entity
  // mapping of model.fetch* methods to their corresponding store methods
  var fetchMethodMap = {
    'fetch': function() {
      return simulateApiFetch(entityDef, args)
    },
    'fetchPage': function() {
      return simulateApiFetchPage(entityDef, args)
    },
    'fetchAll': function() {
      return simulateApiFetchAll(entityDef, args)
    },
  }

  var storeMethod = fetchMethodMap[method]
  if (!storeMethod) {
    throw new Error("Invalid fetch method " + method)
  }

  var requestInfo = createRequestInfo(entity, method, args)
  var onSuccess = onFetchSuccess.bind(null, requestInfo)
  var onFail = onFetchFail.bind(null, requestInfo)

  var requestInProgress = getRequestInProgress(requestInfo)
  if (requestInProgress) {
    return requestInProgress
  }

  // if the request is cached dont make again
  if (!force && isRequestCached(requestInfo)) {
    // TODO: should we just stick with jQuery deferred here for consistency?
    var def = $.Deferred()
    var fetchMethod = fetchMethodMap[method]
    def.resolve(fetchMethod())
    return def
  }

  // if it isn't cached just do a model fetch*
  if (isEntityStubbed(entityDef)) {
    var crudStubs = require('./crud_stubs');
    deferred = crudStubs[method](entityDef, args).then(onSuccess, onFail)
  } else {
    deferred = crudActions[method](entityDef, args).then(onSuccess, onFail)
  }
  onFetchStart.call(null, requestInfo, deferred)
  return deferred
}

/**
 * Dispatch an API_ENTITY_DELETE_FAIL event to the system
 * @private
 *
 * @param {string} entity
 * @param {number} id
 * @param {string} reason
 */
function onDeleteFail(entity, id, reason) {
  flux.dispatch(apiActionTypes.API_ENTITY_DELETE_FAIL, {
    entity: entity,
    id: id,
    reason: reason,
  })
}

/**
 * returns whether the entity is stubbed or not
 */
function isEntityStubbed(entityDef) {
  return flux.evaluate(['apiStubs', 'entityData', entityDef.entity])
}
