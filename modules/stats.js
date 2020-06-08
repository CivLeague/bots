const util = require('/home/codenaugh/bots/util/util');
const mongoUtil = require('/home/codenaugh/bots/util/mongo');

const Discord = require('discord.js');
const errorHandler = require('/home/codenaugh/bots/util/errormessage');

const cmd_stats = '.stats';
const cmd_ratings = '.ratings';
const cmd_roomratings = '.roomratings';
const cmd_separator = ' ';

const moderatorId = '291753249361625089';
const deity     = '628461624524800000';
const immortal  = '628464081346625536';
const emperor   = '628464280118755351';
const king      = '628464338985943040';
const prince    = '628464428593184778';
const warlord   = '628464457491939339';
const chieftain = '628464491129995264';
const settler   = '628464552882995200';
const difficulties = [settler, chieftain, warlord, prince, king, emperor, immortal, deity];


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
			if( content != '.resetstats ffa' && content != '.resetstats team' && content != '.resetstats pbc' ) {
				error.add('Type  `.resetstats ffa`  or  `.resetstats team`  or  `.resetstats pbc`  to confirm you really want to do this. You only get one reset for each leaderboard stats. This action **cannot** be reversed. Once you reset your stats they are gone forever. There is **no backup**.');
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
                let m = message.member;
                await m.removeRoles(difficulties).catch(console.error);
                await m.addRole(chieftain).catch(console.error);
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
                let db = ''
                if ( content.includes('team') ) {
                    mongoUtil.useStatsColl('team');
                    db = 'team';
                }
                else if ( content.includes('pbc') ) {
                    mongoUtil.useStatsColl('pbc');
                    db = 'pbc';
                }
                else {
                    mongoUtil.useStatsColl('ffa');
                    db = 'ffa';
                }

                var player = await mongoUtil.getPlayer(target.id);
                if ( player ) {
                    let skill = player.rating;
                    let games = player.games;
                    let first = player.first ? player.first : 0;
                    let wins  = player.wins;
                    let losses= player.losses;
                    let wp    = Math.round(wins*100/games);
                    let sIn   = player.subbedIn  ? player.subbedIn  : 0;
                    let sOut  = player.subbedOut ? player.subbedOut : 0;
                    let rank  = this.getRank(skill);
                    let rd    = Math.round(player.rd);

                    // add zeroes to wins
                    wins += ( games - wins - losses );

                    msg += target;
                    msg += '```js';
                    msg += '\nSkill:   ' + skill;
                    msg += '\nRank:    ' + rank;
                    msg += '\nGames:   ' + games;
                    msg += '\nWin %:   ' + wp + '%';
                    if ( db != 'team' )
                        msg += '\n1st:     ' + first;
                    msg += '\nWins:    ' + wins;
                    msg += '\nLosses:  ' + losses;
                    msg += '\nSub In:  ' + sIn;
                    msg += '\nSub Out: ' + sOut;
                    msg += '\nRD:      ' + rd;
                    msg += '```';
                }
                else {
                    msg += target + ' doesn\'t have any ' + db + ' stats yet';
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
            else if ( content.includes('pbc') )
                mongoUtil.useStatsColl('pbc');
            else mongoUtil.useStatsColl('ffa');

            var player = await mongoUtil.getPlayer(target.id);
            if ( player ) {
                let pages = [];
                let page = 1;

                let bCivs = player.civs.sort( 
                    function(a, b) { 
                        if ( (b.wins + b.losses) - (a.wins + a.losses) > 0 ) return 1;
                        else if ( (b.wins + b.losses) - (a.wins + a.losses) < 0 ) return -1;
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
            if ( content.includes('pbc') )
                mongoUtil.useStatsColl('pbc');
            else mongoUtil.useStatsColl('ffa');

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
                        else if ( b.losses - a.losses > 0 ) return 1;
                        else if ( b.losses - a.losses < 0 ) return -1;
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
        else if ( content.startsWith( cmd_roomratings ) ) {
            //get voice channel info
            const vchannel = message.member.voiceChannel;
            if (!vchannel)
            {
                message.reply("you must be in a voice channel to use roomratings!");
                return;
            }

            if ( content.includes('team') )
                mongoUtil.useStatsColl('team');
            else if ( content.includes('pbc') )
                mongoUtil.useStatsColl('pbc');
            else mongoUtil.useStatsColl('ffa');

            //add all game members (starting with host) to a mention message and a collection of users
            let msg = '```js';
            var players = await mongoUtil.getRatings(vchannel.members)
            if (!players) {
                message.reply('\nError occurred');
                return;
            }
            for ( player of players ) {
                if (!player) {
                    skill = 1400;
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
                else if ( content.includes('pbc') )
                    mongoUtil.useStatsColl('pbc');
                else mongoUtil.useStatsColl('ffa');

                let msg = '```js';
                var players = await mongoUtil.getRatings(message.mentions.members)
                if (!players) {
                    message.reply('\nError occurred');
                    return;
                }
                for ( player of players ) {
                    if (!player) {
                        skill = 1400;
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
        else if ( content.startsWith('.forcereset')
                  && isBotChannel(message.channel)
                  && GetBotTesting().guild.member(message.author).roles.has(moderatorId) ) {
            message.delete();

            let usage = '\n**USAGE**:\n`.forcereset  <member tag>  <ffa | team | pbc>`';
            if ( content == '.forcereset' ) {
                message.reply(usage).then( m => { m.delete(20000) });
                return;
            }

            let target = null;
            if( message.mentions.members.size == 0 ) {
                message.reply('\nYou must tag someone to change their rating' + usage).then( m => { m.delete(20000) });
                return;
            }
            else if(message.mentions.members.size == 1)
            {
                target = message.mentions.members.array().shift();
            }
            else
            {
                message.reply('The `.forcereset` command cannot be used for more than one player').then( m => { m.delete(20000) });
                return;
            }

            let db = '';
            if ( content.includes('team') ) {
                mongoUtil.useStatsColl('team');
                db = 'team';
            }
            else if ( content.includes('ffa') ) {
                mongoUtil.useStatsColl('ffa');
                db = 'ffa';
            }
            else if ( content.includes('pbc') ) {
                mongoUtil.useStatsColl('pbc');
                db = 'pbc';
            }
            else {
                message.reply("**ERROR** " + usage).then( m => { m.delete(20000) });
                return;
            }

            let player = await mongoUtil.getPlayer( target.id );
            if ( !player ) {
                message.reply(target + "doesn't have any stats to reset in the " + db + " database.").then(msg => { msg.delete(20000) });
            }
            else {
                mongoUtil.resetStats( target.id ).then( result => {
                    message.reply(target + "'s " + db + " stats have been reset.").then(msg => { msg.delete(20000) });
                });
            }
        }
        else if ( content.startsWith('.checkreset')
                  && isBotChannel(message.channel)
                  && GetBotTesting().guild.member(message.author).roles.has(moderatorId) ) {
            message.delete();

            let usage = '\n**USAGE**:\n`.checkreset  <member tag>  <ffa | pbc | team>`';
            if ( content == '.checkreset' ) {
                message.reply(usage).then( m => { m.delete(20000) });
                return;
            }

            let target = null;
            if( message.mentions.members.size == 0 ) {
                message.reply('\nYou must tag someone in order to check someone\'s resets' + usage).then( m => { m.delete(20000) });
                return;
            }
            else if(message.mentions.members.size == 1)
            {
                target = message.mentions.members.array().shift();
            }
            else
            {
                message.reply('The `.checkreset` command cannot be used for more than one player').then( m => { m.delete(20000) });
                return;
            }

            let db = '';
            if ( content.includes('team') ) {
                mongoUtil.useStatsColl('team');
                db = 'team';
            }
            else if ( content.includes('pbc') ) {
                mongoUtil.useStatsColl('pbc');
                db = 'pbc';
            }
            else if ( content.includes('ffa') ) {
                mongoUtil.useStatsColl('ffa');
                db = 'ffa';
            }
            else {
                message.reply("**ERROR** " + usage).then( m => { m.delete(20000) });
                return;
            }

            let player = await mongoUtil.getPlayer( target.id );
            if ( !player ) 
                message.reply(target + " doesn't have any stats in the " + db + " database").then( m => { m.delete(20000) });
            else if ( player.resets )
                message.reply(target + " has an unused reset token").then( m => { m.delete(20000) });
            else if ( !player.resets )
                message.reply(target + " has used their reset token").then( m => { m.delete(20000) });
        }
        else if ( content.startsWith('.givereset')
                  && isBotChannel(message.channel)
                  && GetBotTesting().guild.member(message.author).roles.has(moderatorId) ) {
            message.delete();

            let usage = '\n**USAGE**:\n`.givereset  <member tag>  <ffa | pbc | team>`';
            if ( content == '.givereset' ) {
                message.reply(usage).then( m => { m.delete(20000) });
                return;
            }

            let target = null;
            if( message.mentions.members.size == 0 ) {
                message.reply('\nYou must tag someone in order to give someone a reset' + usage).then( m => { m.delete(20000) });
                return;
            }
            else if(message.mentions.members.size == 1)
            {
                target = message.mentions.members.array().shift();
            }
            else
            {
                message.channel.send('The `.givereset` command cannot be used for more than one player').then( m => { m.delete(20000) });
                return;
            }

            if ( content.includes('team') )
                mongoUtil.useStatsColl('team');
            else if ( content.includes('pbc') )
                mongoUtil.useStatsColl('pbc');
            else if ( content.includes('ffa') )
                mongoUtil.useStatsColl('ffa');
            else {
                message.reply("**ERROR** " + usage).then( m => { m.delete(20000) });
                return;
            }

            mongoUtil.giveReset( target.id );
        }
        else if ( (content.startsWith('.changerating') || content.startsWith('.changeskill'))
                  && (message.channel == GetBotCommands() || message.channel == GetScrapReporting())
                  && GetBotTesting().guild.member(message.author).roles.has(moderatorId) ) {
            message.delete();

            let usage = '\n**USAGE**:\n`.changeskill`  `<ffa | pbc | team>`  `<member tag>`  `<amount>`';
            if ( content == '.changerating' || content == '.changeskill' ) {
                message.reply(usage).then( m => { m.delete(20000) });
                return;
            }
                
            let target = null;
            if( message.mentions.members.size == 0 ) {
                message.reply('\nYou must tag someone to change their rating' + usage).then( m => { m.delete(20000) });
                return;
            }

            let db = '';
            if ( content.includes( 'team' ) )
                db = 'team';
            else if ( content.includes( 'pbc' ) )
                db = 'pbc';
            else if ( content.includes( 'ffa' ) )
                db = 'ffa';
            else {
                message.reply("**ERROR** " + usage).then( m => { m.delete(20000) });
                return;
            }
            
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
