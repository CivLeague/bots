const util = require('/home/codenaugh/bots/util/util');
const MongoClient = require('mongodb').MongoClient;

process.on("uncaughtException", (err) => {
  console.log(err);
});

var _cli
var _stats;

var _ffa;
var _pbc;
var _team;
var _coll;
var _civs;
var _bcivs;
var _tcivs;
var _tbcivs;
var _pcivs;
var _players;
var _subs;

var _susp;
var _bandue
var _suspdue
var _unsuspdue

module.exports = {
    connect: function ( bot ) {
        const url = 'mongodb://' + bot + ':' + util.getToken('mongo') + '@localhost:27017/';
        MongoClient.connect(url, { useNewUrlParser: true, poolSize: 10, useUnifiedTopology: true }, function (err, client) {
            if ( err ) {
                console.log( err )
                return
            }
            _cli       = client;
            _stats     = _cli.db('stats');
            _ffa       = _stats.collection('ffa');
            _pbc       = _stats.collection('pbc');
            _team      = _stats.collection('team');
            _coll      = _stats.collection('ffa'); //set default collection
            _civs      = _cli.db('civs').collection('ffa');
            _bcivs     = _cli.db('civs').collection('bbg');
            _tcivs     = _cli.db('civs').collection('team');
            _tbcivs    = _cli.db('civs').collection('team_bbg');
            _pcivs     = _cli.db('civs').collection('prince_plus');
            _players   = _cli.db('players').collection('players');
            _subs      = _cli.db('subs').collection('subs');
            _susp      = _cli.db('players').collection('suspensions');
            _bandue    = _cli.db('players').collection('bans_due');
            _suspdue   = _cli.db('players').collection('suspensions_due');
            _unsuspdue = _cli.db('players').collection('unsuspensions_due');
            console.log('MongoDB ready');
        });
    },

    registerPlayer: async function( discordId, steamId, userName, displayName ) {
        try {
            await _players.updateOne(
                {
                    discord_id:     discordId,
                    steam_id:       steamId,
                    user_name:      userName,
                    display_name:   displayName
                },
                {
                    $currentDate: { lastModified: true },
                },
                { upsert: true }
            );
        } catch (e) {
            console.log(e);
            return false;
        };
        return true;
    },

    getDisplayName: async function ( id ) {
        let player = await _players.findOne({ discord_id: id })
        return player.display_name
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
            rating:     1400,
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
        let ffa = await _ffa.findOne({ _id: discordId });
        let team = await _team.findOne({ _id: discordId });
        let pbc = await _pbc.findOne({ _id: discordId });
        if ( !ffa  && !pbc )  return team.rating;
        if ( !team && !pbc )  return ffa.rating;
        if ( !ffa  && !team ) return pbc.rating;
        if ( ffa && team && !pbc ) {
            if ( ffa.rating > team.rating ) return ffa.rating;
            else return team.rating;
        }
        if ( ffa && !team && pbc ) {
            if ( ffa.rating > pbc.rating ) return ffa.rating;
            else return pbc.rating;
        }
        if ( !ffa && team && pbc ) {
            if ( team.rating > pbc.rating ) return team.rating;
            else return pbc.rating;
        }
        if ( ffa && team && pbc ) {
            if ( team.rating > pbc.rating ) {
                if ( team.rating > ffa.rating ) return team.rating;
                else return ffa.rating;
            }
            else if (pbc.rating > ffa.rating ) return pbc.rating;
            else return ffa.rating;
        }
    },
    
    findByDiscord: async function ( discordId ) {
        return await _players.findOne({ discord_id: discordId });
    },
    
    findBySteam: async function ( steamId ) {
        return await _players.findOne({ steam_id: steamId });
    },
    
    changeDiscord: async function ( steamId, discordId, uname, dname ) {
        let player = await _players.findOne({ steam_id: steamId });
        let names = [];
        if ( player ) {
            if ( player.names )
                newNames = player.names;

            names.push ( { "user_name": uname, "display_name": dname } );
            await _players.updateOne({ steam_id: steamId }, {
                $set: {
                    discord_id: discordId,
                    otherNames: names
                }
            });
            return true;
        }
        return false;
    },
    
    updateCiv: async function ( civ, place, skill, ffa ) {
        let places = [];
        let skills = [];
        let avgP = 0;
        let avgS = 1400;
        let games = 0;
        let civDB = _civs;

        if ( !ffa )
            civDB = _tcivs;

        if ( skill >= 1700 && ffa )
            await this.updatePrinceCiv( civ, place, skill )

        await this.updateBbgCiv( civ, place, skill, ffa );
            
        const c = await civDB.findOne({ name: civ.name });
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
        await civDB.updateOne({ name : civ.name }, {
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

    updatePrinceCiv: async function ( civ, place, skill ) {
        let places = [];
        let skills = [];
        let avgP = 0;
        let avgS = 1400;
        let games = 0;
        let civDB = _pcivs;

        const c = await civDB.findOne({ name: civ.name });
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
        await civDB.updateOne({ name : civ.name }, {
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

    updateBbgCiv: async function ( civ, place, skill, ffa ) {
        let places = [];
        let skills = [];
        let avgP = 0;
        let avgS = 1400;
        let games = 0;
        let civDB = _bcivs;

        if ( !ffa )
            civDB = _tbcivs;

        const c = await civDB.findOne({ name: civ.name });
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
        await civDB.updateOne({ name : civ.name }, {
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

    updatePlayer: async function ( discordId, skill, diff, rd, vol, g, w, l, civs, subIn, subOut, sub ) {
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
            }
        });
        if ( !sub ) {
            await _coll.updateOne({ _id : discordId }, {
                $currentDate: { lastModified: !sub }
            });
        }
    },

    bumpWins: async function ( discordId ) {
        await _coll.updateOne({ _id : discordId }, {
            $inc: {
                first: 1
            },
            $currentDate: { lastModified: true }
        });
    },

    giveReset: async function ( discordId ) {
        await _coll.updateOne({ _id : discordId }, {
            $inc: {
                resets: 1
            }
        });
    },

    resetStats: async function ( discordId ) {
        await _coll.updateOne({ _id : discordId }, {
            $set: {
                rating:     1400,
                lastChange: 0,
                rd:         300,
                vol:        0.06,
                games:      0,
                wins:       0,
                losses:     0,
                first:      0,
                subbedIn:   0,
                subbedOut:  0,
                civs:       [],
                resets:     0
            },
            $currentDate: { lastModified: true }
        });
    },

    changeSkill: async function ( discordId, db, change ) {
        if (db == 'ffa') {
            await _ffa.updateOne({ _id : discordId }, {
                $inc: {
                    rating: change
                },
                $set: {
                    lastChange: change
                },
                $currentDate: { lastModified: true }
            });
        }
        else if (db == 'team') {
            await _team.updateOne({ _id : discordId }, {
                $inc: {
                    rating: change
                },
                $set: {
                    lastChange: change
                },
                $currentDate: { lastModified: true }
            });
        }
        else if (db == 'pbc') {
            await _pbc.updateOne({ _id : discordId }, {
                $inc: {
                    rating: change
                },
                $set: {
                    lastChange: change
                },
                $currentDate: { lastModified: true }
            });
        }
    },

    changeRd: async function ( discordId, db, change ) {
        if (db == 'ffa') {
            await _ffa.updateOne({ _id : discordId }, {
                $inc: {
                    rd: change
                },
                $currentDate: { lastModified: true }
            });
        }
        else if (db == 'team') {
            await _team.updateOne({ _id : discordId }, {
                $inc: {
                    rd: change
                },
                $currentDate: { lastModified: true }
            });
        }
        else if (db == 'pbc') {
            await _pbc.updateOne({ _id : discordId }, {
                $inc: {
                    rd: change
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
                    rating: 1400
                }
            }
            p.name = player[1].displayName;
            result.push(p);
        }
        return result.sort((a, b) => (a.rating < b.rating) ? 1 : -1);
    },

    /*************************************************
    **  LEADERBOARDS
    *************************************************/
    getLeaderboard: async function ( collection ) {
        _coll = _stats.collection(collection);
        if ( collection == 'team' ) {
            let res = await _coll.find({ games: { $gte: 10 } }).toArray();
            return res.sort((p1, p2) => ((p1.wins/p1.games) < (p2.wins/p2.games)) ? 1 : -1); 
            //return await _coll.find({ games: { $gte: 10 } }).sort({ rating: -1 }).toArray();
        }
        else if ( collection == 'ffa' )
            return await _coll.find({ games: { $gte: 5 } }).sort({ rating: -1 }).toArray();
        else
            return await _coll.find().sort({ rating: -1 }).toArray();
    },

    getCivsLeaderboard: async function ( ) {
        return await _civs.find().sort({ avgPlace: 1 }).toArray();
    },

    getBbgCivsLeaderboard: async function ( ) {
        return await _bcivs.find().sort({ avgPlace: 1 }).toArray();
    },

    getTeamCivsLeaderboard: async function ( ) {
        return await _tcivs.find().sort({ avgPlace: 1 }).toArray();
    },

    getTeamCivsBBGLeaderboard: async function ( ) {
        return await _tbcivs.find().sort({ avgPlace: 1 }).toArray();
    },

    getCivsPrinceLeaderboard: async function ( ) {
        return await _pcivs.find().sort({ avgPlace: 1 }).toArray();
    },

    /*************************************************
    **  SUBS
    *************************************************/
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
    },

    /*************************************************
    **  BAN BOT
    *************************************************/
    checkSuspensions: async function () {
        let unsuspended = []
        let players = await _susp.find().toArray()

        for ( let player of players ) {
            let update = false

            if ( player.suspended ) {
                if ( new Date() > new Date( player.ends ) ) {
                    player.suspended = false
                    player.ends = null
                    update = true
                    unsuspended.push( player )
                }
            }

            let quitTier = player.quit ? player.quit.tier : 0
            let quitDecays = null
            if ( player.quit && player.quit.tier && player.quit.decays ) {
                if ( new Date() > new Date( player.quit.decays ) && quitTier > 0 ) {
                    quitTier-- 
                    quitDecays = new Date()
                    quitDecays.setDate( quitDecays.getDate() + 90 )
                    update = true
                }
                else
                    quitDecays = player.quit.decays
            }

            let minorTier = player.minor ? player.minor.tier : 0
            let minorDecays = null
            if ( player.minor && player.minor.tier && player.minor.decays ) {
                if ( new Date() > new Date( player.minor.decays ) && minorTier > 0 ) {
                    minorTier-- 
                    minorDecays = new Date()
                    //minorDecays.setDate( minorDecays.getDate() + 30 )
                    minorDecays.setMinutes( minorDecays.getMinutes() + 5 ) //blah
                    update = true
                }
                else
                    minorDecays = player.minor.decays
            }

            let moderateTier = player.moderate ? player.moderate.tier : 0
            let moderateDecays = null
            if ( player.moderate && player.moderate.tier && player.moderate.decays ) {
                if ( new Date () > new Date( player.moderate.decays ) && moderateTier > 0 ) {
                    moderateTier-- 
                    moderateDecays = new Date()
                    moderateDecays.setDate( moderateDecays.getDate() + 60 )
                    update = true
                }
                else
                    moderateDecays = player.moderate.decays
            }

            let majorTier = player.major ? player.major.tier : 0
            let majorDecays = null
            if ( player.major && player.major.tier && player.major.decays ) {
                if ( new Date() > new Date( player.major.decays ) && majorTier > 0 ) {
                    majorTier-- 
                    majorDecays = new Date()
                    majorDecays.setDate( majorDecays.getDate() + 90 )
                    update = true
                }
                else
                    majorDecays = player.major.decays
            }

            let extremeTier = player.extreme ? player.extreme.tier : 0
            let extremeDecays = null
            if ( player.extreme && player.extreme.tier && player.extreme.decays ) {
                if ( new Date() > new Date( player.extreme.decays ) && extremeTier > 0 ) {
                    extremeTier-- 
                    extremeDecays = new Date()
                    extremeDecays.setDate( extremeDecays.getDate() + 90 )
                    update = true
                }
                else
                extremeDecays = player.extreme.decays
            }

            if ( update ) {
                _susp.updateOne(
                    { _id: player._id },
                    {
                        $set: {
                            suspended: player.suspended,
                            ends: player.ends,
                            "quit.tier": quitTier,
                            "quit.decays": quitDecays,
                            "minor.tier": minorTier,
                            "minor.decays": minorDecays,
                            "moderate.tier": moderateTier,
                            "moderate.decays": moderateDecays,
                            "major.tier": majorTier,
                            "major.decays": majorDecays,
                            "extreme.tier": extremeTier,
                            "extreme.decays": extremeDecays
                        }
                    }
                )
            }
        }
        return unsuspended
    },

    quit: async function ( memberId ) {
        let member = await _susp.findOne({ _id: memberId })
        let tier = member && member.quit ? member.quit.tier : 0
        if ( tier < 0 ) tier = 0
        tier++

        let ends = member && member.ends && member.ends > new Date() ? new Date( member.ends ) : new Date()
        let decays = new Date()
        decays.setDate( decays.getDate() + 90 )
        if ( tier == 1 )
            ends.setDate( ends.getDate() + 1 )
        else if ( tier == 2 )
            ends.setDate( ends.getDate() + 3 )
        else if ( tier == 3 )
            ends.setDate( ends.getDate() + 7 )
        else if ( tier == 4 )
            ends.setDate( ends.getDate() + 14 )
        else if ( tier == 5 )
            ends.setDate( ends.getDate() + 30 )
        else if ( tier >= 6 )
            ends.setDate( ends.getDate() + 180 )

        _susp.updateOne(
            { _id: memberId },
            {
                $set: {
                    "quit.tier": tier,
                    "quit.decays": decays,
                    suspended: true,
                    ends: ends
                }
            },
            { upsert: true }
        )

        return { tier: tier, ends: ends }
    },

    minor: async function ( memberId ) {
        let member = await _susp.findOne({ _id: memberId })
        let tier = member && member.minor ? member.minor.tier : 0
        if ( tier < 0 ) tier = 0
        tier++

        let ends = member && member.ends && member.ends > new Date() ? new Date( member.ends ) : new Date()
        let decays = new Date()
        decays.setDate( decays.getDate() + 90 )
        //if ( tier == 1 )
            //warning
        if ( tier == 2 )
            ends.setDate( ends.getDate() + 1 )
        else if ( tier == 3 )
            ends.setDate( ends.getDate() + 2 )
        else if ( tier == 4 )
            ends.setDate( ends.getDate() + 3 )
        else if ( tier == 5 )
            ends.setDate( ends.getDate() + 5 )
        else if ( tier >= 6 )
            ends.setDate( ends.getDate() + 7 )

        let suspended = false
        if ( tier > 1 )
            suspended = true
        else if ( member && member.suspended )
            suspended = member.suspended

        _susp.updateOne(
            { _id: memberId },
            {
                $set: {
                    "minor.tier": tier,
                    "minor.decays": decays,
                    suspended: suspended,
                    ends: ends
                }
            },
            { upsert: true }
        )

        return { tier: tier, ends: ends }
    },

    moderate: async function ( memberId ) {
        let member = await _susp.findOne({ _id: memberId })
        let tier = member && member.moderate ? member.moderate.tier : 0
        if ( tier < 0 ) tier = 0
        tier++

        let ends = member && member.ends && member.ends > new Date() ? new Date( member.ends ) : new Date()
        let decays = new Date()
        decays.setDate( decays.getDate() + 90 )
        if ( tier == 1 )
            ends.setDate( ends.getDate() + 1 )
        else if ( tier == 2 )
            ends.setDate( ends.getDate() + 4 )
        else if ( tier == 3 )
            ends.setDate( ends.getDate() + 7 )
        else if ( tier == 4 )
            ends.setDate( ends.getDate() + 14 )
        else if ( tier == 5 )
            ends.setDate( ends.getDate() + 30 )
        else if ( tier >= 6 )
            ends.setDate( ends.getDate() + 180 )

        _susp.updateOne(
            { _id: memberId },
            {
                $set: {
                    "moderate.tier": tier,
                    "moderate.decays": decays,
                    suspended: true,
                    ends: ends
                }
            },
            { upsert: true }
        )

        return { tier: tier, ends: ends }
    },

    major: async function ( memberId ) {
        let member = await _susp.findOne({ _id: memberId })
        let tier = member && member.major ? member.major.tier : 0
        if ( tier < 0 ) tier = 0
        tier++

        let ends = member && member.ends && member.ends > new Date() ? new Date( member.ends ) : new Date()
        let decays = new Date()
        decays.setDate( decays.getDate() + 90 )
        if ( tier == 1 )
            ends.setDate( ends.getDate() + 7 )
        else if ( tier == 2 )
            ends.setDate( ends.getDate() + 14 )
        else if ( tier == 3 )
            ends.setDate( ends.getDate() + 30 )
        else if ( tier >= 4 )
            ends.setDate( ends.getDate() + 180 )

        _susp.updateOne(
            { _id: memberId },
            {
                $set: {
                    "major.tier": tier,
                    "major.decays": decays,
                    suspended: true,
                    ends: ends
                }
            },
            { upsert: true }
        )

        return { tier: tier, ends: ends }
    },

    extreme: async function ( memberId ) {
        let member = await _susp.findOne({ _id: memberId })
        let tier = member && member.major ? member.major.tier : 0
        if ( tier < 0 ) tier = 0
        tier++

        let ends = member && member.ends && member.ends > new Date() ? new Date( member.ends ) : new Date()
        let decays = new Date()
        decays.setDate( decays.getDate() + 1460 )
        if ( tier == 1 )
            ends.setDate( ends.getDate() + 7 )
        else if ( tier == 2 )
            ends.setDate( ends.getDate() + 180 )

        _susp.updateOne(
            { _id: memberId },
            {
                $set: {
                    "extreme.tier": tier,
                    "extreme.decays": decays,
                    suspended: true,
                    ends: ends
                }
            },
            { upsert: true }
        )

        return { tier: tier, ends: ends }
    },

    addDays: async function ( memberId, num ) {
        let member = await _susp.findOne({ _id: memberId })
        let ends = new Date()
        if ( member && member.ends && member.ends > ends )
            ends = new Date( member.ends )
        ends.setDate( ends.getDate() + parseInt( num ) )

        _susp.updateOne(
            { _id: memberId },
            {
                $set: {
                    suspended: true,
                    ends: ends
                }
            },
            { upsert: true }
        )
        return ends
    },

    rmDays: async function ( memberId, num ) {
        let member = await _susp.findOne({ _id: memberId })
        let ends = null
        if ( member && member.ends ) {
            ends = new Date( member.ends )
            ends.setDate( ends.getDate() - parseInt( num ) )

            _susp.updateOne(
                { _id: memberId },
                {
                    $set: {
                        ends: ends
                    }
                }
            )
        }
        return ends
    },

    subSuspension: async function ( memberId ) {
        let member = await _susp.findOne({ _id: memberId })
        let ends = new Date()
        if ( member && member.ends && member.ends > ends )
            ends = new Date( member.ends )
        ends.setDate( ends.getDate() + 3 )

        _susp.updateOne(
            { _id: memberId },
            {
                $set: {
                    suspended: true,
                    ends: ends
                }
            },
            { upsert: true }
        )
        return ends
    },

    smurfSuspension: async function ( memberId ) {
        let member = await _susp.findOne({ _id: memberId })
        let ends = new Date()
        if ( member && member.ends && member.ends > ends )
            ends = new Date( member.ends )
        ends.setDate( ends.getDate() + 30 )

        _susp.updateOne(
            { _id: memberId },
            {
                $set: {
                    suspended: true,
                    ends: ends
                }
            },
            { upsert: true }
        )
        return ends
    },

    compSuspension: async function ( memberId ) {
        let member = await _susp.findOne({ _id: memberId })
        let ends = new Date()
        if ( member && member.ends && member.ends > ends )
            ends = new Date( member.ends )
        ends.setDate( ends.getDate() + 7 )

        _susp.updateOne(
            { _id: memberId },
            {
                $set: {
                    suspended: true,
                    ends: ends
                }
            },
            { upsert: true }
        )
        return ends
    },

    unsuspend: async function ( memberId ) {
        _susp.updateOne(
            { _id: memberId },
            {
                $set: {
                    suspended: false,
                    ends: null
                }
            }
        )
    },

    unsuspendDue: async function ( memberId ) {
        try {
            await _unsuspdue.insertOne({ _id: memberId })
        } catch ( err ) {}
    },

    banDue: async function ( memberId ) {
        try {
            await _bandue.insertOne({ _id: memberId })
        } catch ( err ) {}
    },

    suspensionDue: async function ( memberId ) {
        try {
            await _suspdue.insertOne({ _id: memberId })
        } catch ( err ) {}
    },

    isSuspensionDue: async function ( memberId ) {
        let result = await _suspdue.deleteOne({ _id: memberId })
        return ( result.deletedCount )
    },

    isBanDue: async function ( memberId ) {
        let result = await _bandue.deleteOne({ _id: memberId })
        return ( result.deletedCount )
    },

    isUnsuspendDue: async function ( memberId ) {
        let result = await _unsuspdue.deleteOne({ _id: memberId })
        return ( result.deletedCount )
    },

    rmTier: async function ( memberId, category ) {
        if ( category == 'quit' ) {
            let member = await _susp.findOne({ _id: memberId } )
            if ( member.quit.tier < 1 ) return -1
            await _susp.updateOne({ _id: memberId }, { $inc: { "quit.tier": -1 }} )
            let result =  await _susp.findOne({ _id: memberId })
            return result.quit.tier
        }
        else if ( category == 'minor' ) {
            let member = await _susp.findOne({ _id: memberId } )
            if ( member.minor.tier < 1 ) return -1
            await _susp.updateOne({ _id: memberId }, { $inc: { "minor.tier": -1 }} )
            let result =  await _susp.findOne({ _id: memberId })
            return result.minor.tier
        }
        else if ( category == 'moderate' ) {
            let member = await _susp.findOne({ _id: memberId } )
            if ( member.moderate.tier < 1 ) return -1
            await _susp.updateOne({ _id: memberId }, { $inc: { "moderate.tier": -1 }} )
            let result =  await _susp.findOne({ _id: memberId })
            return result.moderate.tier
        }
        else if ( category == 'major' ) {
            let member = await _susp.findOne({ _id: memberId } )
            if ( member.major.tier < 1 ) return -1
            await _susp.updateOne({ _id: memberId }, { $inc: { "major.tier": -1 }} )
            let result =  await _susp.findOne({ _id: memberId })
            return result.major.tier
        }
        else if ( category == 'extreme' ) {
            let member = await _susp.findOne({ _id: memberId } )
            if ( member.extreme.tier < 1 ) return -1
            await _susp.updateOne({ _id: memberId }, { $inc: { "extreme.tier": -1 }} )
            let result =  await _susp.findOne({ _id: memberId })
            return result.extreme.tier
        }
    },

    isGoodyTwoShoes: async function ( memberId ) {
        let member = await _susp.findOne({ _id: memberId });
    
        if (!member || member === undefined) {
            return true;
        }
        
        let infractionCount = 0;
        // Check each severity level and increment the count if it has a tier greater than 0.
        ['extreme', 'major', 'moderate', 'minor', 'quit'].forEach(severity => {
            if (member[severity] && member[severity].tier > 0) {
                infractionCount++;
            }
        });
        // Return true if the count is 0, indicating no infractions.
        return infractionCount === 0;
    }
}
