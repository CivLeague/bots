const util = require('../util/util');
const mongoUtil = require('../util/mongo');

const Discord = require('discord.js');
const errorHandler = require('../util/errormessage');

const cmd_stats = '.stats';
const cmd_ratings = '.ratings';
const cmd_separator = ' ';

const moderatorId = '291753249361625089';

//const file_myleague = 'data/myleague.txt';

function GetBotCommands() { return util.getChannel(304782408526594049); }
function GetBotTesting()  { return util.getChannel(351127558143868928); }
function GetScrapReporting()  { return util.getChannel(631383877298159616); }
function isBotChannel(channel) { return channel == GetBotCommands() || channel == GetBotTesting(); }

const error_formatting = "Formatting error! Either use **.stats** for your own stats or **.stats @discordUser** to check someone else's stats";

class StatsBotModule
{
	constructor()
	{
		util.client.on('message', message => { this.handle(message); });
	}

    getRank(rating) {
        if ( rating < 1500 )
            return 'Settler';
        else if ( rating < 1600 )
            return 'Chieftain';
        else if ( rating < 1700 )
            return 'Warlord';
        else if ( rating < 1800 )
            return 'Prince';
        else if ( rating < 1900 )
            return 'King';
        else if ( rating < 2000 )
            return 'Emperor';
        else if ( rating < 2100 )
            return 'Immortal';
        else return 'Deity';
    }
	
	async handle(message)
	{
		if(message.author.bot == true) return; // ignore bot messages
		if ( !isBotChannel(message.channel) && message.channel != GetScrapReporting() ) return;
		
        let error = errorHandler.create();
		const content = message.content.toLowerCase();

        if (content.startsWith('.resetstats')) {
            message.delete();
			if( content != '.resetstats main' && content != '.resetstats team' ) {
				error.add('Type  `.resetstats main`  or  `.resetstats team`  to confirm you really want to do this. You only get one reset for main leaderboard stats and one reset for team leaderboard stats. This action **cannot** be reversed. Once you reset your stats they are gone forever. There is **no backup**.');
				error.send(message.channel, 30);
				return;
            }

            let db = content.split(' ').pop();
            await mongoUtil.useStatsColl(db);
            let player = await mongoUtil.getPlayer( message.author.id );
            if ( !player ) {
                message.reply("you don't have any stats to reset in the " + db + " database.").then(msg => { msg.delete(20000) });
            }
            if ( player.resets ) {
                mongoUtil.resetStats( message.author.id ).then( result => {
                    message.reply("your " + db + " stats have been reset.").then(msg => { msg.delete(20000) });
                });
            }
            else
                message.reply("you have already used your " + db + " stats reset.").then(msg => { msg.delete(20000) });
        }
        else if( content.startsWith(cmd_stats) )
        {
            if ( !isBotChannel(message.channel) ) return;

            let target = null;
            if(message.mentions.members.size == 0)
            {
                // usage on 'self'
                target = message.member;
            }
            else if(message.mentions.members.size == 1)
            {
                target = message.mentions.members.array().shift();
            }
            else
            {
                message.channel.send('The **' + cmd_stats + '** command cannot be used for more than one player');
                return;
            }

            if( !target ) // should never happen?!
            {
                console.log("CRASH_ERROR [content] " + content + " [mentions.members.size] " + message.mentions.members.size);
                return;
            }

            try
            {
                let msg = '';
                if ( content.includes('team') )
                    mongoUtil.useStatsColl('team');
                else mongoUtil.useStatsColl('main');

                var player = await mongoUtil.getPlayer(target.id);
                if ( player ) {
                    let skill = player.rating;
                    let games = player.games;
                    let wins  = player.wins;
                    let losses= player.losses;
                    let wp    = Math.round(wins*100/games);
                    let sIn   = player.subbedIn  ? player.subbedIn  : 0;
                    let sOut  = player.subbedOut ? player.subbedOut : 0;
                    let rank  = this.getRank(skill);
                    let rd    = Math.round(player.rd);

                    msg += target;
                    msg += '```js';
                    msg += '\nSkill:   ' + skill;
                    msg += '\nRank:    ' + rank;
                    msg += '\nGames:   ' + games;
                    msg += '\nWin %:   ' + wp + '%';
                    msg += '\nWins:    ' + wins;
                    msg += '\nLosses:  ' + losses;
                    msg += '\nZeroes:  ' + ( games - wins - losses );
                    msg += '\nSub In:  ' + sIn;
                    msg += '\nSub Out: ' + sOut;
                    msg += '\nRD:      ' + rd;
                    msg += '```';
                }
                else {
                    msg += target + ' doesn\'t have any stats yet';
                }
                message.channel.send(msg);
            }
            catch(err)
            {
                let error = errorHandler.create();
                error.add(err);
                error.send(message.channel, 30);
            }
        }
        else if( content.startsWith('.mostcivs') ) {
            if ( !isBotChannel(message.channel) ) return;

            let target = null;
            if(message.mentions.members.size == 0)
            {
                // usage on 'self'
                target = message.member;
            }
            else if(message.mentions.members.size == 1)
            {
                target = message.mentions.members.array().shift();
            }
            else
            {
                message.channel.send('The **' + cmd_stats + '** command cannot be used for more than one player');
                return;
            }

            if( !target ) // should never happen?!
            {
                console.log("CRASH_ERROR [content] " + content + " [mentions.members.size] " + message.mentions.members.size);
                return;
            }

            let msg = '';
            if ( content.includes('team') )
                mongoUtil.useStatsColl('team');
            else mongoUtil.useStatsColl('main');

            var player = await mongoUtil.getPlayer(target.id);
            if ( player ) {
                let pages = [];
                let page = 1;

                let bCivs = player.civs.sort( 
                    function(a, b) { 
                        let winP = (b.wins / (b.wins + b.losses)) - (a.wins / (a.wins + a.losses))
                        if ( b.wins - a.wins > 0 ) return 1;
                        else if ( a.wins - b.wins > 0 ) return -1;
                        else if ( winP > 0 ) return 1;
                        else if ( winP < 0 ) return -1;
                        else return ( b.name < a.name );
                    }
                );

                console.log( bCivs );

                let cName = '';
                let fields = [];
                let str1 = '';
                let str2 = '';
                let str3 = '';
                let i = 0;
                for ( i = 0; i < bCivs.length; i++ ) {
                    cName = bCivs[i].name;
                    if (cName == 'EleanorE') {
                        cName = 'Eleanor';
                        bCivs[i].name = "Eleanor England";
                    }
                    else if (cName == 'EleanorF') {
                        cName = 'Eleanor';
                        bCivs[i].name = "Eleanor France";
                    }
                    console.log ( i + ': ' + bCivs[i].name );
                    if ( i > 0 && str1 != '' ) {
                        str1 += '\n';
                        str2 += '\n';
                        str3 += '\n';
                    }
                    str1 += '<' + util.civs[cName].tag + util.civs[cName].id + '>' + bCivs[i].name;
                    str2 += '`' + (bCivs[i].wins / (bCivs[i].wins + bCivs[i].losses) * 100).toFixed(0) + '%`';
                    str3 += '`[' + bCivs[i].wins + '-' + bCivs[i].losses + ']`';
                    if ( ((i+1) % 5) == 0 ) {
                        fields.push({ name: 'Civ', value: str1, inline: true });
                        fields.push({ name: '[W-L]', value: str3, inline: true });
                        fields.push({ name: 'Win%', value: str2, inline: true });
                        pages.push(fields);
                        str1 = '';
                        str2 = '';
                        str3 = '';
                        fields = [];
                    }
                }
                if ( str1 != '' ) {
                    fields = [];
                    fields.push({ name: 'Civ', value: str1, inline: true });
                    fields.push({ name: '[W-L]', value: str3, inline: true });
                    fields.push({ name: 'Win%', value: str2, inline: true });
                    pages.push(fields);
                }

                let embed = new Discord.RichEmbed()
                    .setColor('#0099ff')
                    .setTitle(target.displayName + '\'s Most Played Civs')
                    .setDescription( content.includes('team') ? 'From the Team Database' : 'From the FFA Database' )
                    .setFooter(`Page ${page} of ${pages.length}`)
                    .setThumbnail(target.user.avatarURL);
                embed.fields = pages[page-1];

                message.channel.send(embed).then( msg => {
                    msg.react('◀️').then( r => {
                        msg.react('▶️')

                        const backFilter = (reaction, user) => reaction.emoji.name === '◀️' && user.id === message.author.id;;
                        const nextFilter = (reaction, user) => reaction.emoji.name === '▶️' && user.id === message.author.id;;

                        const back = msg.createReactionCollector(backFilter, { time: 180000, dispose: true });
                        const next = msg.createReactionCollector(nextFilter, { time: 180000, dispose: true});

                        back.on('collect', r => {
                            r.remove(message.author);
                            if (page === 1)
                                return;
                            page--;
                            embed.fields = pages[page-1];
                            embed.setFooter(`Page ${page} of ${pages.length}`);
                            msg.edit(embed);
                        })

                        next.on('collect', r => {
                            r.remove(message.author);
                            if (page === pages.length)
                                return;
                            page++
                            embed.fields = pages[page-1];
                            embed.setFooter(`Page ${page} of ${pages.length}`);
                            msg.edit(embed);
                        })
                    })
                });
            }
        }
        else if( content.startsWith('.bestcivs') ) {
            if ( !isBotChannel(message.channel) ) return;

            let target = null;
            if(message.mentions.members.size == 0)
            {
                // usage on 'self'
                target = message.member;
            }
            else if(message.mentions.members.size == 1)
            {
                target = message.mentions.members.array().shift();
            }
            else
            {
                message.channel.send('The **' + cmd_stats + '** command cannot be used for more than one player');
                return;
            }

            if( !target ) // should never happen?!
            {
                console.log("CRASH_ERROR [content] " + content + " [mentions.members.size] " + message.mentions.members.size);
                return;
            }

            let msg = '';
            if ( content.includes('team') )
                mongoUtil.useStatsColl('team');
            else mongoUtil.useStatsColl('main');

            var player = await mongoUtil.getPlayer(target.id);
            if ( player ) {
                let pages = [];
                let page = 1;

                let bCivs = player.civs.sort( 
                    function(a, b) { 
                        let winP = (b.wins / (b.wins + b.losses)) - (a.wins / (a.wins + a.losses))
                        if ( winP > 0 ) return 1;
                        else if ( winP < 0 ) return -1;
                        else if ( b.wins - a.wins > 0 ) return 1;
                        else if ( b.wins - a.wins < 0 ) return -1;
                        else return ( b.name < a.name );
                    }
                );

                console.log( bCivs );

                let cName = '';
                let fields = [];
                let str1 = '';
                let str2 = '';
                let str3 = '';
                let i = 0;
                for ( i = 0; i < bCivs.length; i++ ) {
                    cName = bCivs[i].name;
                    if (cName == 'EleanorE') {
                        cName = 'Eleanor';
                        bCivs[i].name = "Eleanor England";
                    }
                    else if (cName == 'EleanorF') {
                        cName = 'Eleanor';
                        bCivs[i].name = "Eleanor France";
                    }
                    console.log ( i + ': ' + bCivs[i].name );
                    if ( i > 0 && str1 != '' ) {
                        str1 += '\n';
                        str2 += '\n';
                        str3 += '\n';
                    }
                    str1 += '<' + util.civs[cName].tag + util.civs[cName].id + '>' + bCivs[i].name;
                    str2 += '`' + (bCivs[i].wins / (bCivs[i].wins + bCivs[i].losses) * 100).toFixed(0) + '%`';
                    str3 += '`[' + bCivs[i].wins + '-' + bCivs[i].losses + ']`';
                    if ( ((i+1) % 5) == 0 ) {
                        fields.push({ name: 'Civ', value: str1, inline: true });
                        fields.push({ name: 'Win%', value: str2, inline: true });
                        fields.push({ name: '[W-L]', value: str3, inline: true });
                        pages.push(fields);
                        str1 = '';
                        str2 = '';
                        str3 = '';
                        fields = [];
                    }
                }
                if ( str1 != '' ) {
                    fields = [];
                    fields.push({ name: 'Civ', value: str1, inline: true });
                    fields.push({ name: 'Win%', value: str2, inline: true });
                    fields.push({ name: '[W-L]', value: str3, inline: true });
                    pages.push(fields);
                }

                let embed = new Discord.RichEmbed()
                    .setColor('#0099ff')
                    .setTitle(target.displayName + '\'s Best Civs')
                    .setDescription( content.includes('team') ? 'From the Team Database' : 'From the FFA Database' )
                    .setFooter(`Page ${page} of ${pages.length}`)
                    .setThumbnail(target.user.avatarURL);
                embed.fields = pages[page-1];

                message.channel.send(embed).then( msg => {
                    msg.react('◀️').then( r => {
                        msg.react('▶️')

                        const backFilter = (reaction, user) => reaction.emoji.name === '◀️' && user.id === message.author.id;;
                        const nextFilter = (reaction, user) => reaction.emoji.name === '▶️' && user.id === message.author.id;;

                        const back = msg.createReactionCollector(backFilter, { time: 180000, dispose: true });
                        const next = msg.createReactionCollector(nextFilter, { time: 180000, dispose: true});

                        back.on('collect', r => {
                            r.remove(message.author);
                            if (page === 1)
                                return;
                            page--;
                            embed.fields = pages[page-1];
                            embed.setFooter(`Page ${page} of ${pages.length}`);
                            msg.edit(embed);
                        })

                        next.on('collect', r => {
                            r.remove(message.author);
                            if (page === pages.length)
                                return;
                            page++
                            embed.fields = pages[page-1];
                            embed.setFooter(`Page ${page} of ${pages.length}`);
                            msg.edit(embed);
                        })
                    })
                });
            }
        }
		else if( content.startsWith(cmd_ratings) )
		{
            if ( content === cmd_ratings ) {
                message.reply('\nYou must mention players to get ratings');
                return; 
            }

            try
            {
                if ( content.includes('team') )
                    mongoUtil.useStatsColl('team');
                else mongoUtil.useStatsColl('main');

                let msg = '```js';
                var players = await mongoUtil.getRatings(message.mentions.members)
                if (!players) {
                    message.reply('\nError occurred');
                    return;
                }
                for ( player of players ) {
                    if (!player) {
                        skill = 1500;
                    }
                    let name  = player.name.replace(/[^0-9a-zA-Z_\[\]\(\)\-\/ ]/g, '');
                    let skill = player.rating;
                    let rank  = this.getRank(skill);
                    let spaces = 26 - name.length;

                    msg += '\n' + name;
                    while ( spaces > 0 ) {
                        msg += ' ';
                        spaces--;
                    }

                    msg += skill + '\t' + rank;
                }
                msg += '```';
                message.channel.send(msg);
            }
            catch(err)
            {
                let error = errorHandler.create();
                error.add(err);
                error.send(message.channel, 30);
            }
		}
        else if ( (content.startsWith('.changerating') || content.startsWith('.changeskill'))
                  && (message.channel == GetBotCommands() || message.channel == GetScrapReporting())
                  && GetBotTesting().guild.member(message.author).roles.has(moderatorId) ) {
            message.delete();

            let usage = '\n**USAGE**:\n`.changeskill`  `[team]`  `<member tag>`  `<amount>`';
            if ( content == '.changerating' || content == '.changeskill' ) {
                message.reply(usage).then( m => { m.delete(20000) });
                return;
            }
                
            let target = null;
            if( message.mentions.members.size == 0 ) {
                message.reply('\nYou must tag someone to change their rating' + usage).then( m => { m.delete(20000) });
                return;
            }

            let db = 'main';
            if ( content.includes( 'team' ) )
                db = 'team';
            
            let amt = content.split(' ').pop();
            if ( !amt ) {
                message.reply('\nCould not determine amount to change the rating by:' + usage).then( m => { m.delete(20000) });;
                return;
            }
            amt = Number(amt);

            if ( !Number.isInteger(amt) ) {
                message.reply('\nCould not determine amount to change the rating by:' + usage).then( m => { m.delete(20000) });;
                return;
            }

            for (let target of message.mentions.members.array()) {
                mongoUtil.changeSkill( target.id, db, amt );
            }
        }
	}
}

module.exports = new StatsBotModule();
