const util = require('./util/util');
const rc = require('./util/reactioncontrol');
const voting = require('./util/voting');

/// Register civs as custom emojis
for(let i in util.civs) voting.setCustomEmoji(util.civs[i]['tag'], util.civs[i]['id']);

/// Set Vote Timeout to 30min
voting.setGlobalTimeout(1800);
//voting.setGlobalTimeout(60); //debug: 10 seconds

function GetBotCommands() { return util.getChannel(304782408526594049); }
function GetBotTesting()  { return util.getChannel(351127558143868928); }
function isBotChannel(channel) { return channel == GetBotCommands() || channel == GetBotTesting(); }

voting.on('finished', async(vote, channel) =>
{	
	/// Parse results to actual bans
	const results = vote.voteCivBans.getResults();
	let banned = [];
	for(let i of results)
	{
		for(let j in util.civs)
		{
			if(util.civs[j]['id'] == i)
			{
				banned.push( j );
				break;
			}
		}
	}
	
	/// Call draft
	if ( vote.isTeamVote )
	{
		util.createDraft(2, Object.keys(util.civs), banned, async(err, result) =>
		{
			if(err)
			{
				await message.channel.send(err);
				return;
			}

			let msg = "**Team 1**\n";
			result[0].forEach( j => { msg += '<' + util.civs[j]['tag'] + util.civs[j]['id'] + '> ' + j + /*', '*/ '\n'; });
			await channel.send(msg);
			msg = "**Team 2**\n";
			result[1].forEach( j => { msg += '<' + util.civs[j]['tag'] + util.civs[j]['id'] + '> ' + j + /*', '*/ '\n'; });
			await channel.send(msg);
		});
	}
	else
	{
		util.createDraft(vote.users.length, Object.keys(util.civs), banned, async(err, result) =>
		{
			if(err)
			{
				await message.channel.send(err);
				return;
			}

			let msg = '**__Draft__**';
			await channel.send(msg);
			for(let i = 0; i < result.length; ++i)
			{
                msg = "<@" + vote.users[i].id + ">\n";
				result[i].forEach( j => { msg += '<' + util.civs[j]['tag'] + util.civs[j]['id'] + '> ' + j + /*', '*/ '\n'; });
				//msg = msg.slice(0, -2); // trailing comma removed
			
			    await channel.send(msg);
			}
		});
	}
});

voting.on('timeout', async(vote) =>
{
	/// Cleanup only if the vote did not finish
	if( !vote.finished )
	{
		/// Loop through all messages and delete them. Edit the first message to reflect this
		if(vote.messages.length != 0)
		{
			const firstMessage = vote.messages.shift();
			await firstMessage.edit('--- This vote was deleted due to inactivity ---');
		
			for(let m of vote.messages) await m.delete();
		}
	}
});

util.client.on('message', message =>
{
    if ( !isBotChannel( message.channel ) ) return;
	const content = message.content;
	
	const isTeamVote = content.startsWith('.teamvote')
			   || content.startsWith('!teamvote');

	if( content.startsWith('.vote') || isTeamVote)
	{
		//get host and voice channel info
		const host = message.author;
		const vchannel = message.member.voiceChannel;
		if (!vchannel)
		{
            message.reply("you must be in a voicechannel to use the votebot!");
            return;
		}
		//grab list of players in voice channel that are not part of the game
		const notplaying = message.mentions.members.array();
		//add all game members (starting with host) to a mention message and a collection of users
		mentions = [];
		players = [];
		mentions.push("<@" + host.id + ">");
		players.push(host);
		vchannel.members.forEach(function(guildMember, guildMemberId) {
			if ( guildMember.user != host && !notplaying.includes(guildMember) ) {
				mentions.push("<@" + guildMemberId + ">");
				players.push(guildMember.user);
			}
		});
        if ( players.length < 2 )
        {
            message.channel.send("You need at least 2 players");
            return;
        }

		//create and send the message to tag everyone in the game
		playersMsg = "";
		mentions.forEach(function(player) {
			playersMsg = playersMsg.concat(" ", player);
		});
		message.channel.send(playersMsg);
		
		// Order members in the order of which they were mentioned in the message
		//const m = message.mentions.members.array();
		//const split = content.split(' ').splice(1);
		//let result = [];
		//let skipped = 0;
		//for(let j in split)
		//{
		//	if(split[j] == '')
		//	{
		//		++skipped;
		//		continue;
		//	}

		//	for(let i of m)
		//	{
		//		if(i == split[j])
		//		{
		//			// Eliminate Duplicates
		//			if(result.includes(i.user))
		//			{
		//				++skipped;
		//			}
		//			else
		//			{
		//				result[j - skipped] = i.user;
		//			}
		//			
		//			break;
		//		}
		//	}
		//}
		
		const bot_vote = voting.createVote(players);
		bot_vote.isTeamVote = isTeamVote;
		bot_vote.show(message.channel, '**__Modded Game__** - This game is played using the Better Balanced Game mod, type .modinfo for more details');
		
		if ( !isTeamVote )
		{
		bot_vote.showChoice(message.channel, '**__Game Mode__**\n',
			new Map([
				["🇩", "Diplo"],
				["➕", "Diplo+"],
				["🇼", "Always War"],
				["🇵", "Always Peace"]
			]), {} );

        bot_vote.showChoice(message.channel, '**__Game Duration__**\n',
            new Map([
                ["4⃣", "4 Hours"],
                ["6⃣", "6 Hours"],
				["➖", "No Limit"]
            ]), {} );

		bot_vote.showChoice(message.channel, '**__Starting Era__**\n',
			new Map([
				["🇦", "Ancient"],
				["🇨", "Classical"],
				["🇲", "Medieval"],
				["🇷", "Renaissance"],
				["🇮", "Information"]
			]), {} );
        }

        //show for everyone
		bot_vote.showChoice(message.channel, '**__Map Type__**\n',
			new Map([
				["🇵", "Pangaea"],
				["🇫", "Fractal"],
				["🇨", "Continents"],
				["🇦", "Archipelago"],
				["🇸", "Inland Sea"],
				["🇮", "Islands"],
				["🔀", "Shuffle"],
				["7⃣", "Seven Seas"],
				["🤏", "Small Continents"],
				["🇹", "Terra"],
				["🏹", "Continents and Islands"]
			]), {} );

        bot_vote.showChoice(message.channel, '**__World Age__**\n',
            new Map([
				["🇸", "Standard Age"],
                ["🇳", "New Age (more mountains/hills)"]
            ]), {} );

        bot_vote.showChoice(message.channel, '**__Resources__**\n',
            new Map([
				["🇸", "Standard"],
                ["🇦", "Abundant"]
            ]), {} );
		
		if ( !isTeamVote )
		{
        bot_vote.showChoice(message.channel, '**__Disaster Intensity__**\n',
            new Map([
				["0⃣", "No Disasters"],
				["1⃣", "Low Frequency"],
				["2⃣", "Standard"],
				["3⃣", "Increased Frequency"],
				["4⃣", "High Frequency"]
            ]), {} );

		bot_vote.showChoice(message.channel, '**__City States__**\n',
			new Map([
				["🇷", "Raze All"],
				["1⃣", "1 Capture (Raze rest)"],
				["2⃣", "2 Capture (Raze rest)"],
				["➖", "No Limit"]
			]), {} );

		bot_vote.showChoice(message.channel, '**__Barbarians__**\t\t',
			new Map([
				["➕", "Banned"],
				["➖", "Not Banned"]
			]), {} );
			
		bot_vote.showChoice(message.channel, '**__Nukes__**\t\t\t\t',
			new Map([
				["➕", "Banned"],
				["➖", "Not Banned"]
			]), {} );

		bot_vote.showChoice(message.channel, '**__Draft Trading__**\t',
			new Map([
				["➕", "Allowed"],
				["➖", "Not Allowed"],
                ["🇷", "All Random Civs"]
			]), {} );
		}
		
        /// Suggested Civ Bans
        suggestedCivs = new Map([
                /*[util.civs['Georgia']['id']],*/
                ['🚫']
        ]);

		bot_vote.showChoice(message.channel, '**__Civ Bans__**\n', suggestedCivs, { separator: '\n', connector: ' ', multi: true, callback: (vote) =>
		{
			bot_vote.voteCivBans = vote;
			for(let i in util.civs) vote.setOption(util.civs[i]['id'], { post: i});
			vote.setOption('🚫', '');
		}});
		
        bot_vote.showFinal(message.channel, '**__Waiting For__**\n');
	}
});

util.client.on('messageReactionAdd', (reaction, user) => { voting.messageReactionAdd(reaction, user); });
util.client.on('messageReactionRemove', (reaction, user) => { voting.messageReactionRemove(reaction, user); });

util.login_token('vote');
