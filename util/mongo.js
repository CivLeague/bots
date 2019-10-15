const util = require('./util');
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://cplbot:' + util.getToken('mongo') + '@localhost:27017/';

process.on("uncaughtException", (err) => {
  console.log(err);
});

var _cli
var _stats;

var _main;
var _team;
var _coll;
var _civs;
var _players;
var _subs;

module.exports = {
    connectToMongo: function () {
        MongoClient.connect(url, { useNewUrlParser: true, poolSize: 10 }, function (err, client) {
            _cli     = client;
            _stats   = _cli.db('stats');
            _main    = _stats.collection('main');
            _team    = _stats.collection('team');
            _coll    = _stats.collection('main'); //set default collection
            _civs    = _cli.db('civs').collection('civs');
            _players = _cli.db('players').collection('players');
            _subs    = _cli.db('subs').collection('subs');
            console.log('mongo listening');
        });
    },

    registerPlayer: async function( discordId, steamId, userName, displayName ) {
        try {
            await _players.insertOne({
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

    getStatsDb: function() {
        return _stats;
    },

    useStatsColl: function( c ) {
        _coll = _stats.collection(c);
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
            subbedIn:   0,
            subbedOut:  0,
            resets:     1
        });
    },

    getPlayer: async function ( discordId ) {
        return await _coll.findOne({ _id: discordId });
    },
    
    getHighScore: async function ( discordId ) {
        let main = await _main.findOne({ _id: discordId });
        let team = await _team.findOne({ _id: discordId });
        if ( !main ) return team.rating;
        if ( !team ) return main.rating;
        if ( main.rating > team.rating ) return main.rating;
        else return team.rating;
    },
    
    findByDiscord: async function ( discordId ) {
        return await _players.findOne({ discord_id: discordId });
    },
    
    findBySteam: async function ( steamId ) {
        return await _players.findOne({ steam_id: steamId });
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

    updatePlayer: async function ( discordId, skill, diff, rd, vol, g, w, l, civs, subIn, subOut ) {
        await _coll.updateOne({ _id : discordId }, {
            $set: {
                rating:     skill,
                lastChange: diff,
                rd:         rd,
                vol:        vol,
                games:      g,
                wins:       w,
                losses:     l,
                civs:       civs,
                subbedIn:   subIn,
                subbedOut:  subOut
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

    changeSkill: async function ( discordId, db, change ) {
        if (db == 'main') {
            await _main.updateOne({ _id : discordId }, {
                $inc: {
                    rating: change
                },
                $currentDate: { lastModified: true }
            });
        }
        else if (db == 'team') {
            await _team.updateOne({ _id : discordId }, {
                $inc: {
                    rating: change
                },
                $currentDate: { lastModified: true }
            });
        }
    },

    getRatings: async function ( players ) {
        let result = [];
        for ( player of players ) {
            let p = await _coll.findOne({ _id: player[1].id });
            if (!p) {
                p = {
                    _id: player[1].id,
                    rating: 1500
                }
            }
            p.name = player[1].displayName;
            result.push(p);
        }
        return result.sort((a, b) => (a.rating < b.rating) ? 1 : -1);
    },

    getLeaderboard: async function ( collection ) {
        _coll = _stats.collection(collection);
        return await _coll.find().sort({ rating: -1 }).toArray();
    },

    getCivsLeaderboard: async function ( ) {
        return await _civs.find().sort({ avgPlace: 1 }).toArray();
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
