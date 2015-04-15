var _ = require('lodash')
var definition = require('./entity_definition');
var RestApi = require('modules/rest_api');
var fns = require('./fns');

var baseEntityActions = RestApi.createEntityActions(definition);

module.exports = _.extend(baseEntityActions, {
  /**
   * Fetches all custom dimensions for a project
   *
   * @param {Integer} number
   * @return {Deferred}
   */
  fetchDimensionsForProject: function (projectId) {
    return this.fetchAll({
      project_id: projectId
    });
  },

  /**
   * Fetch dimensions, add to segmentation audiences, and subtract from total slots allowed
   *
   * @param {Integer} projectId
   * @param {Array.<Audience>} audiences
   *
   * @return {Deferred}
   */
  fetchAvailableReportingSlotsCount: function (projectId, audiences) {
    var deferred = $.Deferred();
    var segmentationAudiences = audiences.filter(function(audience) {
      return audience.segmentation;
    });
    this.fetchDimensionsForProject(projectId).then(function(dimensions) {
      var availableSlots = fns.calculateAvailableReportingSlots(
        segmentationAudiences.length,
        dimensions.length
      );
      deferred.resolve(availableSlots);
    });
    return deferred;
  },

});
