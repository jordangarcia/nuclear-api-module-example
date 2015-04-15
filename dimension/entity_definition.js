var fieldTypes = require('modules/rest_api/field_types')

/**
 * Entity Definition for dimension
 */
module.exports = {
  entity: 'dimensions',

  parent: {
    entity: 'projects',
    key: 'project_id',
  },


  fieldsTypes: {
    id: fieldTypes.NUMBER,
    project_id: fieldTypes.NUMBER,
    name: fieldTypes.STRING,
    description: fieldTypes.STRING,
    // Set new Dimensions to Active by default
    status: fieldTypes.STRING,
    last_modified: fieldTypes.DATE
  }
};
