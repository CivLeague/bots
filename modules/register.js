const util = require('../util/util');
const mongoUtil = require('../util/mongo');
const errorHandler = require('../util/errormessage');

const Discord = require('discord.js');
const SteamAPI = require('steamapi');
const steam = new SteamAPI(util.getToken('steam'));


const cmd_register = '.register';
const cmd_forceregister = '.forceregister';

const setid_usage = '`.setid`  `<tagged member>`  `<steam to match>`';

function GetChannelSteamLog() { return util.getChannel(615805208848498688); }
function GetChannelWelcome() { return util.getChannel(368928122219003904); }
const vhaId = '375413414987825152';
const moderatorId = '291753249361625089';
const ranked = '615780983047979008';
const chieftain = '628464491129995264';
const novice = '577702305999093763';

const http = require('http');
const https = require('https');

// Create an HTTP server
const srv = http.createServer( (req, res) =>
{
	res.writeHead(200, { 'Content-Type': 'text/html' });
	res.write('<img src="http://civplayers.com/images/logos/c4p_logo_d.jpg"/><br><br>');
	//res.end('okay');
	
	const API_ENDPOINT = '/api/v7'
	const CLIENT_ID = '482621155136765973'
	const CLIENT_SECRET = util.getToken('discord');
	const REDIRECT_URI = 'http://34.216.163.75'
	//const REDIRECT_URI = 'http://cpl.gg';

	const params = getParams(req);
	if(params.hasOwnProperty('code'))
	{
		if(!params.hasOwnProperty('state'))
		{
			res.end('<b>Error</b><br>Please request a new link from Discord by using .register - this link does not contain your Discord UserID');
			return;
		}
		
		const state = JSON.parse(decodeURIComponent(params.state));

		const channel = util.getChannel(state.chan); if(channel == null) 
		{
			res.end('<b>Error</b><br>Failed to access the Discord channel. Please report this error to a member of staff!');
			return;
		}
		
		///
		/// Initial OAuth2 Request
		///
		util.makeRequest(https, {
			method: 'POST',
			hostname: 'discordapp.com',
			path: API_ENDPOINT + '/oauth2/token',
		}, {
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			grant_type: 'authorization_code',
			code: params.code,
			redirect_uri: REDIRECT_URI,
			scope: 'identify connections'
		}, (body) =>
		{
			const json = JSON.parse(body);
			
			///
			/// Fetch Discord UserID
			///
			util.makeRequest(https, {
				method: 'GET',
				hostname: 'discordapp.com',
				path: API_ENDPOINT + '/users/@me',
				headers: { 'authorization': 'Bearer ' + json.access_token },
			}, null, (body_me) =>
			{
				const json_me = JSON.parse(body_me);
				if(json_me.hasOwnProperty('code'))
				{
					res.end('<b>Error</b><br>' + json_me.message);
					return;
				}
				
				if(state.user != json_me.id)
				{
					res.end('<b>Error</b><br>You are logged into two different Discord accounts - one on the website and one in your app. Log out of the website and try again or try again from the website.');
					return;
				}
				
				///
				/// Fetch Discord User/Connections
				///
				util.makeRequest(https, {
					method: 'GET',
					hostname: 'discordapp.com',
					path: API_ENDPOINT + '/users/@me/connections',
					headers: { 'authorization': 'Bearer ' + json.access_token },
				}, null, async (body_connections) =>
				{
					const json_connections = JSON.parse(body_connections);
					if(json_connections.hasOwnProperty('code'))
					{
						res.end('<b>Error</b><br>' + json_connections.message);
						return;
					}

					let _steamid = null;
					for(const c of json_connections)
					{
						if(c.type == 'steam')
						{
							_steamid = c.id;
							break;
						}
					}

                    if (_steamid == null) {
                        GetChannelWelcome().send("**Error:**\nYour steam account does not seem to be linked to discord. Please retry the above steps");
                        res.end('<b>Error</b><br>Your steam account does not seem to be linked to discord. Please close this window and step through the instructions again');
                        return;
                    }

                    console.log('_steamid: ' + _steamid);

                    util.makeRequest(https, {
                        method: 'GET',
                        hostname: 'steamid.io',
                        path: '/lookup/' + _steamid
                    }, null, async (result) =>
                    {
                        let realid = result.split('data-steamid64').pop().slice(2, 19);
                        console.log('realid: ' + realid);

                        let sExists = await mongoUtil.findBySteam( realid );
                        if ( sExists ) {
                            console.log('SteamId (' + realid + ') already registered');
                            GetChannelWelcome().send( '**Error**: you are already registered.' );
                            res.end('Error: you are already registered.' );
                            return;
                        }

                        util.makeRequest(https, {
                            method: 'GET',
                            hostname: 'api.steampowered.com',
                            path: '/IPlayerService/GetOwnedGames/v1/?key=' + util.getToken('steam') + '&steamid=' + realid
                        }, null, async (response) =>
                        {
                            let ownCiv = false;
                            const json_res = JSON.parse(response);
                            const gameCount = json_res.response.game_count;
                            const games = json_res.response.games;
                            if (gameCount == 0) {
                                GetChannelWelcome().send("**Error:**\nYour steam account does not seem to own Civ 6. Please contact a moderator in order to finish registration.");
                                res.end('<b>Error</b><br>Your steam account does not seem to own Civ 6. Please close this page and return to Discord for further instructions.');
                                return;
                            }
                            if (!games) {
                                GetChannelWelcome().send("**Error:**\nPlease make sure your Steam games list is public:```- sign into https://steamcommunity.com/\n- click your username in the upper right corner\n- click 'View Profile'\n- click 'Edit Profile'\n- click 'My Privacy Settings'\n- change 'Game details' from 'Friends Only' to 'Public'```After doing the above steps, try to `.register` again. If you continue to see this message, please contact a moderator in order to finish registration.");
                                res.end('<b>Error</b><br>Your steam account\'s games list does not seem to be set to public. Please close this page and return to Discord for further instructions.');
                                return;
                            }
                            for (const game of games) {
                                if (game.appid == 289070) {
                                    ownCiv = true;
                                }
                            }
                            if (!ownCiv) {
                                GetChannelWelcome().send("**Error:** your steam account does not seem to own Civ 6. Please contact a moderator.");
                                res.end('<b>Error</b><br>Your steam account does not seem to own Civ 6. Please close this page and return to Discord for further instructions');
                                return;
                            }

					        const user = util.client.users.get(json_me.id);
					        const member = GetChannelSteamLog().guild.member(user);
					        if(member == null)
					        {
					        	res.end('<b>Error</b><br>Your cached discord user was not found! Please contact a moderator.');
                                GetChannelWelcome().send('**Error**: discord user not found. Please contact a moderator.');
					        	return;
					        }
					        
					        try
					        {
                                let ret = await mongoUtil.registerPlayer(json_me.id, realid, member.user.username, member.displayName);
                                if (!ret) {
                                    console.log('could not register new player:\n\tdiscord:\t' + json_me.id + '\n\tsteam:\t' + realid);
                                    GetChannelWelcome().send( '**Error**: an error occured during registration. Please contact a moderator.' );
                                    res.end( 'Error: an error occured during registration. Please contact a moderator.' );
                                    return;
                                }

					        	// Finish up HTTP reply
					        	res.write('<b>Success</b><br>You may close this window and return to Discord');
					        	
                                const embed = new Discord.RichEmbed()
                                    .setColor('#0099ff')
                                    .setTitle(user.tag + ' Registered')
                                    .setDescription('https://steamcommunity.com/profiles/' + realid)
                                    .setThumbnail(user.avatarURL)
                                    .addField('Tag', member + '\n\n**Username**\n' + member.user.username, true)
                                    .addField('Id', member.id + '\n\n**Display Name**\n' + member.displayName, true)
                                    //.setImage(user.avatarURL)
                                    .setTimestamp();
                        
                                GetChannelSteamLog().send(embed);
					        	GetChannelWelcome().send('<@' + json_me.id + '>, you have been registered successfully.\nPlease read <#550251325724557322> and <#553224175398158346>.');
                                member.addRoles([ranked, chieftain]);
					        }
					        catch( err )
					        {
					        	res.write('<b>Debug</b>' + body_connections);
					        	res.write('<b>Error</b><br>' + err);
					        }
					        
					        res.end();
                        });
                    });
				});
			});
		});
	}
});

function getParams(req)
{
	let q = req.url.split('?'), result={};
	if(q.length >= 2)
	{
		q[1].split('&').forEach((item)=>
		{
			const index = item.indexOf('=');
			if(index == -1) result[item] = '';
			else result[item.substr(0, index)] = item.substr(index+1);
		});
	}
	return result;
}

class RegisterModule
{
	constructor()
	{
		util.client.on('message', message => { this.handle(message); });
		util.client.on('ready', () => { srv.listen(80, () => { console.log('http listening'); }); });
	}
	
	testRequest(fail)
	{
		return new Promise( (resolve,reject) =>
		{
			if(fail) reject('failed');
			else resolve('success');
		});
	}
	
	async handle(message)
	{
		const content = message.content;
		if ( message.author.bot ) return;
		
		if( content.startsWith(cmd_register) )
		{
            const target = message.author;

            let dExists = await mongoUtil.findByDiscord( target.id );
            if ( dExists ) {
                console.log(target.username + ' (' + target.id + ') already registered');
                message.reply( '\n**Error**: you are already registered.' );
                return;
            }
            else {
                const state_string = JSON.stringify({ user: target.id, chan: message.channel.id });
                const link = 'https://discordapp.com/oauth2/authorize?response_type=code&client_id=482621155136765973&scope=identify%20connections&redirect_uri=http%3A%2F%2F34.216.163.75&state=' + state_string;
                //const link = 'https://discordapp.com/api/oauth2/authorize?client_id=535317412002922496&redirect_uri=http%3A%2F%2Fcpl.gg&response_type=code&scope=connections%20identify&state=' + state_string;
                const embed = new Discord.RichEmbed()
                    .setColor('#0099ff')
                    .setTitle('Authorize Bot')
                    .setDescription('The CPL Bot needs authorization in order to search your Discord profile for your linked Steam account. It uses Steam accounts to verify unique users.\n\n[Click here to authorize](' + link + ')');
                message.reply(embed).then( msg => { msg.delete(20000) } );
                message.channel.send("If you don't see the link, please turn on 'Link Preview' in your 'Text & Images' Discord Settings, then try aggain.").then( msg => { msg.delete(20000) } );

                //message.reply('please click on the following link, then authorize the bot:\n<https://discordapp.com/oauth2/authorize?response_type=code&client_id=482621155136765973&scope=identify%20connections&redirect_uri=http%3A%2F%2F34.216.163.75&state=' + state_string + ">").then(msg => { msg.delete(20000) });
            }
        }
        else if ( content.startsWith('.check ') && message.member.roles.has(moderatorId) )
        {
            message.delete();
            let steamlink = message.content.split(' ').pop();
            let steamid = await steam.resolve(steamlink);

            util.makeRequest(https, {
                method: 'GET',
                hostname: 'steamid.io',
                path: '/lookup/' + steamid
            }, null, async (response) =>
            {
                let realid = response.split('data-steamid64').pop().slice(2, 19);
                util.makeRequest(https, {
                    method: 'GET',
                    hostname: 'api.steampowered.com',
                    path: '/IPlayerService/IsPlayingSharedGame/v0001/?key=' + util.getToken('steam') + '&steamid=' + realid + '&appid_playing=289070'
                }, null, async (res) =>
                {
                    const json_res = JSON.parse(res);
                    const steamid = json_res.response.lender_steamid;
                    if (steamid == 0) {
                        message.reply("if they have the game open now, it's not a shared copy");
                    }
                    else {
                        message.reply("\nLender's steam link: <https://steamcommunity.com/profiles/" + steamid + ">");
                    }
                });
            });
        }
		else if( content.startsWith(cmd_forceregister) && message.member.roles.has(vhaId) )
        {
            message.delete();
            if ( message.mentions.members.size == 0 )
            {
                    message.channel.send('**Error:**' + cmd_forceregister + ' requires that one user be tagged').then( msg => {
                        msg.delete(20000);
                    });
                    return;
            }
		    else if ( message.mentions.members.size > 1 )
            {
                    message.channel.send('**Error:**' + cmd_forceregister + ' can only use one @DiscordName at a time').then( msg => {
                        msg.delete(20000);
                    });
                    return;
            }

            const target = message.mentions.members.values().next().value;

            let error = errorHandler.create();
            try
            {
                console.log(message.content); 
                let steamlink = message.content.split(' ').pop();
                let steamid = await steam.resolve(steamlink);
                console.log('steamID64:' + steamid); 

                util.makeRequest(https, {
                    method: 'GET',
                    hostname: 'steamid.io',
                    path: '/lookup/' + steamid
                }, null, async (response) =>
                {
                    let realid = response.split('data-steamid64').pop().slice(2, 19);
                    console.log('real steamID64:' + realid); 

                    let dExists = await mongoUtil.findByDiscord( target.id );
                    if ( dExists ) {
                        console.log(target.displayName + ' (' + target.id + ') discord already registered');
                        message.reply( '\n**Error**: ' + target + ' is already registered.' ).then( msg => {
                            msg.delete(20000);
                        });
                        return;
                    }

                    let sExists = await mongoUtil.findBySteam( realid );
                    if ( sExists ) {
                        console.log(target.displayName + ' (' + realid + ') steam already registered');
                        message.reply( '\n**Error**: ' + target + ' is already registered as ' + '<@' + sExists.discord_id + '>.' ).then( msg => {
                            msg.delete(20000);
                        });
                        return;
                    }

                    let ret = await mongoUtil.registerPlayer(target.id, realid, target.user.username, target.displayName);
                    if (!ret) {
                        console.log('could not register new player:\n\tdiscord:\t' + target.id + '\n\tsteam:\t' + realid);
                        message.reply( '\nAn unknown **Error** occured.' ).then( msg => {
                            msg.delete(20000);
                        });
                        return;
                    }
                    else {
                        const embed = new Discord.RichEmbed()
                            .setColor('#7A2F8F')
                            .setTitle('.forceregister by ' + message.member.user.tag)
                            .setDescription('https://steamcommunity.com/profiles/' + realid)
                            .setThumbnail(target.user.avatarURL)
                            .addField('Tag', target + '\n\n**Username**\n' + target.user.username, true)
                            .addField('Id', target.id + '\n\n**Display Name**\n' + target.displayName, true)
                            //.setImage(target.user.avatarURL)
                            .setTimestamp();
                        GetChannelSteamLog().send(embed);
                        message.channel.send(target + ', you have been registered with default stats and given the ranked role.\n\n Please read <#550251325724557322>.');
			            target.addRoles([ranked, chieftain]);
                    }
                });
            }
            catch (err)
            {
                console.log(err);
                message.channel.send("**Error**\n" + err);
            }
            return;
        }
		else if( content.startsWith('.setid') && message.member.roles.has(vhaId) ) {
            message.delete();
            if ( message.mentions.members.size == 0 ) {
                    message.channel.send(setid_usage).then( msg => {
                        msg.delete(20000);
                    });
                    return;
            }
		    else if ( message.mentions.members.size > 1 ) {
                    message.channel.send('**Error:** too many members were tagged:\n' + setid_usage).then( msg => {
                        msg.delete(20000);
                    });
                    return;
            }

            const target = message.mentions.members.values().next().value;

            try
            {
                console.log(message.content);
                let steamlink = message.content.split(' ').pop();
                let steamid = await steam.resolve(steamlink);
                console.log('steamID64:' + steamid);

                util.makeRequest(https, {
                    method: 'GET',
                    hostname: 'steamid.io',
                    path: '/lookup/' + steamid
                }, null, async (response) =>
                {
                    let realid = response.split('data-steamid64').pop().slice(2, 19);
                    console.log('real steamID64:' + realid);

                    let dExists = await mongoUtil.findByDiscord( target.id );
                    if ( dExists ) {
                        console.log(target.displayName + ' (' + target.id + ') discord already registered');
                        message.reply( '\n**Error**: ' + target + ' is already registered.' ).then( msg => {
                            msg.delete(20000);
                        });
                        return;
                    }

                    let sExists = await mongoUtil.findBySteam( realid );
                    if ( !sExists ) {
                        console.log('could not swap the ID of player:\n\tdiscord:\t' + target.id + '\n\tsteam:\t' + realid);
                        message.reply( '\n**Error**: ' + target + '\'s steam is not currently registered. Have them register normally.' ).then( msg => {
                            msg.delete(20000);
                        });
                        return;
                    }

                    let ret = await mongoUtil.changeDiscord( realid, target.id, target.user.username, target.displayName );
                    if (!ret) {
                        message.reply( '\n**Error**: ' + target + '\'s steam is not currently registered. Have them register normally.' ).then( msg => {
                            msg.delete(20000);
                        });
                        return;
                    }

                    const embed = new Discord.RichEmbed()
                        .setColor('#A62019')
                        .setTitle('.setid by ' + message.member.user.tag)
                        .setDescription('https://steamcommunity.com/profiles/' + realid)
                        .setThumbnail(target.user.avatarURL)
                        .addField('New Tag', target + '\n\n**New Id**\n' + target.id + '\n\n**New Username**\n' + target.user.username + '\n\n**New Display Name**\n' + target.displayName, true)
                        .addField('Old Tag', '<@' + sExists.discord_id + '>\n\n**Old Id**\n' + sExists.discord_id + '\n\n**Old Username**\n' + sExists.user_name + '\n\n**Old Display Name**\n' + sExists.display_name, true)
                        //.setImage(target.user.avatarURL)
                        .setTimestamp();
                    GetChannelSteamLog().send(embed);
                    message.channel.send(target + ' is now registered to steamId == `' + realid + '`.\n<@' + sExists.discord_id + '> has had their ranked role removed and been kicked from the server.').then( msg => { msg.delete(20000); });

                    const reason = 'new discord: ' + target.id;
                    const oldUser = util.client.users.get(sExists.discord_id);
                    if ( oldUser ) {
                        const oldMember = GetChannelSteamLog().guild.member(oldUser);
                        if ( oldMember ) {
                            await oldMember.removeRole(ranked, reason);
                            await oldMember.kick(reason);
                        }
                    }

                    target.addRoles([ranked, chieftain]);
                });
            }
            catch (err)
            {
                console.log(err);
                message.channel.send("**Error**\n" + err);
            }
        }
	}
}

module.exports = new RegisterModule();
