const util = require('/home/codenaugh/bots/util/util');
const Discord = require('discord.js');
const mongoUtil = require('/home/codenaugh/bots/util/mongo');

var moderatorId = '291753249361625089';

function GetChannelSubLog() { return util.getChannel(371831587001729036); }
function GetChannelBotCommands() { return util.getChannel(304782408526594049); }

class SubBotModule
{
    constructor()
    {
        util.client.on('message', async (message) => {
            if (message.channel.id == GetChannelBotCommands().id) {
                if (message.content == '.mysubs') {
                    let msg = '';
                    let pSubs = await mongoUtil.getSubCount(message.author.id)
                    if ( pSubs && pSubs.count > 0 ) {
                        msg += 'you have subbed ' + pSubs.count + ' times this month. Beware that each one after the 2nd sub will incur a 3 day suspension. Your sub count will be reset at 00:00 UTC on the 3rd of the month.'
                    }
                    else {
                        msg += 'no subs have been logged for you this month.'
                    }
                    message.reply(msg)
                }
                return;
            }

            if (message.channel.id != GetChannelSubLog().id)
                return;

            if (message.content == '.reportsubs') {
                let msg = '';
                mongoUtil.getSubs().then( subs => {
                    console.log(subs);
                    for (let sub of subs) {
                        if ( sub.count > 2 ) {
                            msg += "\n[**" + sub.count + "**, <@"+sub._id+">]";
                        }
                    }
                    if (msg == '')
                        msg = "no one has subbed more than twice since the last reset.";
                    message.reply(msg);
                    console.log(msg);
                });
            }

            if (message.content == ".resetsubs") {
                mongoUtil.resetSubs();
                message.reply("sub stats have been reset.");
            }

            if (message.content.split(' ').pop() == 'subbed') {
                let subId = message.mentions.users.first().id;
                mongoUtil.getSubCount(subId).then( result => {
                    if (result) {
                        mongoUtil.setSubCount(subId, result.count + 1);
                    }
                    else {
                        mongoUtil.setSubCount(subId, 1);
                    }
                });
            }
        });
        /*
        util.client.on('message', async message => {
            if(message.author.bot) return;
            if(message.channel.type === "dm") return;
            
            let prefix = ".";
            let messageArray = message.content.split(" ");
            let cmd = messageArray[0];
            let args = messageArray.slice(1);
            
            if( cmd == "!reportsub" || cmd == ".reportsub" && message.member.roles.has(moderatorId) ) {
                let rUser = message.guild.member(message.mentions.users.first() || message.guildes.members.get(args[0]));
                if(!rUser)  return message.channel.send("Couldn't find user.");
                let reason = args.join(" ").slice(22);
                let reportEmbed = new Discord.RichEmbed()
                
                .setDescription("Reports")
                .setColor("#4256f4")
                .addField("Reported User", `${rUser} with ID: ${rUser.id}`)
                .addField("Reported By", `${message.author} with ID: ${message.author.id}`)
                .addField("Channel", message.channel)
                .addField("Time", message.createdAt)
                .addField("Reason", reason);
                
                GetChannelSubLog().send(reportEmbed);
                message.delete();
            }
        })
        */
    }
}

module.exports = new SubBotModule();
