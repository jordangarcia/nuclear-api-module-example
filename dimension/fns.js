var constants = require('./constants');
var enums = require('./enums');

/**
 * Services layer pure functions for the dimensions
 */
module.exports = {
  /**
   * Logic for the calculation of available reporting slots
   */
  calculateAvailableReportingSlots: function(reportableAudiencesCount, dimensionsCount) {
    return constants.TOTAL_REPORTING_SLOTS - reportableAudiencesCount - dimensionsCount;
  },

  create: function (data) {
    var DEFAULTS = {
      id: null,
      project_id: null,
      name: '',
      description: '',
      // Set new Dimensions to Active by default.
      status: enums.dimension_status.ACTIVE,
      last_modified: null,
    };
    return _.extend({}, DEFAULTS, data || {});
  },
};
