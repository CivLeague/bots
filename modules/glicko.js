const util         = require('/home/codenaugh/bots/util/util');
const mongo        = require('/home/codenaugh/bots/util/mongo');
const errorHandler = require('/home/codenaugh/bots/util/errormessage');
const leaderboard  = require('/home/codenaugh/bots/modules/leaderboard');

const fs = require("fs");

const moderatorId  = '291753249361625089';
const botId        = '293018308402348033';

const novice       = '577702305999093763';
const deity        = '628461624524800000';
const immortal     = '628464081346625536';
const emperor      = '628464280118755351';
const king         = '628464338985943040';
const prince       = '628464428593184778';
const warlord      = '628464457491939339';
const chieftain    = '628464491129995264';
const settler      = '628464552882995200';
const difficulties = [settler, chieftain, warlord, prince, king, emperor, immortal, deity];

const glicko2 = require('glicko2');
const settings = {
    rating:   1400,
    rd:       300,
    vol:      0.06,
    tau:      0.6
};
const glicko = new glicko2.Glicko2(settings);


function GetSubLog()            { return util.getChannel(371831587001729036); }
function GetGlickoHistory()     { return util.getChannel(569705866224467988); }
function GetGlickoDebug()       { return util.getChannel(582241310220746762); }
function GetReportsProcessed()  { return util.getChannel(484882448115564584); }
function GetRankedReporting()   { return util.getChannel(413532530268962816); }

// SubType: 1 (SUBBING player)
// SubType: 2 (LEAVING player)

class ReportBotModule {
	constructor() {
		util.client.on('messageReactionAdd', (reaction, user) =>
		{
			if (reaction.message.channel != GetRankedReporting()) return;

			const isModerator = GetSubLog().guild.member(user).roles.has(moderatorId);
			const isBot       = GetSubLog().guild.member(user).roles.has(botId);
			const isCheckEmoji  = reaction.emoji.id == null && reaction.emoji.name == '🇨';
			const isReportEmoji = reaction.emoji.id == null && reaction.emoji.name == '🇷';
			const isProcessEmoji = reaction.emoji.id == null && reaction.emoji.name == '🇵';
            let reactions = reaction.message.reactions;

			if ( isCheckEmoji || (isModerator && isReportEmoji) || (isModerator && isProcessEmoji) )
			{
                /*if ( isModerator && isReportEmoji ) {
                    for (let r of reactions) {
                        if ( r[1].emoji.name == '🛑'  || r[1].emoji.name == '❌' || r[1].emoji.name == '⛔'  || r[1].emoji.name == '🚫') {
                            reaction.message.channel.send(user + ' this report should not be processed until the issue related to it is resolved').then ( m => {
                                m.delete(20000);
                            });
                            return;
                        }
                    }
                }*/
				let pm = new ParseMessage(reaction.message, user);
                if ( pm.abort == false )
				    pm.parseGameReport(isCheckEmoji);
			}
            else if ( !isModerator && !isBot && !isCheckEmoji ) {
                reaction.remove( user );
                return;
            }
		});

        util.client.on('message', ( msg ) => {
            if ( msg.channel != GetRankedReporting() || msg.author.bot ) return;

            let content = msg.content;
            if ( content.toLowerCase().includes( 'host' ) && content.toLowerCase().includes( 'type' ) ) {
                msg.react('🇨');
            }
        });
	}
}

class ParseMessage
{
	constructor(message, user)
	{
        this.abort = false;
		this.message = message;
		this.user = user;

		this.host = null;
		this.type = null;
		
		this.error = errorHandler.create(user);

		//console.log('[mentions]' + message.mentions.members.size + '[msg]' + message.content);
		const lines = message.content.toLowerCase().split('\n');
		
		this.positions = [];
		
		for(const line of lines)
		{
			// @Moderator mention
			if(line.includes('<@&291753249361625089>')) continue;
            if(line === '') continue;
			
			if(line.includes('type'))
			{
				if(this.type != null)
				{
					this.error.add('\nTwo game types specified. only one possible');
				}
				else
				{
					if ( !this.assignType(line) )
                        this.error.add('\nInvalid game type... [allowed] ffa, duel, pbc, team');
				}
                continue;
			}
			
			// regxp is also used later down where cleanstr is, not just for getMatches
			const regxp = /<@!?(\d+)>/g;
			const matches = getMatches(regxp, line);
			
            if ( matches.length == 0 ) {
                this.error.add('\nNo player found on line:\n' + line);
                this.abort = true;
            }
			else
			{
				const groupMatch = matches[0][1];
				//for(const m of matches) console.log(m);
				
				if(line.includes('host'))
				{
					if(this.host != null)
					{
						this.error.add('\nTwo hosts specified... Only one allowed');
					}
					else if( message.mentions.users.get(groupMatch) == null )
					{
						// if we dont check for this the code will crash later (!)
						this.error.add('\nSpecified host not part of the reported game');
					}
					else
					{
						this.host = groupMatch;
					}
				}
				else
				{
					// This code is by no means perfect. Would probably be better to allow a-z0-9\s\!\<\>\@ and clean all others ?!
					const line_subs = line.replace(/[^a-z0-9\s\<\>\@]/g, '');
					//console.log('[line_subs] ' + line_subs);
					
					// Try both 'sub for' and 'subbed out'
					let matches_subs = getMatches(/<@(\d+)>[a-z0-9\s]*sub[a-z0-9\s]*for[a-z0-9\s]*<@(\d+)>/g, line_subs);
					if (matches_subs.length == 0)
                        matches_subs = getMatches(/<@(\d+)>[a-z0-9\s]*subbed[a-z0-9\s]*out[a-z0-9\s]*<@(\d+)>/g, line_subs);
					
					if(matches_subs.length != 0)
					{
						/*console.log('----[subs]---');
						console.log(matches_subs);
						console.log('---[matches]--- ' + matches.length);
						console.log(matches);*/
						
						// set Subtypes on all players
						for(var m of matches_subs)
						{
							//console.log(m[1] + ' sub for ' + m[2]);
							for(var n of matches)
							{
								if(n[1] == m[1]) n.subType = 1;
								else if(n[1] == m[2]) n.subType = 2;
							}
						}						
					}
					else
					{
						if(line.includes('sub'))
						{
							/*const clean_subs = line.replace(/^[a-z0-9\s\@\<\>]/g, '');
							console.log('[line] ' + line);
							console.log('[clean] ' + clean_subs);*/
							this.error.add('\nSUB without FOR keyword in [line] ' + line);
						}
					}

					// set subType = 0 on all players that are not subs
					for(let m of matches)
					{
						if(!m.hasOwnProperty('subType')) m.subType = 0;
					}

					
					// remove everything except civs from input line
					const cleanstr = line.replace(regxp, '').replace(/[^a-z\s]/g, '');
					// also replace 'sub' and 'for' ???
					//console.log('[clean]' + cleanstr);

					const civsMatched = checkCivs( cleanstr.split(' '));
                    if ( typeof civsMatched == "string" ) {
                        if (civsMatched == "america" || civsMatched == "teddy" ) {
					    	this.error.add('\n' + civsMatched + ' is too ambiguous on line:\n' + line + '\n\nPlease use `TeddyBM` or `TeddyRR`');
                            this.abort = true;
		                    this.error.send(this.message.channel, 60);
                            return;
                        }
                        else if (civsMatched == "catherine" ) {
					    	this.error.add('\n' + civsMatched + ' is too ambiguous on line:\n' + line + '\n\nPlease use `CatherineBQ` or `CatherineM`');
                            this.abort = true;
		                    this.error.send(this.message.channel, 60);
                            return;
                        }
                        else if (civsMatched == "england") {
					    	this.error.add('\n`England` is too ambiguous on line:\n' + line + '\n\nPlease use `Victoria` or `EleanorE`');
                            this.abort = true;
		                    this.error.send(this.message.channel, 60);
                            return;
                        }
                        else if (civsMatched == "france") {
                            this.error.add('\n`France` is too ambiguous on line:\n' + line + '\n\nPlease use `CatherineM` or `CatherineBQ` or `EleanorF`');
                            this.abort = true;
                            this.error.send(this.message.channel, 60);
                            return;
                        }
                        else if (civsMatched == "eleanor") {
                            this.error.add('\n`Eleanor` is too ambiguous on line:\n' + line + '\n\nPlease use `EleanorE` or `EleanorF`');
                            this.abort = true;
                            this.error.send(this.message.channel, 60);
                            return;
                        }
                        else if (civsMatched == "greece") {
                            this.error.add('\n`Greece` is too ambiguous on line:\n' + line + '\n\nPlease use `Gorgo` or `Pericles`');
                            this.abort = true;
                            this.error.send(this.message.channel, 60);
                            return;
                        }
                        else if (civsMatched == "india") {
                            this.error.add('\n`India` is too ambiguous on line:\n' + line + '\n\nPlease use `Ghandi` or `Chandragupta`');
                            this.abort = true;
                            this.error.send(this.message.channel, 60);
                            return;
                        }
                        else if (civsMatched == "gran") {
                            this.error.add('\nSorry, spaces in a civ confuse me, like in Gran Colombia:\n' + line + '\n\nPlease use `Colombia` or `GranColombia`');
                            this.abort = true;
                            this.error.send(this.message.channel, 60);
                            return;
                        }
                        else if (civsMatched.startsWith("Could")) {
                            this.error.add('\n' + civsMatched + " on line:\n" + line);
                            this.abort = true;
                            this.error.send(this.message.channel, 60);
                            return;
                        }
                    }
					//console.log('[matched]' + checkCivs( cleanstr.split(' ') ) );
                    
					//console.log('[civsMatched]' + civsMatched);
					
					if(civsMatched.length == 0)
					{
						this.error.add('\nNo civ found for [line] ' + line);
                        this.abort = true;
		                this.error.send(this.message.channel, 60);
                        return;
					}
					else if(civsMatched.length != matches.length - matches_subs.length)
					{
						this.error.add('\nInvalid amount of civs [' + civsMatched + '] found for [line] ' + line);
                        this.abort = true;
		                this.error.send(this.message.channel, 60);
                        return;
					}
					else
					{
						//match civs to matches
						var sub_offset = 0;
						for(var i = 0; i < matches.length; ++i)
						{
							if(matches[i].subType == 2) ++sub_offset;							
							matches[i].civ = civsMatched[i - sub_offset];
						}
					}
					
					// Push matches to positions
					this.positions.push(matches);
				}
			}
		}
		
		if(this.host == null)
		{
            this.error.add('\nGame must include a tagged host');
            this.abort = true;
		}
		
		if(this.type == null)
		{
            this.error.add('\nGame must include a type... [allowed] ffa, team, pbc, duel');
            this.abort = true;
		}
				
		// Grab ratings for all players
		this.civCount = 0;
		this.civState = 0; //0=init, 1=null detected, 2=civ detected
		for(var i = 0; i < this.positions.length; ++i)
		{
			for(var m of this.positions[i])
			{
				if(this.civState == 0)
				{
					this.civState = m.civ == null ? 1 : 2;
				}
				else if((this.civState == 1 && m.civ != null) || (this.civState == 2 && m.civ == null))
				{
					this.error.add('\nError with player <@' + m[1] + '> :: a game can either have no civs or all players must have a reported civ');
                    this.abort = true;
				}
				
				++this.civCount;
			}
		}

		if(this.type == 3 && this.civCount != 2)
		{
			this.error.add('\nDuels can only score 2 players, not ' + this.civCount);
            this.abort = true;
		}

        if ( this.abort == true )
		    this.error.send(this.message.channel, 60);
	}

    async setSubPoints(pos, subId, debug) {
		let glickoPositions = [];
        let player = null;
        for(let i = 0; i < pos.length; ++i) {
            let pp = [];
            for(let m of pos[i])
            {
                //glicko2
                var p = await mongo.getPlayer( m[1] );
                if (p)
                    player = glicko.makePlayer(p.rating, p.rd, p.vol)
                else
                    player = glicko.makePlayer();
                player.oldRating = player.getRating();
                player.subType = m.subType;
                player.civ = m.civ;
                player.dId = m[1];
                if (m.subType != 2) {
                    pp.push(player);
                }
            }
            glickoPositions.push(pp);
        }
        const game = glicko.makeRace(glickoPositions);
        glicko.updateRatings(game);

        if (debug)
            console.log("[CHECK_MODE]");
        else
            console.log("[COMMIT_MODE]");

        for (let i = 0; i < glickoPositions.length; i++) {
            for (let j = 0; j < glickoPositions[i].length; j++) {
                let pStats = glickoPositions[i][j];
                if ( pStats.dId == subId ) {
                    var diff = Math.round(pStats.getRating()) - Math.round(pStats.oldRating);
                    if ( diff < 5 ) {
                        diff = 5;
                        pStats.setRating(pStats.oldRating + diff);
                    }
			        for (var k = 0; k < this.positions.length; ++k) {
				        for(var m of this.positions[k]) {
                            if (m[1] == pStats.dId) {
                                m.diff = diff;
                            }
                        }
                    }

                    console.log( "SUB ID: " + pStats.dId );
                    console.log( "\tNew Rating:\t" + Math.round(pStats.getRating()) );
                    console.log( "\tOld Rating:\t" + Math.round(pStats.oldRating) );
                    console.log( "\tRating Diff:\t" + diff );
                    console.log( "\tRd:\t" + pStats.getRd() );
                    console.log( "\tVol:\t" + pStats.getVol() );
                    console.log( "\tCiv:\t" + pStats.civ );

                    let plyr = await mongo.getPlayer( pStats.dId );
                    if ( !plyr ) {
                        await mongo.createPlayer( pStats.dId );
                        plyr = await mongo.getPlayer( pStats.dId );
                    }

                    if (!debug && this.type != 2)
                    {
                        let plyr = await mongo.getPlayer( pStats.dId );
                        if ( !plyr ) {
                            await mongo.createPlayer( pStats.dId );
                            plyr = await mongo.getPlayer( pStats.dId );
                        }
    
                        /*
                        civs = [
                        { name: 'rome', wins: 4, losses: 2 },
                        { name: 'mali', wins: 2, losses: 0 },
                        { name: 'inca', wins: 8, losses: 3 }
                        ];
                        */
                        let thisCiv = null;
                        if (plyr.civs) {
                            for ( let k = 0; k < plyr.civs.length; k++ ) {
                                if (pStats.civ == plyr.civs[k].name) {
                                    thisCiv = plyr.civs[k];
                                    break;
                                }
                            }
                        }
                        else {
                            plyr.civs = [];
                        }
                        if ( !thisCiv ) {
                            plyr.civs.push( { name: pStats.civ, wins: 0, losses: 0 } );
                            thisCiv = plyr.civs[plyr.civs.length - 1];
                        }

                        thisCiv.wins = thisCiv.wins + 1;
                        if (!plyr.subbedIn)  plyr.subbedIn  = 0;
                        if (!plyr.subbedOut) plyr.subbedOut = 0;
                        let sub = true;

                        await mongo.updatePlayer(pStats.dId,
                                                     Math.round(pStats.oldRating) + diff,
                                                     diff,
                                                     pStats.getRd(),
                                                     pStats.getVol(),
                                                     plyr.games + 1,
                                                     plyr.wins + 1,
                                                     plyr.losses,
                                                     plyr.civs,
                                                     plyr.subbedIn + 1,
                                                     plyr.subbedOut,
                                                     sub
                                                    );
                        //await mongo.updateCiv(thisCiv, i+1, pStats.oldRating, true);
                    }
                }
            }
        }
    }

    async setOrigPoints(pos, origId, debug) {
        let glickoPositions = [];
        let player = null;
        for(let i = 0; i < pos.length; ++i) {
            let pp = [];
            for(let m of pos[i])
            {
                //glicko2
                var p = await mongo.getPlayer( m[1] );
                if (p)
                    player = glicko.makePlayer(p.rating, p.rd, p.vol)
                else
                    player = glicko.makePlayer();
                player.oldRating = player.getRating();
                player.subType = m.subType;
                player.civ = m.civ;
                player.dId = m[1];
                if (m.subType != 1) {
                    pp.push(player);
                }
            }
            glickoPositions.push(pp);
        }
        const game = glicko.makeRace(glickoPositions);
        glicko.updateRatings(game);

        if (debug)
            console.log("[CHECK_MODE]");
        else
            console.log("[COMMIT_MODE]");

        for (let i = 0; i < glickoPositions.length; i++) {
            for (let j = 0; j < glickoPositions[i].length; j++) {
                let pStats = glickoPositions[i][j];
                if ( pStats.dId == origId ) {
                    var diff = Math.round(pStats.getRating()) - Math.round(pStats.oldRating);
                    if ( diff > 5 ) {
                        diff = 5;
                        pStats.setRating(pStats.oldRating + diff);
                    }
                    if ( diff < -100 ) diff = -100
			        for (var k = 0; k < this.positions.length; ++k) {
				        for(var m of this.positions[k]) {
                            if (m[1] == pStats.dId) {
                                m.diff = diff;
                            }
                        }
                    }

                    console.log( "ORIG ID: " + pStats.dId );
                    console.log( "\tNew Rating:\t" + Math.round(pStats.getRating()) );
                    console.log( "\tOld Rating:\t" + Math.round(pStats.oldRating) );
                    console.log( "\tRating Diff:\t" + diff );
                    console.log( "\tRd:\t" + pStats.getRd() );
                    console.log( "\tVol:\t" + pStats.getVol() );
                    console.log( "\tCiv:\t" + pStats.civ );

                    if (!debug && this.type != 2)
                    {
                        let plyr = await mongo.getPlayer( pStats.dId );
                        if ( !plyr ) {
                            await mongo.createPlayer( pStats.dId );
                            plyr = await mongo.getPlayer( pStats.dId );
                        }
    
                        /*
                        civs = [
                        { name: 'rome', wins: 4, losses: 2 },
                        { name: 'mali', wins: 2, losses: 0 },
                        { name: 'inca', wins: 8, losses: 3 }
                        ];
                        */
                        let thisCiv = null;
                        if (plyr.civs) {
                            for ( let k = 0; k < plyr.civs.length; k++ ) {
                                if (pStats.civ == plyr.civs[k].name) {
                                    thisCiv = plyr.civs[k];
                                    break;
                                }
                            }
                        }
                        else {
                            plyr.civs = [];
                        }
                        if ( !thisCiv ) {
                            plyr.civs.push( { name: pStats.civ, wins: 0, losses: 0 } );
                            thisCiv = plyr.civs[plyr.civs.length - 1];
                        }

                        let losses = plyr.losses;
                        let wins = plyr.wins;
                        if ( diff < 0 ) {
                            thisCiv.losses++;
                            losses++;
                        }
                        else {
                            thisCiv.wins++;
                            wins++;
                        }
                        if (!plyr.subbedIn)  plyr.subbedIn  = 0;
                        if (!plyr.subbedOut) plyr.subbedOut = 0;
                        let sub = true;

                        await mongo.updatePlayer(pStats.dId,
                                                  Math.round(pStats.oldRating) + diff,
                                                  diff,
                                                  pStats.getRd(),
                                                  pStats.getVol(),
                                                  plyr.games + 1,
                                                  wins,
                                                  losses,
                                                  plyr.civs,
                                                  plyr.subbedIn,
                                                  plyr.subbedOut + 1,
                                                  sub
                                                 );
                        //await mongo.updateCiv(thisCiv, i+1, pStats.oldRating, true);
                    }
                }
            }
        }
    }

	async parseGameReport(debugMode) {
        let glickoPositions = [];
        let player = null;

        for(let i = 0; i < this.positions.length; ++i)
        {
            let rp = [];
            let pp = [];
            for(let m of this.positions[i])
            {
                const civId = null
                //const civId = m.civ == null ? null : util.getCiv(m.civ).dbid;

                //glicko2
                var p = await mongo.getPlayer( m[1] );
                if (p)
                    player = glicko.makePlayer(p.rating, p.rd, p.vol)
                else
                    player = glicko.makePlayer();

                player.dId = m[1];
                player.civ = m.civ;
                player.subType = m.subType;
                player.oldRating = player.getRating();
                if (m.subType == 0) {
                    pp.push(player);
                }
                else if (m.subType == 1) {
                    if (this.type != 2)
                        await this.setSubPoints(this.positions.slice(i), m[1], debugMode);

                    pp.push(player);
                }
                else if (m.subType == 2) {
                    if ( this.type != 2 )
                        await this.setOrigPoints(this.positions.slice(0, i+1), m[1], debugMode);
                    else
                        pp.push(player);

                }
            }
            glickoPositions.push(pp);
        }
        //glickoPositions == correct player positions

        if (this.type != 2) {
            const game = glicko.makeRace(glickoPositions);
            glicko.updateRatings(game);
        } else {
            let teams = [];
            for (let i = 0; i < glickoPositions.length; i++) {
                console.log("\n\n----==== T E A M " + (i+1) + " ====----\n");
                console.log(glickoPositions[i]);
                let ratingSum = 0;
                let rdSum = 0;
                let volSum = 0;
                let numPlayers = glickoPositions[i].length;
                console.log("\n----==== T E A M " + (i+1) + "  P L A Y E R S ====----\n");
                for (const p of glickoPositions[i]) {
                    console.log("---- player.dId = " + p.dId + " ----")
                    console.log("p.oldRating = " + p.oldRating);
                    console.log("p.rd = " + p.getRd());
                    console.log("p.vol = " + p.getVol());
                    console.log("ratingSum = " + ratingSum);
                    console.log("rdSum = " + rdSum);
                    console.log("volSum = " + volSum);

                    ratingSum += p.oldRating;
                    rdSum += p.getRd();
                    volSum += p.getVol();
                }
                let ratingAvg = ratingSum / numPlayers;
                let rdAvg = rdSum / numPlayers;
                let volAvg = volSum / numPlayers;
                console.log("\n----==== T E A M " + (i+1) + "  A V G ====----\n");
                console.log("\nteamAvg:\n\tratingAvg = " + ratingAvg);
                console.log("\trdAvg = " + rdAvg);
                console.log("\tvolAvg = " + volAvg);
                let teamPlayer = glicko.makePlayer(ratingAvg, rdAvg, volAvg);
                teamPlayer.oldRating = ratingAvg;
                teams.push([teamPlayer]);
                console.log(teamPlayer);
                console.log("rating = " + teamPlayer.getRating());
                console.log("rd = " + teamPlayer.getRd());
                console.log("vol = " + teamPlayer.getVol());
            }

            console.log("\n----==== R A C E ====----\n");
            console.log(teams);
            for (let i = 0; i < glickoPositions.length; i++) {
                for (const p of glickoPositions[i]) {
                    var g = [];
                    for (let j = 0; j < glickoPositions.length; j++) {
                        if (j == i) {
                            g.push([p]);
                        } else {
                            g.push([glicko.makePlayer(teams[j][0].getRating(), teams[j][0].getRd(), teams[j][0].getVol())]);
                        }
                    }
                    const game = glicko.makeRace(g);
                    glicko.updateRatings(game);
                }
            }

            for (let i = 0; i < teams.length; i++) {
                console.log("\n----==== T E A M " + (i+1) + "  C O M P U T E ====----\n");
                for (const p of glickoPositions[i]) {
                    p.ratingDiff = Math.round(p.getRating()) - Math.round(p.oldRating);
                    p.oldRd = p.getRd();
                    p.oldVol = p.getVol();
                    if ( p.subType == 1 && p.ratingDiff < 5 )
                            p.setRating(p.oldRating + 5);
                    else if ( p.subType == 2 && p.ratingDiff > 5 )
                            p.setRating(p.oldRating + 5);
                    console.log("teamPlayer:\n\tsubType = " + p.subType + "\n\toldRating = " + p.oldRating + "\n\tnewRating = " + p.getRating() + "\n");
                }
            }
        }

        if (debugMode)
            console.log("[CHECK_MODE]");
        else
            console.log("[COMMIT_MODE]");

        let msg = '```NEW GAME```\n';
        for (let i = 0; i < glickoPositions.length; i++) {
            for (let j = 0; j < glickoPositions[i].length; j++) {
                let pStats = glickoPositions[i][j];
                var diff = Math.round(pStats.getRating()) - Math.round(pStats.oldRating);
                if ( diff < -100 ) diff = -100
                if ( this.isTeam() || pStats.subType != 1 ) {
			        for (var k = 0; k < this.positions.length; ++k) {
				        for(var m of this.positions[k]) {
                            if (m[1] == pStats.dId) {
                                m.diff = diff;
                            }
                        }
                    }
                    console.log( "ID: " + pStats.dId );
                    console.log( "\tNew Rating:\t" + Math.round(pStats.getRating()) );
                    console.log( "\tOld Rating:\t" + Math.round(pStats.oldRating) );
                    console.log( "\tRating Diff:\t" + diff );
                    console.log( "\tRd:\t" + pStats.getRd() );
                    console.log( "\tVol:\t" + pStats.getVol() );
                    console.log( "\tsubType:\t" + pStats.subType );
                    console.log( "\tCiv:\t" + pStats.civ );
                }

                if ( !debugMode ) {
                    if ( this.isFFA() || this.isDuel() ) {
                        if (pStats.subType == 0) {
                            let plyr = await mongo.getPlayer( pStats.dId );
                            if ( !plyr ) {
                                await mongo.createPlayer( pStats.dId );
                                plyr = await mongo.getPlayer( pStats.dId );
                            }

                            /*
                            civs = [
                            { name: 'rome', wins: 4, losses: 2 },
                            { name: 'mali', wins: 2, losses: 0 },
                            { name: 'inca', wins: 8, losses: 3 }
                            ];
                            */
                            let thisCiv = null;
                            if (plyr.civs) {
                                for ( let k = 0; k < plyr.civs.length; k++ ) {
                                    if (pStats.civ == plyr.civs[k].name) {
                                        thisCiv = plyr.civs[k];
                                        break;
                                    }
                                }
                            }
                            else {
                                plyr.civs = [];
                            }
                            if ( !thisCiv ) {
                                plyr.civs.push( { name: pStats.civ, wins: 0, losses: 0 } );
                                thisCiv = plyr.civs[plyr.civs.length - 1];
                            }

                            var wins;
                            var losses;
                            if (diff >= 0) {
                                wins = plyr.wins + 1;
                                losses = plyr.losses;
                                thisCiv.wins = thisCiv.wins + 1;
                            }
                            else if ( diff < 0 ) {
                                wins = plyr.wins;
                                losses = plyr.losses + 1;
                                thisCiv.losses = thisCiv.losses + 1;
                            }

                            if (!plyr.subbedIn)  plyr.subbedIn  = 0;
                            if (!plyr.subbedOut) plyr.subbedOut = 0;
                            let sub = false;

                            await mongo.updatePlayer(pStats.dId,
                                                         Math.round(pStats.oldRating) + diff,
                                                         diff,
                                                         pStats.getRd(),
                                                         pStats.getVol(),
                                                         plyr.games + 1,
                                                         wins,
                                                         losses,
                                                         plyr.civs,
                                                         plyr.subbedIn,
                                                         plyr.subbedOut,
                                                         sub
                                                        );
                            await mongo.updateCiv(thisCiv, i+1, pStats.oldRating, true);
                            let pn = await mongo.getDisplayName( pStats.dId )
                            let fContent = {
                                civ: thisCiv.name,
                                place: i+1,
                                skill: pStats.oldRating,
                                playerId: pStats.dId,
                                playerName: pn,
                                game: 'ffa'
                            };
                            let line = JSON.stringify(fContent, null, 2) + '\n';
                            fs.appendFile("/home/jarvis/bots/splunk/civs.data", line, (err) => {
                                if (err) {
                                    console.error(err);
                                    return;
                                };
                            });
                        }
                    }
                    else {
                        let plyr = await mongo.getPlayer( pStats.dId );
                        if ( !plyr ) {
                            await mongo.createPlayer( pStats.dId );
                            plyr = await mongo.getPlayer( pStats.dId );
                        }

                        /*
                        civs = [
                        { name: 'rome', wins: 4, losses: 2 },
                        { name: 'mali', wins: 2, losses: 0 },
                        { name: 'inca', wins: 8, losses: 3 }
                        ];
                        */
                        let thisCiv = null;
                        if (plyr.civs) {
                            for ( let k = 0; k < plyr.civs.length; k++ ) {
                                if (pStats.civ == plyr.civs[k].name) {
                                    thisCiv = plyr.civs[k];
                                    break;
                                }
                            }
                        }
                        else {
                            plyr.civs = [];
                        }
                        if ( !thisCiv ) {
                            plyr.civs.push( { name: pStats.civ, wins: 0, losses: 0 } );
                            thisCiv = plyr.civs[plyr.civs.length - 1];
                        }

                        var wins;
                        var losses;
                        if (diff >= 0) {
                            wins = plyr.wins + 1;
                            losses = plyr.losses;
                            thisCiv.wins = thisCiv.wins + 1;
                        }
                        else if ( diff < 0 ) {
                            wins = plyr.wins;
                            losses = plyr.losses + 1;
                            thisCiv.losses = thisCiv.losses + 1;
                        }

                        if (!plyr.subbedIn)  plyr.subbedIn  = 0;
                        if (!plyr.subbedOut) plyr.subbedOut = 0;

                        if ( pStats.subType == 1 )
                            plyr.subbedIn++;
                        else if ( pStats.subType == 2 )
                            plyr.subbedOut++;
                        let sub = false;

                        await mongo.updatePlayer(pStats.dId,
                                                     Math.round(pStats.oldRating) + diff,
                                                     diff,
                                                     pStats.getRd(),
                                                     pStats.getVol(),
                                                     plyr.games + 1,
                                                     wins,
                                                     losses,
                                                     plyr.civs,
                                                     plyr.subbedIn,
                                                     plyr.subbedOut,
                                                     sub
                                                    );
                        if ( pStats.subType == 0 ) {
                            await mongo.updateCiv(thisCiv, i+1, pStats.oldRating, false);
                            let fContent = {
                                civ: thisCiv.name,
                                place: i+1,
                                skill: pStats.oldRating,
                                player: pStats.dId,
                                game: 'team'
                            };
                            let line = JSON.stringify(fContent, null, 2) + '\n';
                            fs.appendFile("/home/jarvis/bots/splunk/civs.data", line, (err) => {
                                if (err) {
                                    console.error(err);
                                    return;
                                };
                            });
                        }
                    }
                    let plyr = await mongo.getPlayer( pStats.dId );
                    if (plyr) {
                        msg += '<@' + plyr._id + '>\n';
                        msg += "**[IN]**\n";
                        msg += "\tNew Rating:\t" + Math.round(pStats.getRating()) + "\n";
                        msg += "\tOld Rating:\t" + Math.round(pStats.oldRating) + "\n";
                        msg += "\tRating Diff:\t" + diff + "\n";
                        msg += "\tRd:\t" + pStats.getRd() + "\n";
                        msg += "\tVol:\t" + pStats.getVol() + "\n";
                        msg += "\tsubtype:\t" + pStats.subType + "\n";
                        msg += "**[OUT]**\n";
                        msg += "\tNew Rating:\t" + plyr.rating + "\n";
                        msg += "\tRating Diff:\t" + plyr.lastChange + "\n";
                        msg += "\tRd:\t" + plyr.rd + "\n";
                        msg += "\tVol:\t" + plyr.vol + "\n";
                        GetGlickoDebug().send(msg);
                        msg = '';
                    }
                }
            }
        }
        if(!debugMode) {
            if ( !this.isTeam() && !this.isDuel() ) {
                for( let m of this.positions[0] ) {
                    await mongo.bumpWins( m[1] );
                }
            }
            await this.notify();
        }
        else {
            for (let i = 0; i < this.positions.length; i++) {
                for ( let m of this.positions[i] ) {
                    console.log("results: " + m[1] + ' ' + m.diff);
                }
            }
            this.getGlickoReport().then( report => {
		        let gMsg = '```[CHECK MODE]```\n**No Errors Found**\n\n' + report;
		        this.message.channel.send(gMsg).then( msg => { msg.delete(60000).catch(() => {}) });
            });
        }
	}
	
	async notify()
	{
		// construct new message with full changes
        let time = this.message.createdAt.toUTCString()
		let gMsg = '```[ ' + time + ' ]```';
		gMsg += 'Type: ' + GetGameType(this.type) + '\n';
		gMsg += '⍟Host: ' + this.displayNameFromId(this.host) + '\n';
		
		// also delete original message?
		this.message.delete();
		
		// COULD CRASH HERE, USER NOT FOUND, so we deleted above
        this.getGlickoReport().then( report => {
            gMsg += report;
		    GetGlickoHistory().send(gMsg);

            if (gMsg.includes("**[ORIG]** ")) {
                var sub = gMsg.split("**[ORIG]** ").pop().split(" ").shift();        
                GetSubLog().send(sub + " subbed");       
            }       
        });
		
		GetReportsProcessed().send(
            '```[ ' + time + ']```' +
			this.message.content + '\n' +
			'Reported By: ' + this.message.author + '\n' +
			'Approved By: ' + this.user
		);

        this.message.channel.send(this.user + '\n-Report Finished Successfully-').then( msg => {
            msg.delete(10000);
        });

        checkTags(this.message.mentions.members.array());

        if ( this.isTeam() )
            leaderboard.update('team');
        else if ( this.isPBC() )
            leaderboard.update('pbc');
        else
            leaderboard.update('ffa');
	}

	async getGlickoReport()
	{
		let msg = '';
		if(this.type == 2)
		{
			for(var i = 0; i < this.positions.length; ++i)
			{
				msg += '\n**Team ' + (i+1) + '**\n';
				for(var m of this.positions[i])
				{
					const displayName = this.displayNameFromM(m);					
					msg += (m.diff > 0 ? '+' : '') + m.diff + ' ' + displayName + (m.civ == null ? '' : ' ' + m.civ) + '\n';
				}
			}
		}
		else
		{
			for(var i = 0; i < this.positions.length; ++i)
			{
				const max_j = this.positions[i].length;
				for(var j = 0; j < max_j; ++j)
				{
					const m = this.positions[i][j];
					if(max_j != 1 && m.subType == 0) msg += '(TIE ' + (i+1) + ') ';
					else msg += (i+1) + ': ';
					
					const displayName = this.displayNameFromM(m);
					msg += (m.diff > 0 ? '+' : '') + m.diff + ' ' + displayName + (m.civ == null ? '' : ' ' + m.civ) + '\n';
				}
			}
		}
		return msg;
	}

	displayNameFromM(m)
	{
		let displayName = this.displayNameFromId(m[1]);
		if(m.subType == 1) displayName = ' **[SUB]** ' + displayName;
		if(m.subType == 2) displayName = ' **[ORIG]** ' + displayName;
		return displayName;
	}
	displayNameFromId(id)
	{
        const user = this.message.mentions.users.get(id);
		const member = this.message.guild.member(user);
		return (user == null ? '**Deleted User**' : (member == null ? user.username : '<@' + id + '>'));
	}
	
	assignType(data)
	{
		if(data.includes('pbc')) {
            this.type = 1;
            mongo.useStatsColl('pbc');
        }
		else if ( data.includes('team') ) {
            this.type = 2;
            mongo.useStatsColl('team');
        }
		else if ( data.includes('ffa') ) {
            this.type = 0;
            mongo.useStatsColl('ffa');
        }
		else if(data.includes('duel') || data.includes('adcp') || data.includes('dual')) {
            this.type = 3;
            mongo.useStatsColl('ffa');
        }
		
		return this.type != null;
	}

    isFFA()  { return this.type == 0; }
    isPBC()  { return this.type == 1; }
    isTeam() { return this.type == 2; } 
    isDuel() { return this.type == 3; } 
}

async function checkTags(players)
{
    for ( i in players )
    {
        let player = players[i];
        if (!player)
            continue;
        let skill = await mongo.getHighScore( player.id );
        if (!skill)
            continue;

        if (skill < 1500)
        {
            if ( !player.roles.has(settler) )
                await swapTags(player, settler);
        }
        else if (skill >= 1500 && skill < 1600)
        {
            if ( !player.roles.has(chieftain) )
                await swapTags(player, chieftain);
        }
        else if (skill >= 1600 && skill < 1700)
        {
            if ( !player.roles.has(warlord) )
                await swapTags(player, warlord);
        }
        else if (skill >= 1700 && skill < 1800)
        {
            if ( !player.roles.has(prince) )
                await swapTags(player, prince);
        }
        else if (skill >= 1800 && skill < 1900)
        {
            if ( !player.roles.has(king) )
                await swapTags(player, king);
        }
        else if (skill >= 1900 && skill < 2000)
        {
            if ( !player.roles.has(emperor) )
                await swapTags(player, emperor);
        }
        else if (skill >= 2000 && skill < 2100)
        {
            if ( !player.roles.has(immortal) )
                await swapTags(player, immortal);
        }
        else if (skill >= 2100)
        {
            if ( !player.roles.has(deity) )
                await swapTags(player, deity);
        }
    }
}

async function swapTags(m, newRole)
{
    if (!m)
        console.log("Error in swapTags... member is null");
    else if (!newRole)
        console.log("Error in swapTags... newRole is null");
    else {
        await m.removeRoles(difficulties).catch(console.error);
        await m.addRole(newRole).catch(console.error);
    }
}

function GetGameType(id)
{
	if (id == 0) return "FFA";
	else if (id == 1) return "PBC";
	else if (id == 2) return "Team";
	else if (id == 3) return "Duel";
	else return "N/A";
}

function getMatches(regxp, data)
{
	var i = 0;
	var result = [];
	
	var m;
	while((m = regxp.exec(data)) !== null)
	{
		result.push(m);
		++i;
	}
	
	return result;
}

function checkCivs(civs) {
    let result = [];
    for ( const c of civs ) {
        switch ( c ) {
            case "teddyrr":
            case "teddyroughrider":
            case "americarr":
                result.push('Teddy Rough Rider');
                break;
            case "teddybullmoose":
            case "teddybm":
            case "americabm":
                result.push('Teddy Bull Moose');
                break;
            case "arabia":
            case "saladin":
                result.push('Arabia');
                break;
            case "australia":
                result.push('Australia');
                break;
            case "aztec":
            case "montezuma":
            case "monte":
                result.push('Aztec');
                break;
            case "brazil":
            case "brasil":
            case "pedro":
                result.push('Brazil');
                break;
            case "china":
                result.push('China');
                break;
            case "colombia":
            case "columbia":
            case "grancolombia":
            case "grancolumbia":
            case "simon":
            case "bolivar":
                result.push('Gran Colombia');
                break;
            case "egypt":
            case "cleopatra":
            case "cleo":
                result.push('Egypt');
                break;
            case "vengland":
            case "victoria":
                result.push('Victoria');
                break;
            case "ethiopia":
            case "menelik":
                result.push('Ethiopia');
                break;
            case "eengland":
            case "englande":
            case "eleanore":
            case "eleanoreengland":
                result.push('Eleanor England');
                break;
            case "efrance":
            case "francee":
            case "eleanorf":
            case "eleanorfrance":
                result.push('Eleanor France');
                break;
            case "catherinem":
            case "katherinem":
            case "magnificent":
                result.push('Catherine The Magnificent');
                break;
            case "catherinebq":
            case "katherinebq":
            case "blackqueen":
                result.push('Catherine Black Queen');
                break;
            case "germany":
            case "frederick":
                result.push('Germany');
                break;
            case "gorgo":
                result.push('Gorgo');
                break;
            case "efrance":
            case "francee":
            case "eleanorf":
            case "eleanorfrance":
                result.push('EleanorFrance');
                break;
            case "germany":
            case "frederick":
                result.push('Germany');
                break;
            case "gorgo":
                result.push('Gorgo');
                break;
            case "pericles":
                result.push('Pericles');
                break;
            case "gandhi":
            case "ghandi":
                result.push('Gandhi');
                break;
            case "chandragupta":
            case "chandra":
                result.push('Chandragupta');
                break;
            case "indonesia":
            case "indo":
            case "gitarja":
                result.push('Indonesia');
                break;
            case "japan":
            case "hojo":
                result.push('Japan');
                break;
            case "khmer":
                result.push('Khmer');
                break;
            case "kongo":
                result.push('Kongo');
                break;
            case "macedon":
            case "macedonia":
            case "alexander":
            case "alex":
                result.push('Macedon');
                break;
            case "maya":
                result.push('Maya');
                break;
            case "norway":
            case "harald":
            case "harold":
                result.push('Norway');
                break;
            case "nubia":
            case "amanitore":
                result.push('Nubia');
                break;
            case "persia":
            case "cyrus":
                result.push('Persia');
                break;
            case "poland":
            case "jadwiga":
                result.push('Poland');
                break;
            case "rome":
            case "trajan":
                result.push('Rome');
                break;
            case "russia":
            case "peter":
                result.push('Russia');
                break;
            case "scythia":
            case "tomyris":
            case "tomy":
                result.push('Scythia');
                break;
            case "spain":
            case "philip":
            case "phillip":
                result.push('Spain');
                break;
            case "sumeria":
            case "gilgamesh":
            case "gilga":
                result.push('Sumeria');
                break;
            case "cree":
            case "poundmaker":
                result.push('Cree');
                break;
            case "georgia":
            case "tamar":
                result.push('Georgia');
                break;
            case "korea":
            case "seondeok":
                result.push('Korea');
                break;
            case "mapuche":
            case "lautaro":
                result.push('Mapuche');
                break;
            case "mongolia":
            case "mongols":
            case "mongol":
            case "genghis":
            case "khan":
                result.push('Mongolia');
                break;
            case "netherlands":
            case "netherland":
            case "dutch":
            case "wilhelmina":
            case "wilma":
                result.push('Netherlands');
                break;
            case "scotland":
            case "scots":
            case "robert":
                result.push('Scotland');
                break;
            case "zulu":
            case "shaka":
                result.push('Zulu');
                break;
            case "canada":
            case "wilfrid":
            case "wilfred":
                result.push('Canada');
                break;
            case "hungary":
            case "matthias":
                result.push('Hungary');
                break;
            case "inca":
                result.push('Inca');
                break;
            case "mali":
            case "mansa":
                result.push('Mali');
                break;
            case "maori":
            case "kupe":
                result.push('Maori');
                break;
            case "ottomans":
            case "ottoman":
            case "ottomons":
            case "ottomon":
            case "suleiman":
                result.push('Ottomans');
                break;
            case "phoenicia":
            case "phonicia":
            case "phonecia":
            case "dido":
                result.push('Phoenicia');
                break;
            case "sweden":
            case "kristina":
                result.push('Sweden');
                break;
            case "eleanor":
                return "eleanor";
                break;
            case "england":
                return "england";
                break;
            case "france":
                return "france";
                break;
            case "greece":
                return "greece";
                break;
            case "gran":
            case "grand":
                return "gran";
                break;
            case "america":
            case "usa":
            case "teddy":
                return "america";
                break;
            case "catherine":
                return "catherine";
                break;
            case "india":
                return "india";
                break;
            default:
                if (c != "" && c != "tie" && c != "sub" && c != "for") {
                    return "Could not match `" + c +"` to a civ";
                }
                break;
        }
    }
    return result;
}

// #ranked_reporting
module.exports = new ReportBotModule();
