const util = require('./util');
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://cplbot:' + util.getToken('mongo') + '@localhost:27017/';

process.on("uncaughtException", (err) => {
  console.log(err);
});

var _cli
var _db;
var _coll;
var _subs;
var _players;

module.exports = {
    connectToMongo: function () {
        MongoClient.connect(url, { useNewUrlParser: true, poolSize: 10 }, function (err, client) {
            _cli  = client;
            _db   = _cli.db('test_db');
            _coll = _db.collection('overall');
            _subs = _db.collection('subs');
            _players = _cli.db('players');
            console.log('mongo listening');
        });
    },

    registerPlayer: async function( discordId, steamId, userName, displayName ) {
        try {
            await _players.collection('members').insertOne({
                discord_id:     discordId,
                steam_id:       steamId,
                user_name:      userName,
                display_name:   displayName
            });
        } catch (e) {
            console.log(e);
            return false;
        };
        return true;
    },

    getDb: function() {
        return _db;
    },

    useDb: function( c ) {
        _coll = _db.collection(c);
    },
    
    createPlayer: async function ( discordId, steamId ) {
        await _coll.insertOne({
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
        return await _coll.findOne({ _id: playerId });
    },
    
    updatePlayer: async function(playerId, skill, diff, rd, vol, g, w, l) {
        await _coll.updateOne({ _id : playerId }, {
            $set: {
                rating: skill,
                lastChange: diff,
                rd:  rd,
                vol: vol,
                games: g,
                wins: w,
                losses: l
            },
            $currentDate: { lastModified: true }
        });
    },

    getLeaderboard: async function ( collection ) {
        _coll = _db.collection(collection);
        return await _coll.find().sort({ rating: -1 }).toArray();
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
