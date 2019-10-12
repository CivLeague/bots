const util = require('../util/util');
const mongoUtil = require('../util/mongo');

const errorHandler = require('../util/errormessage');

const cmd_stats = '.stats';
const cmd_ratings = '.ratings';
const cmd_separator = ' ';

//const file_myleague = 'data/myleague.txt';

function GetBotCommands() { return util.getChannel(304782408526594049); }
function GetBotTesting()  { return util.getChannel(351127558143868928); }
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
		if ( !isBotChannel(message.channel) ) return;
		
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

                    msg += target;
                    msg += '```js';
                    msg += '\nSkill:   ' + skill;
                    msg += '\nRank:    ' + rank;
                    msg += '\nGames:   ' + games;
                    msg += '\nWin %:   ' + wp + '%';
                    msg += '\nWins:    ' + wins;
                    msg += '\nLosses:  ' + losses;
                    msg += '\nSub In:  ' + sIn;
                    msg += '\nSub Out: ' + sOut;
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
                    let spaces = 20 - name.length;

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
	}
}

module.exports = new StatsBotModule();
