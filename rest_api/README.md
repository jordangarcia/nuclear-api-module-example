# Data Extension

## Table of Contents

1. [Introduction](#introduction)
  1. [What Should Go In Models](#what-should-go-in-models)

2. [Creating a Model for a REST API entity](#creating-a-model-for-a-rest-api-entity)
  1. [REST API Requirements](#rest-api-requirements)
  2. [Creating the Model](#creating-the-model)
  3. [Model Definition Configuration](#model-definition-configuration)

3. [Model API Documentation](#model-api-documentation)

## Introduction

The models provided in the data extension are the canonical way to fetch, save, delete
and observe Optimizely entities.  Out of the the box models provide the following functionality

- fetch / fetchPage / fetchAll (to REST API)
- persist / delete (to REST API)
- createFetchGetter / createFetchPageGetter / createFetchAllGetter

As the entry point for data in and out of the frontend, models provide the canonical reference
to all entity instances loaded in the front end. Therefore all instances are
singletons, meaning if any part of the system updates an entity instance it all observers
will be notified, eliminating the need to do imperative state syncing between components.

### What Should Go In Models

#### Should be in models

- All persistence and fetch methods for a specific entity, boilerplate methods are already included via extending
the `BaseEntityModel`

- Semantic transforms of the entity data structure, ex: `archiveProject(proj)`

#### Should NOT be in models

- Anything dealing with UI state, for example setting the currentProjectId which is a piece of UI state


## Creating a Model for a REST API entity

After creating a REST API endpoint for an entity, creating model will allow you to full utilize the new endpoint
in the frontend codebase

### REST API Requirements

- API Must return an `id` property
- If an entity has a parent, the parent id must be a field, example: Experiemnts have the field `project_id` since
their parent is the Project entity
- For entities with a parent the following endpoints
  * GET `/<parent>/<parentId>` - gets all entities
  * GET `/<entity>/<entityId>` - gets single entity by id
  * POST `/<parent>/<parentId>/<entity>` - saving a new entity
  * PUT `/<entity>/<entityId>` - updating an entity
  * DELETE `/<entity>/<entityId>`

### Creating the Model

Creat the model in `./models/<model-name>.js`.  The filename should be singular and dash-cased.

```js
// Audience Model located at `extensions/data/models/audience.js`
var BaseEntityModel = require('../base-entity-model')
var fieldTypes = require('../constants/field-types')

class AudienceModel extends BaseEntityModel {
  // the one method that must be implemented
  getDefinition() {
    entity: 'audiences',

    parent: {
      entity: 'projects',
      key: 'project_id'
    },

    // define field types for frotend sorting / filtering
    fieldTypes: {
      id: fieldTypes.NUMBER,
      project_id: fieldTypes.NUMBER,
      name: fieldTypes.STRING,
      description: fieldTypes.STRING,
      last_modified: fieldTypes.STRING,
      conditions: fieldTypes.ARRAY,
      segmentation: fieldTypes.BOOLEAN,
    },

    // if a data transformation is needed before saving implement
    // a serialize function
    serialize(data) {
      if (data.conditions) {
        data.conditions = JSON.stringify(data.conditions);
      }
      return data;
    },

    // if a data transformation is needed after fetching implement
    // a deserialize function
    deserialize(data) {
      if (data.conditions) {
        data.conditions = JSON.parse(data.conditions);
      }
      return data;
    }
  }

  // methods can be extended here and call down to the BaseEntityModel
  // methods, like `fetchAll()`
  /**
   * Fetches all audiences where user_touched == true
   * @param {Integer} projectId
   * @return {Deferred}
   */
  function fetchSavedAudiences(projectId) {
    return this.fetchAll({
      project_id: projectId,
      user_touched: true,
    })
  }
}


// export a new instance of the model (this is treated as a singleton)
module.exports = new AudienceModel()
```

To expose the newly created model to other extensions or the sandbox it must be registered in
`extensions/data/index.js`

- Should be CamelCased and singular
- Keep in alphabetical order

```js
// `extensions/data/index.js`
module.exports = {
  Audience: require('./models/audience'),
  // ...
  Token: require('./models/token'),
  Variation: require('./models/variation'),
}
```


### Model Definition Configuration

#### config.isRelationshipEntity - *boolean* ( *optional* )

By default this is false.  RelationshipEntities have two parents and require a special `parents` config.

An Example is the `Collaborator` entity which has the endpoint `/projects/<project_id>/collaborators/<user_id>`

#### config.entity - *string*

The REST entity name, the convention is the plural version of the entity.

#### config.parent - *object*

Required for non relationship entities.  Is an object of parent.key and parent.entity

```js
parent: {
  entity: 'projects',
  key: 'project_id',
}
```

#### config.parent - *object*

Required only for relationship entities.  Is an array of objects of parent.key and parent.entity

```js
parents: [
  { entity: 'projects', key: 'project_id' },
  { entity: 'collaborators', key: 'user_id' },
]
```

**note**: the order matters, as the first entry in the array will show up first in the REST API endpoint generation.

#### config.fieldTypes - *object* ( *optional* )

Mapping of fields to their fieldType, this is used for client side sorting and filtering allowing
models to cache previous requests and return the same result the API would.

```js
fieldTypes: {
  id: fieldTypes.NUMBER,
  project_id: fieldTypes.NUMBER,
  name: fieldTypes.STRING,
  description: fieldTypes.STRING,
  last_modified: fieldTypes.STRING,
  conditions: fieldTypes.ARRAY,
  segmentation: fieldTypes.BOOLEAN,
},
```

#### config.serialize - *function* ( *optional* )

Implement if a data transformation is needed before sending data over the wire when saving.

`serialize` is a function that takes a single isntance of a entity and must return the transformed
instance. **`serialize` is not passed the instance by reference so implementors must return the instance**.

```js
serialize(data) {
  if (data.conditions) {
    data.conditions = JSON.stringify(data.conditions);
  }
  return data;
},
```

#### config.deserialize - *function* ( *optional* )

Implement if a data transformation is needed after fetching data over the wire.  This transformation
is applied before the data ever enters the flux system.

**Implementors must return the instance from deserialize.**

```js
deserialize(data) {
  if (data.conditions) {
    data.conditions = JSON.parse(data.conditions);
  }
  return data;
}
```


## Model API Documentation

The following methods are provided to every model via the `BaseEntityModel`

### save( instance )

Persists an entity instance.

**Note**: All saves are treated as `PATCH` operations, meaning fields can be omitted.

**args**
  1. **instance** *(`object`)*: the instance to be saved, can be a PATCH

**returns** *(`Promise`)*

```js
sandbox.Audience.save({
  id: 123,
  name: "New Audience Name"
})
```

### fetch( id, [ force ] )

Fetches an entity by id or parent ids (relationship entity).

If the same request has been made before this will not make additional calls to the REST API.

**args**
  1. **id** *(`number` | `object`)*: identifier of entity
  2. **force** *(`boolean`) optional*: bypass frontend cache and force API request

**returns** *(`Promise`)*

```js
sandbox.Audience.fetch(123)
```

### fetchPage( filters, [ force ] )

Returns a paged result set based on the filters provided. Must supply the parent_id => value in the filters
if the entity has a parent.

If the same request has been made before this will not make additional calls to the REST API. 

**args**
  1. **filters** *(`object`)*: map of property => filter value, below are special case filter keys
    * **$offset** *(`number`)*
    * **$limit** *(`number`)*
    * **$order** *(`string` | `array`)*: `'id:desc'` or `['id:desc', 'created:asc']`
  2. **force** *(`boolean`) optional*: bypass frontend cache and force API request

**returns** *(`Promise`)*

```js
sandbox.Audience.fetchPage({
  user_touched: true,
  $offset: 0,
  $limit: 20,
})
```

### fetchAll( filters, [ force ] )

Returns a all results that match the filters provided. Must supply the parent_id => value in the filters
if the entity has a parent.

If the same request has been made before this will not make additional calls to the REST API. 

**args**
  1. **filters** *(`object`)*: map of property => filter value, below are special case filter keys
    * **$order** *(`string` | `array`)*: `'id:desc'` or `['id:desc', 'created:asc']`
  2. **force** *(`boolean`) optional*: bypass frontend cache and force API request

**returns** *(`Promise`)*

```js
sandbox.Audience.fetchAll({
  user_touched: true,
})
```

### delete( instance )

Deletes an entity instance.

**args**
  1. **instance** *(`object`)*: can be either the instance of an object that contains the instance
  id or identifiers for relationship entities

**returns** *(`Promise`)*

```js
sandbox.Audience.delete(audienceInstance)
// or
sandbox.Audience.delete({
  id: 123,
})
```

### createFetchGetter( id )

Creates a Getter corresponding to a `fetch` operation.

**args**
  1. **id** *(`number` | `object`)*: identifier of entity

**returns** *(`Getter`)*

```js
sandbox.Audience.fetch(123)
var audienceGetter = sandbox.Audience.createFetchGetter(123)

// the value wont be available until the data is fetched
flux.evaluate(audienceGetter)

var unobserve = flux.observe(audienceGetter, aud => {
  console.log('audience loaded', aud)
})

// cleans up the event handlers from the `observe` call
unobserve()
```

### createFetchPageGetter( filters )

Creates a Getter for the result of a `fetchPage` operation.

Calling `fetchPage` and `createFetchPageGetter` with the same filters will give the same results.

**args**
  1. **filters** *(`object`)*: map of property => filter value, below are special case filter keys
    * **$offset** *(`number`)*
    * **$limit** *(`number`)*
    * **$order** *(`string` | `array`)*: `'id:desc'` or `['id:desc', 'created:asc']`

**returns** *(`Getter`)*

```js
var audiencePageGetter = sandbox.Audience.createFetchPageGetter({
  user_touched: true,
  $offset: 0,
  $limit: 20,
})
```

### createFetchAllGetter( filters )

Creates a Getter for the result of a `fetchAll` operation

Calling `fetchAll` and `createFetchAllGetter` with the same filters will give the same results.

**args**
  1. **filters** *(`object`)*: map of property => filter value, below are special case filter keys
    * **$order** *(`string` | `array`)*: `'id:desc'` or `['id:desc', 'created:asc']`

**returns** *(`Getter`)*

```js
var audienceGetter = sandbox.Audience.createFetchAllGetter({
  user_touched: true,
})
```
