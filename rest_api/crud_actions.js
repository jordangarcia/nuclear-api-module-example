var _ = require('lodash')
var requester = require('./api/requester')

/**
 * Functions for models with only one parent
 *
 * Config required:
 *
 * config.entity: string
 * config.parent: object (optional)
 * config.parent.entity: string
 * config.parent.key: string
 */
var entityApiFunctions = {
  /**
   * Persists entity using rest API
   *
   * @param {object} config model definition
   * @param {Model} instance
   * @return {Deferred}
   */
  save: function(config, instance) {
    if (instance.id) {
      // do PUT save
      return requester()
        .one(config.entity, instance.id)
        .put(instance)
    } else {
      // no id is set, do a POST
      var endpoint = requester()
      if (config.parent) {
        endpoint.one(config.parent.entity, instance[config.parent.key])
      }

      return endpoint
        .all(config.entity)
        .post(instance)
    }
  },

  /**
   * Fetch and return an entity
   * @param {object} config model definition
   * @param entityId Id of Entity to fetch
   * @returns {Deferred} Resolves to fetched Model instance
   */
  fetch: function(config, entityId) {
    return requester()
      .one(config.entity, entityId)
      .get()
  },

  /**
   * Fetches a page of entities that match the supplied filters
   * as well as the offset and limit defining the size of the page.
   * If the model has a parent association then the parent.key must be
   * supplied.
   * @param {object} config model definition
   * @param {Object|undefined} filters (optional)
   * @return {Deferred}
   */
  fetchPage: function(config, filters) {
    filters = filters || {}
    var $order = filters.$order
    var $limit = filters.$limit
    var $offset = filters.$offset || 0
    var $filters = _.omit(filters, ["$order", "$limit", "$offset"])
    var endpoint = requester()

    if (config.parent && !$filters[config.parent.key]) {
      throw new Error("fetchPage: must supply the parent.key as a filter to fetch entities")
    }

    if (config.parent) {
      endpoint.one(config.parent.entity, $filters[config.parent.key])
      // since the filtering is happening in the endpoint url we dont need filters
      delete $filters[config.parent.key]
    }

    return endpoint
      .all(config.entity)
      .filter($filters)
      .order($order)
      .limit($limit)
      .offset($offset)
      .get()
  },

  /**
   * Fetches all the entities that match the supplied filters
   * If the model has a parent association then the parent.key must be
   * supplied.
   * @param {object} config model definition
   * @param {Object|undefined} filters (optional)
   * @return {Deferred}
   */
  fetchAll: function(config, filters) {
    filters = filters || {}
    var $order = filters.$order
    filters = _.omit(filters || {}, ['$order'])
    var endpoint = requester()

    if (config.parent && !filters[config.parent.key]) {
      throw new Error("fetchAll: must supply the parent.key as a filter to fetch all entities")
    }

    if (config.parent) {
      endpoint.one(config.parent.entity, filters[config.parent.key])
      // since the filtering is happening in the endpoint url we dont need filters
      delete filters[config.parent.key]
    }

    return endpoint
      .all(config.entity)
      .filter(filters)
      .order($order)
      .get()
  },

  /**
   * Makes an API request to delete the instance by id
   * @param {object} config model definition
   * @param {Model} instance
   */
  delete: function(config, instance) {
    if (!instance.id) {
      throw new Error("delete(): `id` must be defined")
    }

    return requester()
      .one(config.entity, instance.id)
      .delete()
  },
}

/**
 * Functions for models with two parents
 *
 * Example: project_integrations has integration and project as parents
 *
 * Sample Config:
 *
 * config options:
 * 'entity' {String} name of entity in the API, ex: 'projectintegrations' (unique)
 * 'parents' {[{ entity: String, key: String }]} the required parents association for fetches, note here that
 *                                               the order of parent configs in this property matters, e.g. for
 *                                               [{entity: 'projects', key: ...}, {entity: 'integrations', key: ...}],
 *                                               the fetchAll operation will use an API endpoint like below:
 *                                               /projects/<project_id>/integrations, reverse the parent configs
 *                                               the endpoint will then become /integrations/<integration_id>/projects
 * 'fields' {Object} (optional) hash of default values of the entity when using Model.create()
 *
 *
 * Config required:
 *
 * config.entity: string
 * config.parents: array
 */
var relationshipApiFunctions = {
  /**
   * Persists a relationship entity using rest API
   *
   * @param {Model} instance
   * @return {Deferred}
   */
  save: function(config, instance) {
    var endpoint = requester()

    _.each(config.parents, function(parentConfig) {
      if (!instance[parentConfig.key]) {
        throw new Error(parentConfig.key + " must be supplied in instance.")
      }
      endpoint.one(parentConfig.entity, instance[parentConfig.key])
    })

    // PUT endpoint will perform upsert operation for relationship entities
    return endpoint.put(instance)
  },

  /**
   * Fetch and return a relationship entity
   * @param {Object} parentIdMap Ids of parent entities which together identify the relationship entity to fetch
   * @returns {Deferred} Resolves to fetched Model instance
   */
  fetch: function(config, parentIdMap) {
    var endpoint = requester()

    _.each(config.parents, function(parentConfig) {
      if (!parentIdMap[parentConfig.key]) {
        throw new Error(parentConfig.key + " must be supplied in parentIdMap.")
      }
      endpoint.one(parentConfig.entity, parentIdMap[parentConfig.key])
    })

    return endpoint.get()
  },

  /**
   * Fetches a page of entities that match the supplied filters
   * TODO Implement fetchPage for relationship models
   */
  fetchPage: function(config, filters) {
    this.fetchAll(filters)
  },

  /**
   * Fetches all the entities that match the supplied filters
   * Exactly one of the parents' keys must not be supplied in filters.
   * @param {Object|undefined} filters (optional)
   * @return {Deferred}
   */
  fetchAll: function(config, filters) {
    filters = _.clone(filters || {})
    var endpoint = requester()
    var missingParentEntity

    _.each(config.parents, function(parentConfig) {
      if (filters[parentConfig.key]) {
        endpoint.one(parentConfig.entity, filters[parentConfig.key])
        delete filters[parentConfig.key]
      } else {
        if (missingParentEntity) {
          throw new Error("fetchAll: miss too many parent IDs in filters: " +
                           [missingParentEntity.key, parentConfig.key].join(", "))
        } else {
          missingParentEntity = parentConfig
        }
      }
    })

    if (!missingParentEntity) {
      throw new Error("fetchAll: exactly one of the parents' keys must not be supplied in filters.")
    }

    return endpoint.all(missingParentEntity.entity)
                   .filter(filters)
                   .get()
  },

  /**
   * Makes an API request to delete a relationship entity by its parent ids
   * @param {Model} instance
   */
  delete: function(config, instance) {
    var endpoint = requester()

    _.each(config.parents, function(parentConfig) {
      if (!instance[parentConfig.key]) {
        throw new Error(parentConfig.key + " must be supplied in instance.")
      }
      endpoint.one(parentConfig.entity, instance[parentConfig.key])
    })

    return endpoint.delete()
  },
}

module.exports = {
  /**
   * Persists an entity through REST API.  Does a PATCH if the `id` isn't set
   *
   * @param {object} modelDef
   * @param {object} instance
   * @return {Promise}
   */
  save: function(modelDef, instance) {
    if (modelDef.serialize) {
      instance = modelDef.serialize(_.cloneDeep(instance))
    }

    var def
    if (modelDef.isRelationshipEntity) {
      def = relationshipApiFunctions.save(modelDef, instance)
    } else {
      def = entityApiFunctions.save(modelDef, instance)
    }

    if (modelDef.deserialize) {
      return def.pipe(modelDef.deserialize)
    }
    return def
  },

  /**
   * Fetches an entity by id or parent keys (relationship entity)
   *
   * @param {object} modelDef
   * @param {number|object} filter
   * @return {Promise}
   */
  fetch: function(modelDef, filters) {
    var def
    if (modelDef.isRelationshipEntity) {
      def = relationshipApiFunctions.fetch(modelDef, filters)
    } else {
      def = entityApiFunctions.fetch(modelDef, filters)
    }
    if (modelDef.deserialize) {
      return def.pipe(modelDef.deserialize)
    }
    return def
  },

  /**
   * Fetches a page of an entity must supply $limit and $offset as filters
   *
   * @param {object} modelDef
   * @param {object} filter
   * @return {Promise}
   */
  fetchPage: function(modelDef, filters) {
    var def
    if (modelDef.isRelationshipEntity) {
      def = relationshipApiFunctions.fetchPage(modelDef, filters)
    } else {
      def = entityApiFunctions.fetchPage(modelDef, filters)
    }
    if (modelDef.deserialize) {
      return def.pipe(function(results) {
        return results.map(modelDef.deserialize)
      })
    }
    return def
  },

  /**
   * Fetches all entries for an entity
   *
   * @param {object} modelDef
   * @param {object} filter
   * @return {Promise}
   */
  fetchAll: function(modelDef, filters) {
    var def
    if (modelDef.isRelationshipEntity) {
      def = relationshipApiFunctions.fetchAll(modelDef, filters)
    } else {
      def = entityApiFunctions.fetchAll(modelDef, filters)
    }
    if (modelDef.deserialize) {
      return def.then(function(results) {
        return results.map(modelDef.deserialize)
      })
    }
    return def
  },

  /**
   * Deletes an entity through the rest API
   * @param {object} modelDef
   * @param {instance}
   * @return {Promise}
   */
  delete: function(modelDef, instance) {
    if (modelDef.isRelationshipEntity) {
      return relationshipApiFunctions.delete(modelDef, instance)
    } else {
      return entityApiFunctions.delete(modelDef, instance)
    }
  },
}
