const Discord = require('discord.js')
const bot = new Discord.Client()
const fs = require('fs') 

const specialistId = '438521431698178058'
const voteChannel  = '662798569979248654'

bot.on('raw', packet => {
    if (packet.t === 'MESSAGE_REACTION_ADD') {
        const channel = bot.channels.get(packet.d.channel_id);
        // There's no need to emit if the message is cached, because the event will fire anyway
        if (channel.messages.has(packet.d.message_id)) return;

        channel.fetchMessage(packet.d.message_id).then(message => {
            const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
            const reaction = message.reactions.get(emoji);
            if (reaction) reaction.users.set(packet.d.user_id, bot.users.get(packet.d.user_id));
            bot.emit('messageReactionAdd', reaction, bot.users.get(packet.d.user_id));
        })
    }
})

bot.on('messageReactionAdd', (reaction, user) => {
    const channel = reaction.message.channel
    const member  = channel.guild.member(user)
    if ( isVoteChannel( channel ) && !isSpecialist( member ) ) {
        reaction.remove( user );
    }
})

function isSpecialist(member) {
    return member.roles.has( specialistId )
}

function isVoteChannel(channel) {
    return channel.id == voteChannel
}

fs.readFile('/home/codenaugh/bots/data/tokens.json', (err, data) => { 
    if (err) throw err; 

    const tokens = JSON.parse(data);
    bot.login(tokens.bbg);
})

bot.once('ready', () => {
    console.log('BBG Bot ready!')
})

bot.on("error", (e) => {
    console.error(e)
})

process.on("uncaughtException", (err) => {
    console.error(err)
})
