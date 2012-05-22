var mongoose = require('mongoose')
	, Resource = require('express-resource')
	, Schema = mongoose.Schema
	, _ = require('underscore');


module.exports = function(app) {



	// Current version, keep in sync with `package.json`.
	var version = '0.0.1';

	// ---

	/**
	 * @function isObject(mixed)
	 * @helper
	 * @param mixed
	 * Checks if incoming `mixed` is actually of type `object`, if so return true
	 * if object is not empty.
	 */
	function isObject(mixed) {
		var res = mixed !== null && typeof mixed == 'object';
		if (res) res = !_.isEmpty(mixed);
		return res;
	}

	/**
	 * @function isArray(mixed)
	 * @helper
	 * @param mixed
	 * Checks if incoming `mixed` is actually of type `array`, if so return true
	 * if array is not empty.
	 */
	function isArray(mixed) {
		return mixed instanceof Array && mixed.length > 0;
	}





	var _resources = {};

	// ---

	var resourceCreate = function(name) {
		return new Resource(name);
	};
	var resourceGet = function(name) {

		function getIt(name) {

			if (name) {
				return _resources[name];
			} else {
				var obj = {};
				_.each(_resources, function(value, key) {
					if (obj[key]) {
						obj[key] = _resources[key]
					}
				});
				return obj;
			}

		}

		if (isArray(name)) {

			// If namespace is of type array loop through array, call `getIt()`
			// with `debug` param and collects returns.
			var obj = {};
			_.each(name, function(value, key) {
				obj[value] = getIt(value, debug);
			});
			return obj;

		} else {
			return getIt(name, debug);
		}
	};

	// ---

	var Resource = function(name) {

		var that = this;

		// Field name that has to be unique, might be useful to find docs you don't
		// know the `_id` of.
		this._id = null;

		// View name for later reference, will also be the object key this resource
		// will be stored in `_resource` cache object
		this._name = name;

		// Default `db` config, all settings can be overwritten using shortcut
		// methods `.db()`.
		this._db = {

			name       : 'test', // db name
			path       : 'mongodb://localhost', // db path
			schema     : 'test', // db schema
			schemaPath : __dirname + '/schemas'  // db schemaPath

		};

		// Default `route` config, all settings can be overwritten using shortcut
		// methods `.at()`.
		this._route = {

			base : '',
			path : '/test'

		};

		this._model = {};

		// Set to name of parent resource if resource is nested within parent one,
		// parent `resource's` name can be set via `.in()` shortcut.
		this._embed = null;

		// ---

		this._entrypoint = '';

		// ---

		this._callback = null;

		// ---

		function onSuccess(origin, res, status, data) {

			if (that._callback) return that._callback(null, {

				origin : origin,
				res    : res,
				status : status,
				data   : data

			});

			res.contentType('application/json');
			res.send(data, status);

		}
		function onError(origin, res, status, error) {

			if (that._callback) return that._callback(error, {

				origin : origin,
				res    : res,
				status : status

			});

			res.contentType('application/json');
			res.send(error, status);

		}

		// ---

		function parseId(id, key) {

			// objectId
			if (id.length === 24) return {
				_id : id
			};

			// ex: users/12345
			// ex: users/klaus,18,Berlin
			// key might come in as normal key representing
			// a field name of document, it might also be
			// a comma separated list of field names (if so,
			// query must contain all fields in cortrect
			// order).

			// no objectId
			// no key
			// no query possible
			// no result
			if (!key) return null;

			var arrId
				, arrKey;

			arrId = id.split(',');
			arrKey = key.split(',');

			// id value represents fields' values
			// therefore length must be the same,
			// otherwise no result
			if (arrId.length !== arrKey.length) return null;

			// create query from incoming values
			// and field names.
			var query = {};
			_.each(arrKey, function(value, i) {
				query[value] = arrId[i];
			});

			return query;

		}

		// ---

		/**
		 *
		 * GET     /resource           ->  index
		 * GET     /resource/new       ->  new (fresh)
		 * POST    /resource           ->  create
		 * GET     /resource/:id       ->  show
		 * GET     /resource/:id/edit  ->  edit
		 * PUT     /resource/:id       ->  update
		 * DELETE  /resource/:id       ->  destroy
		 *
		 **/

		// ---

		/*
		this._load = function(id, callback) {

			var query = parseId(id, this._id);

			that._model.findOne(query, function(err, doc) {

				if (err) return callback(err);

				callback(null, doc);

			});

		};
		*/

		// ~/resource
		// GET
		this._index = function(req, res) {

			that._model.find(function(err, doc) {

				if (err) return onError('index', res, 400, err);
				onSuccess('index', res, 200, doc);

			});

		};

		// ---

		// ~/resource/:id
		// GET
		this._show = function(req, res) {

			var id
				, query;

			// ---

			id = req.params[that._db.schema];

			// parse `id` to provide queries
			query = parseId(id, that._id);

			// ---

			that._model.findOne(query, function(err, doc) {

				if (err) return onError('show', res, 400, err);
				onSuccess('show', res, 200, doc);

			});

		};

		// ~/resource
		// POST
		this._create = function(req, res) {

			var data = req.body;

			// if `_id` is set check for doc with `_id` first
			// to avoid duplicates.
			// TODO: remove redundancy
			if (that._id && data[that._id]) {

				var query = {};
				query[that._id] = data[that._id];

				that._model.findOne(query, function(err, doc) {

					if (err) return onError('unique', res, 400, err);
					if (doc) return onSuccess('unique', res, 200, doc);

					new that._model(data).save(function(err, doc) {

						if (req[that._embed]) {
							req[that._embed][that._db.schema + 's']
								.push(doc._id);
							req[that._embed].save();
						}

						if (err) return onError('create', res, 400, err);
						onSuccess('create', res, 201, doc);

					});

				});

			} else {

				new that._model(data).save(function(err, doc) {

					if (req[that._embed]) {
						req[that._embed][that._db.schema + 's']
							.push(doc._id);
						req[that._embed].save();
					}

					if (err) return onError('create', res, 400, err);
					onSuccess('create', res, 201, doc);

				});

			}

		};

		// ~/resource/:id
		// PUT
		this._update = function(req, res) {

			var id = req.params[that._db.schema]
				, data = req.body;

			that._model.findOne({

				_id : id

			}, function(err, doc) {

				_.extend(doc, data);

				doc.save(function(err, doc) {

					if (err) return onError('update', res, 400, err);
					onSuccess('update', res, 200, doc); // 204?

				});

			});

		};

		// ~/resource/:id
		// DELETE
		this._destroy = function(req, res) {

			var id = req.params[that._db.schema];

			that._model.remove({

				_id : id

			}, function(err, doc) {

				if (req[that._embed]) {

					// find index of removed child id
					var pos = _.indexOf(req[that._embed][that._db.schema + 's'], id);

					// remove index
					req[that._embed][that._db.schema + 's'].splice(pos, 1);

					// save updated doc
					req[that._embed].save();

				}

				if (err) return onError('destroy', res, 400, err);
				onSuccess('destroy', res, 204, null); // 204?

			});

		};

		// ---

		// Save pre-build resource data in cache object for later reference.
		_resources[this._name] = this;

		return this;

	};

	// ---

	Resource.prototype.end = function(callback) {

		var db
			, schema
			, schemaPath;

		// create model
		db = mongoose.createConnection(this._db.path + '/' + this._db.name);
		schema = this._db.schema;
		schemaPath = this._db.schemaPath;
		this._model = db.model(schema, require(schemaPath + '/schema.' + schema + '.js').schema[schema]);

		// ---

		this._entrypoint = '';
		this._entrypoint += this._route.base || '';
		this._entrypoint += this._route.path || this._db.schema;

		// ---

		if (callback) this._callback = callback;

		// ---

		_resources[this._name] = app.resource(this._entrypoint, {

			load    : this._load,
			index   : this._index,
			show    : this._show,
			create  : this._create,
			update  : this._update,
			destroy : this._destroy

		});

		// ---

		return _resources[this._name];

	};

	// ---

	Resource.prototype.at = function(mixed, value) {

		var that = this;

		if (isArray(mixed)) {
			_.each(mixed, function(value) {
				that.at(value);
			});
			return this;
		}

		if (isObject(mixed)) {
			_.each(mixed, function(value, key) {
				that.at(key, value);
			});
			return this;
		}

		that._route[mixed] = (!value)
			? null
			: value;

		return this;

	};
	Resource.prototype.db = function(mixed, value) {

		var that = this;

		if (isArray(mixed)) {
			_.each(mixed, function(value) {
				that.db(value);
			});
			return this;
		}

		if (isObject(mixed)) {
			_.each(mixed, function(value, key) {
				that.db(key, value);
			});
			return this;
		}

		that._db[mixed] = (!value)
			? null
			: value;

		return this;

	};
	Resource.prototype.id = function(unique) {

		this._id = unique || null;
		return this;

	};
	Resource.prototype.in = function(resource) {

		this._embed = resource || null;
		return this;

	};





	var _connections = {};

	// ---

	var connectionCreate = function(name) {
		return new Connection(name);
	};

	// ---

	var Connection = function(name) {

		var that = this;

		// Connection name for later reference, will also be the object key this connection,
		// will be stored in `_connections` cache object
		this._name = name;


		// Connections pseudo path (REST-Path without IDs), ex: /users/friends
		this._paths = [];

		// Save pre-build connection data in cache object for later reference.
		_connections[this._name] = this;

		return this;

	};

	// ---

	Connection.prototype.end = function() {

		var arr
			, next;

		_.each(this._paths, function(value, key) {

			arr = value.split('/');

			// collect resources in array
			// keep order of incoming path str
			_.each(arr, function(value1, key1) {

				if (value1 && value1 !== '' && _resources[value1]) {

					next = (arr[key1 + 1])
						? arr[key1 + 1]
						: null;

					// loop through arr of resource names and `add` next resource
					// to the one before to build nested structure
					if (next) {
						_resources[value1].add(_resources[next]);
					}

				}

			});

		});

		return _connections[this._name];

	};

	// ---

	Connection.prototype.set = function(mixed) {

		var that = this;

		if (isArray(mixed)) {
			_.each(mixed, function(value) {
				that.set(value);
			});
			return this;
		}

		that._paths.push(mixed);

		return this;

	};





	return {

		version : version,

		// ---

		resources : {
			get : resourceGet
		},
		Resource  : {
			create : resourceCreate
		},

		// ---

		Connection : {
			create : connectionCreate
		}

	};

};