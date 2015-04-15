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


## Entity Actions API Documentation

The following methods are provided to every entity action group via the `RestApi.createEntityActions(entityDef)`

### save( instance )

Persists an entity instance.

**Note**: All saves are treated as `PATCH` operations, meaning fields can be omitted.

**args**
  1. **instance** *(`object`)*: the instance to be saved, can be a PATCH

**returns** *(`Promise`)*

```js
Audience.actions.save({
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
Audience.actions.fetch(123)
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
Audience.actions.fetchPage({
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
Audience.actions.fetchAll({
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
Audience.actions.delete(audienceInstance)
// or
Audience.actions.delete({
  id: 123,
})
```
