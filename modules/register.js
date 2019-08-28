const util = require('../util/util');
const mongoUtil = require('../util/mongo');
const errorHandler = require('../util/errormessage');

const Discord = require('discord.js');
const SteamAPI = require('steamapi');
const steam = new SteamAPI(util.getToken('steam'));


const cmd_register = '.register';
const cmd_forceregister = '.forceregister';

function GetChannelProfileProof() { return util.getChannel(342377106971295744); }
function GetChannelSteamProfiles() { return util.getChannel(615805208848498688); }
function GetChannelWelcome() { return util.getChannel(368928122219003904); }
const moderatorId = '291753249361625089';
const ranked = '401892311975591946';
const glicko = '615780983047979008';
const chieftain = '542774298180452377';

const http = require('http');
const https = require('https');

var reregister = false;

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

                        let sExists = await mongoUtil.findSteam( realid );
                        if ( sExists ) {
                            console.log('SteamId (' + realid + ') already registered');
                            console.log('username:\t' + member.user.username + '\ndisplayName:\t' + member.displayName);
                            message.reply( '\n**Error**: you are already registered.' );
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
                                res.end('<b>Error</b><br>Your steam account does not seem to own Civ 6. Please close this page and return to Discord for further instructions');
                                GetChannelWelcome().send("**Error:** your steam account does not seem to own Civ 6. Please contact a moderator.");
                                return;
                            }

					        const user = util.client.users.get(json_me.id);
					        const member = GetChannelSteamProfiles().guild.member(user);
					        if(member == null)
					        {
					        	res.end('<b>Error</b><br>Your cached discord user was not found! Please contact a moderator.');
                                GetChannelWelcome().send('**Error**: discord user not found. Please contact a moderator.');
					        	return;
					        }
					        
					        try
					        {
                                if (!reregister) {
					        	    let response = await util.makeRGRequest('register.php', {
					        	    	discordid: json_me.id,
					        	    	steamid: realid,
					        	    	name: json_me.username
					        	    });
                                }
					        	
					        	// Finish up HTTP reply
					        	res.write('<b>Success</b><br>You may close this window and return to Discord');
					        	
                                let ret = await mongoUtil.registerPlayer(json_me.id, realid, member.user.username, member.displayName);
                                if (!ret) {
                                    console.log('could not register new player:\n\tdiscord:\t' + json_me.id + '\n\tsteam:\t' + realid);
                                    GetChannelWelcome().send( '\n**Error**: an error occured during registration. Please contact a moderator.' );
                                    return;
                                }

					        	GetChannelSteamProfiles().send('<@' + json_me.id + '> <https://steamcommunity.com/profiles/' + realid + '>');
                                if (reregister) {
					        	    GetChannelWelcome().send('<@' + json_me.id + '>, you have been re-registered successfully.');
                                    member.addRole(glicko);
                                }
                                else {
					        	    GetChannelWelcome().send('<@' + json_me.id + '>, you have been registered successfully.\nPlease read <#550251325724557322> and <#553224175398158346>.');
                                    member.addRole(glicko);
                                    member.addRoles([ranked, chieftain]);
                                }
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
            reregister = false;
			const target = message.author;
			
			let error = errorHandler.create();
			try
			{
				let registered = await util.makeRGRequest('toimport.php', {[target.id]: ''});
				if(registered.length == 0)
				{
					message.channel.send(target + ' is already registered.');
				}
				else
				{
					const state_string = JSON.stringify({ user: target.id, chan: message.channel.id });
					message.reply('please click on the following link, then authorize the bot:\n<https://discordapp.com/oauth2/authorize?response_type=code&client_id=482621155136765973&scope=identify%20connections&redirect_uri=http%3A%2F%2F34.216.163.75&state=' + state_string + ">").then(msg => { msg.delete(20000) });
				}
			}
			catch(err)
			{
                console.log(err);
				message.channel.send(err);
			}
			
			return;
		}
        else if ( content.startsWith('.reregister') ) {
            reregister = true;
            const target = message.author;
            let dExists = await mongoUtil.findDiscord( target.id );
            if ( dExists ) {
                console.log(target.username + ' (' + target.id + ') already registered');
                message.reply( '\n**Error**: you are already registered.' );
                return;
            }
            else {
                const state_string = JSON.stringify({ user: target.id, chan: message.channel.id });
                message.reply('please click on the following link, then authorize the bot:\n<https://discordapp.com/oauth2/authorize?response_type=code&client_id=482621155136765973&scope=identify%20connections&redirect_uri=http%3A%2F%2F34.216.163.75&state=' + state_string + ">").then(msg => { msg.delete(20000) });
            }
        }
        else if ( content.startsWith('.check') && message.member.roles.has(moderatorId) )
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
		else if( content.startsWith(cmd_forceregister) && message.member.roles.has(moderatorId) )
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

                    let dExists = await mongoUtil.findDiscord( target.id );
                    if ( dExists ) {
                        console.log(target.displayName + ' (' + target.id + ') discord already registered');
                        message.reply( '\n**Error**: ' + target + ' is already registered.' ).then( msg => {
                            msg.delete(20000);
                        });
                    }

                    let sExists = await mongoUtil.findSteam( realid );
                    if ( sExists ) {
                        console.log(target.displayName + ' (' + realid + ') steam already registered');
                        message.reply( '\n**Error**: ' + target + ' is already registered.' ).then( msg => {
                            msg.delete(20000);
                        });
                    }

                    let ret = await mongoUtil.registerPlayer(target.id, realid, target.user.username, target.displayName);
                    if (!ret) {
                        console.log('could not register new player:\n\tdiscord:\t' + target.id + '\n\tsteam:\t' + realid);
                    }
                    else {
                        target.addRole(glicko);
			            GetChannelSteamProfiles().send('<@' + target.id + '> <https://steamcommunity.com/profiles/' + realid + '>');
                        message.channel.send(target + ' has now been registered with default stats and has been given the glicko role.');
                    }

                    try {
                        await util.makeRGRequest('register.php', {
                            discordid: target.id,
                            steamid: realid,
                            name: target.displayName,
                            rating: 1500,
                            wins: 0,
                            losses: 0
                        });
                        message.channel.send(target + ' has now been registered with default stats and should have been given the ranked and chieftain role.');
			            GetChannelProfileProof().send('<@' + target.id + '> <https://steamcommunity.com/profiles/' + realid + '>');
                        target.addRole(glicko);
			            target.addRoles([ranked, chieftain]);
                    }
                    catch (err) {
                        console.log(err);
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
	}
}

module.exports = new RegisterModule();
