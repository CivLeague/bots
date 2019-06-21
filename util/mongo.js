const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://cplbot:brokenarrow@localhost:27017/test_db';

process.on("uncaughtException", (err) => {
  console.log("mongoUtil " +  err);
});

var _cli
var _db;
var _coll;
var _subs;

module.exports = {
    connectToMongo: function () {
        MongoClient.connect(url, { useNewUrlParser: true, poolSize: 10 }, function (err, client) {
            _cli  = client;
            _db   = _cli.db('test_db');
            _coll = _db.collection('overall');
            _subs = _db.collection('subs');
            console.log('mongo listening');
        });
    },

    getDb: function() {
        return _db;
    },

    useDb: function( c ) {
        _coll = _db.collection(c);
    },
    
    createPlayer: async function ( discordId, steamId ) {
        _coll.insertOne({
            _id:        discordId,
            steam_id:   steamId,
            rating:     1500,
            rd:         300,
            vol:        0.06,
            tau:        0.6,
            lastChange: 0,
            games:      0,
            wins:       0,
            losses:     0
        });
    },

    getPlayer: async function ( playerId ) {
        return _coll.findOne({ _id: playerId });
    },
    
    updatePlayer: async function(playerId, skill, diff, rd, vol) {
        _coll.updateOne({ _id : playerId }, {
            $set: {
                rating: skill,
                lastChange: diff,
                rd:  rd,
                vol: vol
            },
            $currentDate: { lastModified: true }
        });
    },

    getLeaderboard: async function ( collection ) {
        _coll = _db.collection(collection);
        return _coll.find().sort({ rating: -1 }).toArray();
    },

    getSubs: async function () {
        return _subs.find().sort({ count: -1 }).toArray();
    },

    resetSubs: async function () {
        _subs.drop();
    },

    getSubCount: async function ( subId ) {
        return _subs.findOne({ _id: subId });
    },

    setSubCount: async function ( subId, num ) {
        _subs.updateOne(
            { _id: subId },
            { $set: { count: num } }, 
            { upsert: true }
        );
    }
}
