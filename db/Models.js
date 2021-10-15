const { Sequelize, DataTypes, Model } = require('sequelize');

const sequelize = new Sequelize('sqlite:./db/snapshotsdb.db');

class Snapshot extends Model {}

Snapshot.init({
    Title: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    Text: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    Dictionary: {
        type: DataTypes.JSON,
        allowNull: false
    },
    Wikipedia: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, {sequelize})

module.exports = [Snapshot, sequelize]