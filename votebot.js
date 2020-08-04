const util = require('/home/codenaugh/bots/util/util');
const rc = require('/home/codenaugh/bots/util/reactioncontrol');
const voting = require('/home/codenaugh/bots/util/voting');
const fs = require("fs");
require('log-timestamp')

/// Register civs as custom emojis
for(let i in util.civs) voting.setCustomEmoji(util.civs[i]['tag'], util.civs[i]['id']);

/// Set Vote Timeout to 30min
voting.setGlobalTimeout(1800);
//voting.setGlobalTimeout(60); //debug: 10 seconds

function GetVotes() { return util.getChannel(715011144028258334); }
function GetBotTesting()  { return util.getChannel(351127558143868928); }
function isBotChannel(channel) { return channel == GetVotes() || channel == GetBotTesting(); }

voting.on('finished', async(vote, channel) =>
{	
	/// Parse results to actual bans
	const results = vote.voteCivBans.getResults();
/*
    var jVote = '{ "Vote" : { ';
    vote.isTeamVote ? jVote += '"Game Type" : "Team", ' : jVote += '"Game Type" : "FFA", ';
    jVote += '"Number of Voters" : ';
    jVote += vote.users.length;
    jVote += ', ';
    jVote += '"Voters" : [ ';
    for ( const u of vote.users ) {
        jVote += '{ "id" : "' + u.id + '", ';
        jVote += '"username" : "' + u.username + '" }, ';
    }
    jVote = jVote.slice(0, -2);
    jVote += ' ], ';
    jVote += '"Tiebreaker" : ';
    jVote += '{ "id" : "' + vote.tieBreaker.id + '", ';
    jVote += '"username" : "' + vote.tieBreaker.username + '" }';
    jVote += ', ';
    jVote += '"Options" : { ';
    for ( const v of vote.voteChoices ) {
        if ( v[1].finished === true || v[1].finished === false ) {
            jVote += '"';
*/
//            jVote += v[1].display.replace(/\*\*/g, "").replace(/__/g, "").replace("\t", "");
/*            jVote += '" : { ';
            jVote += '"Votes" : [ ';
            for ( const vv in v[1].votes ) {
                jVote += '{ "emoji" : "' + vv + '", "users" : [ ';
                for ( const vu of v[1].votes[vv] ) {
                    jVote += '{ "id" : "' + vu.id + '", ';
                    jVote += '"username" : "' + vu.username + '" }';
                    jVote += ', ';
                }
                jVote = jVote.slice(0, -2);
                jVote += ' ] }, ';
            }
            jVote = jVote.slice(0, -2);
            jVote += ' ], ';
            jVote += '"Tallies" : [ '
            for (const [e, num] of v[1].votecount.entries()) {
                jVote += '{ "emoji" : "' + e + '", ';
                jVote += '"count" : "' + num + '" }';
                jVote += ', ';
            }
            jVote = jVote.slice(0, -2);
            jVote += ' ], ';
            let leading;
            let mostVotes = 0;
            for (const [key, value] of v[1].votecount.entries()) {
                if ( value > mostVotes ) {
                    mostVotes = value;
                    leading = key;
                }
            }
            jVote += '"Most Votes" : "';
            jVote += leading;
            jVote += '", ';
            jVote += '"Emoji Result" : "';
            jVote += v[1].chosen; //just an emoji
            jVote += '", ';
            jVote += '"Text Result" : "';
            jVote += v[1].message.content.split('= ').pop();
            jVote += '" }, ';
        }
    }
    jVote = jVote.slice(0, -2);
    jVote += ' }, ';
*/
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
/*
    jVote += '"Banned Civs" : ';
    jVote += JSON.stringify(banned);
    jVote += '} ';
    jVote += '}\n';
//    let jObj = JSON.parse(jVote);
  //  let line = JSON.stringify(jObj, null, 2);
    fs.appendFile("/home/jarvis/bots/splunk/votes.data", jVote, (err) => {
        if (err) {
            console.error(err);
            return;
        };
    });
*/
	
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
            try {
			    await firstMessage.edit('--- This vote was deleted due to inactivity ---');
            }
            catch ( e ) {
                //do nothing
            }
		
			for(let m of vote.messages) {
                try {
                    await m.delete();
                }
                catch ( e ) {
                    //do nothing
                }
            }
		}
	}
});

util.client.on('message', message =>
{
    if ( !isBotChannel( message.channel ) ) return;
	const content = message.content;
	
	const isTeamVote = content.startsWith('.teamvote')
			   || content.startsWith('!teamvote')
			   || content.startsWith('.voteteam')
			   || content.startsWith('!voteteam');

	if( content.startsWith('.vote') || isTeamVote)
	{
		//get host and voice channel info
		const host = message.author;
		const vchannel = message.member.voiceChannel;
		if (!vchannel)
		{
            message.reply("you must be in a voice channel to use the votebot!");
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
		bot_vote.show(message.channel, '**__New Game__**\n*NOTE: Only 1 CS may be captured and kept.*');
		
		if ( !isTeamVote )
		{
		    bot_vote.showChoice(message.channel, '**__Communication__**\t',
		    	new Map([
		    		["⛔", "None"],
		    		["🇫", "Private between Friends and Allies"],
		    		["🇵", "All Private Allowed"],
		    		["➕", "All Public Only"]
		    	]), {} );
/*
		    bot_vote.showChoice(message.channel, '**__If AI quitter, Raze/Reject All Cities__**\t',
		    	new Map([
		    		["✅", "Yes, Raze/Reject All"],
		    		["🚫", "No, Keep Any"]
		    	]), {} );
*/
		    bot_vote.showChoice(message.channel, '**__Official Friends/Allies__**\t',
		    	new Map([
		    		["0⃣", "0"],
		    		["1⃣", "1"],
		    		["2⃣", "2"],
		    		["♾️", "Unlimited"]
		    	]), {} );

		    bot_vote.showChoice(message.channel, '**__Gold Gifting/Trading__** (delegation/embassies exempt)\t',
		    	new Map([
		    		["✅", "Allowed"],
		    		["🚫", "Not Allowed"],
		    		["🇫", "Friends & Allies"],
		    		["🇦", "Allies Only"]
		    	]), {} );

		    bot_vote.showChoice(message.channel, '**__Luxuries Gifting/Trading__**\t',
		    	new Map([
		    		["✅", "Allowed"],
		    		["🚫", "Not Allowed"],
		    		["🇫", "Friends & Allies"],
		    		["🇦", "Allies Only"]
		    	]), {} );

		    bot_vote.showChoice(message.channel, '**__Strategics Gifting/Trading__**\t',
		    	new Map([
		    		["✅", "Allowed"],
		    		["🚫", "Not Allowed"],
		    		["🇫", "Friends & Allies"],
		    		["🇦", "Allies Only"]
		    	]), {} );

            bot_vote.showChoice(message.channel, '**__Game Duration__**\t',
                new Map([
                    ["4⃣", "4 Hours"],
                    ["6⃣", "6 Hours"],
		    		["♾️", "Unlimited"]
                ]), {} );
        }
        else {
            bot_vote.showChoice(message.channel, '**__Relic Trading before t20__**\t',
                new Map([
		    		["✅", "Allowed"],
		    		["🚫", "Not Allowed"]
                ]), {} );
        }

        //show for everyone
		bot_vote.showChoice(message.channel, '**__Map Type__**\t',
			new Map([
				["🇵", "Pangaea"],
				["🇫", "Fractal"],
				["🇨", "Continents"],
				["🗺️", "Small Continents"],
				["🏝", "Continents and Islands"],
				["🇦", "Archipelago"],
				["🇮", "Islands"],
				["7⃣", "Seven Seas"],
				["🔀", "Shuffle"]
			]), {} );

        bot_vote.showChoice(message.channel, '**__World Age__**\t',
            new Map([
				["🇸", "Standard Age"],
                ["🇳", "New Age (more mountains/hills)"]
            ]), {} );

        bot_vote.showChoice(message.channel, '**__Resources__**\t',
            new Map([
				["🇸", "Standard"],
                ["🇦", "Abundant"]
            ]), {} );

        bot_vote.showChoice(message.channel, '**__Strategics__**\t',
            new Map([
				["🇸", "Standard"],
                ["🇦", "Abundant"],
				["🇪", "Epic"],
				["🇬", "Guaranteed"]
            ]), {} );

        bot_vote.showChoice(message.channel, '**__Mountain Chokes__**\t',
            new Map([
				["🇨", "Classic"],
                ["🇸", "Standard"],
                ["🇱", "Large Openings"],
                ["🇮", "Impenetrable"]
            ]), {} );

        bot_vote.showChoice(message.channel, '**__Disasters__**\t',
            new Map([
				["1⃣", "One"],
				["2⃣", "Two"],
				["3⃣", "Three"],
                ["4⃣", "Four"]
            ]), {} );

		if ( !isTeamVote )
		{
		    bot_vote.showChoice(message.channel, '**__Draft Trading__**\t',
		    	new Map([
		    		["✅", "Allowed"],
		    		["🚫", "Not Allowed"],
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
