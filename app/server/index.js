const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const basename = path.basename(module.filename);

// const env = process.env.NODE_ENV || 'development';
// const config = require(`${__dirname}/config/config.json`)[env]; // eslint-disable-line import/no-dynamic-require

const config = require('./config/config');

const db = {};

const sequelize = new Sequelize(config.dbName, config.username, config.password, {
	host: config.host,
	port: config.port,
	dialect: 'postgres',
});

// if (config.use_env_variable) {
// 	sequelize = new Sequelize(process.env[config.use_env_variable]);
// }

fs
	.readdirSync(__dirname)
	.filter(file => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'))
	.forEach((file) => {
		const model = sequelize.import(path.join(__dirname, file));
		db[model.name] = model;
	});

Object.keys(db).forEach((modelName) => {
	if (db[modelName].associate) {
		db[modelName].associate(db);
	}
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
