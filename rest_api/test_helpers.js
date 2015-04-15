/**
 * Helper file of functions to for testing purposes
 */
var $ = require('jquery');
var _ = require('lodash');
var flux = require('flux2');
var sprintf = require('sprintf');
var fns = require('./fns');
var actionTypes = require('./action_types');
var crudActions = require('modules/rest_api/crud_actions');
var toImmutable = require('nuclear-js').toImmutable

module.exports = {
  loadEntities: loadEntities,
  stubApi: stubApi,
};

/**
 * Loads entity data in the entityCache
 *
 *
 * @param {String} entity
 * @param {Array|Object} data
 */
function loadEntities(entity, data) {
  flux.dispatch(actionTypes.API_INJECT_ENTITY, {
    entity: entity,
    data: data
  });
}

/**
 * Stubs the crud methods for save / fetch / fetchAll / fetchPage / delete
 * for an entity module
 */
function stubApi(data, config) {
  flux.dispatch(actionTypes.API_STUB_ENTITY, data);
  if (config && config.resolveTimeout) {
    flux.dispatch(actionTypes.SET_API_STUB_TIMEOUT, {
      timeout: config.resolveTimeout,
    })
  }
}
