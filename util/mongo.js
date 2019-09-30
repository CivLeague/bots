const util = require('./util');
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://cplbot:' + util.getToken('mongo') + '@localhost:27017/';

process.on("uncaughtException", (err) => {
  console.log(err);
});

var _cli
var _db;
//var _stats;
var _coll;
var _subs;
var _civs;
var _players;

module.exports = {
    connectToMongo: function () {
        MongoClient.connect(url, { useNewUrlParser: true, poolSize: 10 }, function (err, client) {
            _cli  = client;
            _db   = _cli.db('test_db');
            //_stats   = _cli.db('stats');
            _coll = _db.collection('ffa'); //set default db
            //_coll = _stats.collection('main'); //set default collection
            _subs = _db.collection('subs');
            //_subs = _cli.db('subs');
            _civs    = _cli.db('civs').collection('civs');
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

    //getStatsDb: function() {
    getDb: function() {
        return _db;
        //return _stats;
    },

    //useStatsColl: function( c ) {
    useDb: function( c ) {
        _coll = _db.collection(c);
        //_coll = _stats.collection(c);
    },
    
    createPlayer: async function ( discordId ) {
        await _coll.insertOne({
            _id:        discordId,
            rating:     1500,
            rd:         300,
            vol:        0.06,
            tau:        0.6,
            lastChange: 0,
            games:      0,
            wins:       0,
            losses:     0,
            resets:     1
        });
    },

    getPlayer: async function ( discordId ) {
        return await _coll.findOne({ _id: discordId });
    },
    
    findDiscord: async function ( discordId ) {
        return await _players.collection('members').findOne({ discord_id: discordId });
    },
    
    findSteam: async function ( steamId ) {
        return await _players.collection('members').findOne({ steam_id: steamId });
    },
    
    updateCiv: async function ( civ, place, skill ) {
        let places = [];
        let skills = [];
        let avgP = 0;
        let avgS = 1500;
        let games = 0;

        const c = await _civs.findOne({ name: civ.name });
        if ( !c ) {
            places = [ place ];
            skills = [ skill ];
            avgP = place;
            avgS = skill;
            games = 1;
        }
        else {
            places = c.places;
            skills = c.skills;
            places.push(place);
            skills.push(skill);

            let totalP = 0;
            for(let i = 0; i < places.length; i++) {
                totalP += places[i];
            }
            avgP = totalP / places.length;

            let totalS = 0;
            for(let j = 0; j < skills.length; j++) {
                totalS += skills[j];
            }
            avgS = totalS / skills.length;

            games = c.games + 1;
        }
        await _civs.updateOne({ name : civ.name }, {
            $set: {
                avgPlace: avgP,
                avgSkill: avgS,
                places: places,
                skills: skills,
                games: games
            }
        },
        { upsert: true });
    },

    updatePlayer: async function ( discordId, skill, diff, rd, vol, g, w, l, civs ) {
        await _coll.updateOne({ _id : discordId }, {
            $set: {
                rating: skill,
                lastChange: diff,
                rd:  rd,
                vol: vol,
                games: g,
                wins: w,
                losses: l,
                civs: civs
            },
            $currentDate: { lastModified: true }
        });
    },

    resetStats: async function ( discordId ) {
        await _coll.updateOne({ _id : discordId }, {
            $set: {
                rating:     1500,
                lastChange: 0,
                rd:         300,
                vol:        0.06,
                games:      0,
                wins:       0,
                losses:     0,
                resets:     0
            },
            $currentDate: { lastModified: true }
        });
    },

    setSkill: async function ( discordId, skill ) {
        await _coll.updateOne({ _id : discordId }, {
            $set: {
                rating: skill
            },
            $currentDate: { lastModified: true }
        });
    },

    getLeaderboard: async function ( collection ) {
        //_coll = _stats.collection(collection);
        _coll = _db.collection(collection);
        return await _coll.find().sort({ rating: -1 }).toArray();
    },

    getSubs: async function () {
        return _subs.find().sort({ count: -1 }).toArray();
        //return _subs.collection.find().sort({ count: -1 }).toArray();
    },

    resetSubs: async function () {
        _subs.drop();
        //_subs.collection.drop();
    },

    getSubCount: async function ( subId ) {
        return _subs.findOne({ _id: subId });
        //return _subs.collection.findOne({ _id: subId });
    },

    setSubCount: async function ( subId, num ) {
        _subs.updateOne(
            { _id: subId },
            { $set: { count: num } }, 
            { upsert: true }
        );
        /*
        _subs.collection.updateOne(
            { _id: subId },
            { $set: { count: num } }, 
            { upsert: true }
        );
        */
    }
}
