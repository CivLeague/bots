const Discord = require( 'discord.js' )
const bot = new Discord.Client()
const mongo = require( '/home/codenaugh/bots/util/mongo' )
const fs = require( 'fs' ) 

const usage     = '`Usage: .quit | .suspend | .unsuspend | .addtier | .rmtier | .adddays | .rmdays`'
const quit      = '`Usage: .quit <member>`'
const suspend   = '`Usage: .suspend <member> <minor | moderate | major> [reason]`'
const unsuspend = '`Usage: .unsuspend <member> [reason]`'
const addtier   = '`Usage: .addtier <member> <minor | moderate | major> [reason]`'
const rmtier    = '`Usage: .rmtier <member> <minor | moderate | major> [reason]`'
const adddays   = '`Usage: .adddays <member> <number> [reason]`'
const rmdays    = '`Usage: .rmdays <member> <number> [reason]`'

const botTesting   = '351127558143868928'
const suspended    = '291753513749577734'
const quitterId    = '292212681887186944'
const suspendedId  = '294099361053540353'
const moderatorId  = '291753249361625089'

function isQuitter( member ) {
    return member.roles.has( quitterId )
}

function isSuspended( member ) {
    return member.roles.has( suspendedId )
}

function isModerator( member ) {
    return member.roles.has( moderatorId )
}

function isBotTestingChannel( channel ) {
    return channel.id == botTesting
}

function isSuspendedChannel( channel ) {
    return channel.id == suspended
}

bot.once('ready', async() => {
    mongo.connect( 'banbot' )
    console.log( 'Ban Bot ready' )
    setInterval( () => {
        //mongo.checkSuspensions()
    }, 60000 )
})

bot.on('message', async ( message ) => {
    if ( message.author.bot ) return
    if ( !isSuspendedChannel( message.channel ) && !isBotTestingChannel( message.channel ) ) return
    if ( !isModerator( message.member ) ) return

    let content = message.content

    if ( content.startsWith( '.quit' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        if ( !target ) {
            message.channel.send( quit ).then( msg => { msg.delete( 30000 ) } )
        }

        let player = await mongo.quit( target.id )
        let msg = '\n**TIER ' + player.tier + ' QUIT:** '
        if ( player.tier == 1 )
            msg += '1 day suspension. '
        else if ( player.tier == 2 )
            msg += '3 day suspension. '
        else if ( player.tier == 3 )
            msg += '7 day suspension. '
        else if ( player.tier == 4 )
            msg += '14 day suspension. '
        else if ( player.tier == 5 )
            msg += '21 day suspension. '
        else if ( player.tier == 6 )
            msg += '30 day suspension. '
        else if ( player.tier > 6 )
            msg += 'Banned from server. '
        if ( target.roles.has( quitterId ) && player.tier < 7 )
            msg += '3 extra days for having quitter tag. '
        if ( target.roles.has( suspendedId ) && player.tier < 7 )
            msg += 'This is in addition to your current suspension. '
        if ( player.tier < 7 ) {
            msg += '\n**ENDS:** ' + player.ends + '.'
            message.channel.send( target + msg ).then( ( msg ) => { 
                target.user.send( 'You\'ve been suspended in the CPL discord server\n' + msg.url )
            })
            if ( !target.roles.has( suspendedId ) )
                target.addRole( suspendedId )
            if ( !target.roles.has( quitterId ) )
                target.addRole( quitterId )
        }
        else { 
            target.user.send( 'You\'ve been banned in the CPL discord server.' )
            target.ban( 'Tier 7 quit' )
        }
    }
    else if ( content.startsWith( '.suspend' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        let type = content.split(' ')[2]
        let reason = content.split(' ').slice(3).join(' ')
        if ( !target || type != 'minor' || type != 'moderate' || type != 'major' ) {
            message.channel.send( suspend ).then( msg => { msg.delete( 30000 ) } )
        }
        let player = await mongo.suspend( target.id, type )
        if ( !target.roles.has( suspendedId ) )
            target.addRole( suspendedId )
        let msg = '\n**TIER ' + player.tier + ' ' + type.toUppercase() + ' INFRACTION**'
            if ( reason.length > 0 )
                msg += '\n**REASON:** ' + reason + '.'
            msg += '\n**ENDS:** ' + player.ends + '.'
        message.channel.send( target + msg ).then( ( msg ) => { 
            target.user.send( 'You\'ve been suspended in the CPL discord server\n' + msg.url )
        })
    }
    else if ( content.startsWith( '.unsuspend' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        if ( !target ) {
            message.channel.send( unsuspend ).then( msg => { msg.delete( 30000 ) } )
        }
        mongo.unsuspend( target )
    }
    else if ( content.startsWith( '.addtier' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        let type = content.split(' ').pop()
        if ( !target || type != 'minor' || type != 'moderate' || type != 'major' ) {
            message.channel.send( addtier ).then( msg => { msg.delete( 30000 ) } )
        }
    }
    else if ( content.startsWith( '.rmtier' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        let type = content.split(' ').pop()
        if ( !target || type != 'minor' || type != 'moderate' || type != 'major' ) {
            message.channel.send( rmtier ).then( msg => { msg.delete( 30000 ) } )
        }
    }
    else if ( content.startsWith( '.adddays' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        let days = Number( content.split(' ').pop() )
        if ( !target || !days || Number.isNaN( days ) ) {
            message.channel.send( adddays ).then( msg => { msg.delete( 30000 ) } )
        }
    }
    else if ( content.startsWith( '.rmdays' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        let days = Number( content.split(' ').pop() )
        if ( !target || !days || Number.isNaN( days ) ) {
            message.channel.send( adddays ).then( msg => { msg.delete( 30000 ) } )
        }
    }
    else if ( content.startsWith( '.banbot' ) ) {
        message.delete()
        message.channel.send( usage ).then( msg => { msg.delete( 30000 ) } )
    }
})

fs.readFile( '/home/codenaugh/bots/data/tokens.json', ( err, data ) => { 
    if ( err ) throw err; 

    const tokens = JSON.parse( data );
    bot.login( tokens.ban );
})

bot.on( "error", ( err ) => {
    console.error( err )
})

process.on( "uncaughtException", ( err ) => {
    console.error( err )
})
