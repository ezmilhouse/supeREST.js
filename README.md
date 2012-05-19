# Superest.js
a convenient wrapper for [TJ's express-resource for Node.js](https://github.com/visionmedia/express-resource)

## Motivation
I wanted to have an easier way kickstart with mongoDB connected to express-resources. So now it works with [mongoose for Node.js](http://mongoosejs.com/).
It also supports auto-loading and nested resources.

## Quickstart

Keep in mind that express-resources routes REST like this:

```js

    /**
     *
     * GET     /resource           ->  index
     * POST    /resource           ->  create
     * GET     /resource/:id       ->  show
     * PUT     /resource/:id       ->  update
     * DELETE  /resource/:id       ->  destroy
     *
     **/

```

```js


    // simple

    /**
     *
     * GET     /api/users           ->  index
     * POST    /api/users           ->  create
     * GET     /api/users/1234      ->  show
     * PUT     /api/users/1234      ->  update
     * DELETE  /api/users/1234      ->  destroy
     *
     **/

    superest.Resource
	    .create('users')
	    .db({
		    name   : 'myDB',
		    path   : 'mongodb://localhost',
		    schema : 'user'
	    })
	    .at({
		    base : 'api',
		    path : '/users'
	    })
	    .end();

```

```js


    // nested

    /**
     *
     * GET     /api/users/1234/friends           ->  index
     * POST    /api/users/1234/friends           ->  create
     * GET     /api/users/1234/friends/5678      ->  show
     * PUT     /api/users/1234/friends/5678      ->  update
     * DELETE  /api/users/1234/friends/5678      ->  destroy
     *
     **/

    // resource: users
    superest.Resource
	    .create('users')
	    .db({
		    name   : 'myDB',
		    path   : 'mongodb://localhost',
		    schema : 'user'
	    })
	    .at({
		    base : 'api',
		    path : '/users'
	    })
	    .end();


    // resource: friends
    superest.Resource
        .create('friends')
        .db({
            name   : 'myDB',
            path   : 'mongodb://localhost',
            schema : 'friend'
        })
        .at('path', 'friends')
        .in('user') // to be nested in user schema
        .end();


    // create connection
    superest.Connection
    	.create('userFriends')
    	.set('/users/friends') // REST pseudo path (without IDs)
    	.end();

```
