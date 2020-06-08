const Discord = require( 'discord.js' )
const bot = new Discord.Client()
const mongo = require( '/home/codenaugh/bots/util/mongo' )
const fs = require( 'fs' ) 

const usage     = 'Commands that Ban Bot can handle:\n' +
                  '_Type a command with no args to get its usage statement_\n' +
                  '`.quit | .minor | .moderate | .major | .adddays | .rmdays | .oversub | .smurf | .unsuspend`'
const quit      = '`Usage: .quit <member>`'
const minor     = '`Usage: .minor <member> [reason]`'
const moderate  = '`Usage: .moderate <member> [reason]`'
const major     = '`Usage: .major <member> [reason]`'
const adddays   = '`Usage: .adddays <member> <number> [reason]`'
const rmdays    = '`Usage: .rmdays <member> <number> [reason]`'
const oversub   = '`Usage: .oversub <member>`'
const smurf     = '`Usage: .smurf <member>`'
const unsuspend = '`Usage: .unsuspend <member> [reason]`'

const cplId        = '291751672106188800'
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
    setInterval( async() => {
        let unsuspended = await mongo.checkSuspensions()
        for ( player of unsuspended ) {
            if ( !player.suspended ) {
                let member = await bot.guilds.get( cplId ).fetchMember( player._id )

                if ( member && member.roles.has( suspendedId ) )
                    await member.removeRole( suspendedId )
                else if ( !member )
                    mongo.unsuspendDue( player._id )
                else return

                let msg = '<@' + player._id + '> unsuspended.'
                bot.guilds.get( cplId ).channels.get( suspended ).send( msg )
            }
        }
    }, 60000 )
})

bot.on('guildMemberAdd', async ( member ) => {
    if ( await mongo.isBanDue( member.id ) ) {
        await member.user.send( 'You\'ve been banned from the CPL Discord server. Please email civplayersleagues@gmail.com if you feel this is in error.\n' )
        await member.ban()
    }
    else if ( await mongo.isUnsuspendDue( member.id ) ) {
        mongo.isSuspensionDue( member.id )  // delete from suspensions due
        if ( member.roles.has( suspendedId ) )
            await member.removeRole( suspendedId )
    }
    else if ( await mongo.isSuspensionDue( member.id ) ) {
        if ( !member.roles.has( suspendedId ) ) {
            await member.addRole( suspendedId )
            await member.user.send( 'You\'ve been suspended in the CPL Discord server. Check #suspended_players for more info\n' )
        }
    }
})

bot.on('message', async ( message ) => {
    if ( message.author.bot ) return
    if ( !isSuspendedChannel( message.channel ) && !isBotTestingChannel( message.channel ) ) return
    if ( !isModerator( message.member ) ) return

    let content = message.content

    if ( content.startsWith( '.quit' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        let id = target ? target.id : null
        if ( !target ) {
            if ( content.split( ' ' ).length == 2 ) {
                target = content.split(' ').pop()
                id  = target.replace( /\D*/g, '' )
                var leftServer = true
            }
        }
        if ( !target || !id ) {
            message.channel.send( quit ).then( msg => { msg.delete( 30000 ) } )
            return
        }

        let player = await mongo.quit( id )
        let msg = '\n**[ TIER ' + player.tier + ' QUIT INFRACTION ]**\n**RESULT:** '
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
        else if ( player.tier > 6 ) {
            let displayName = leftServer ? await mongo.getDisplayName( id ) : target.displayName
            msg += displayName + ' banned from server. '
        }

        if ( player.tier < 7 ) {
            if ( !leftServer ) {
                if ( target.roles.has( suspendedId ) )
                    msg += 'This is in addition to your current suspension. '
                else
                    target.addRole( suspendedId )
            }
            msg += '\n**ENDS:** ' + player.ends + '.'
            message.channel.send( target + msg ).then( ( msg ) => { 
                if ( !leftServer )
                    target.user.send( 'You\'ve been suspended in the CPL discord server\n' + msg.url )
                else mongo.suspensionDue( id )
            })
        }
        else {
            message.channel.send( target + msg ).then( ( msg ) => {
                if ( !leftServer ) {
                    target.user.send( 'You\'ve been banned in the CPL Discord server. If you believe this to be an error, please send an email to civplayersleagues@gmail.com' ).then( () => {
                        target.ban( 'Tier 7 quit' )
                    })
                }
                else mongo.banDue( id )
            })
        }
    }
    else if ( content.startsWith( '.minor' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        let id = target ? target.id : null
        if ( !target ) {
            if ( content.split( ' ' ).length > 1 ) {
                target = content.split(' ')[1]
                id  = target.replace( /\D*/g, '' )
                var leftServer = true
            }
        }
        if ( !target || !id ) {
            message.channel.send( minor ).then( msg => { msg.delete( 30000 ) } )
            return
        }
        let reason = content.split(' ').slice(2).join(' ')

        let player = await mongo.minor( id )
        let msg = '\n**[ TIER ' + player.tier + ' MINOR INFRACTION ]**'
        if ( reason.length > 0 )
            msg += '\n**REASON:** ' + reason + '.'
        if ( player.tier == 1 )
            msg += '\n**RESULT:** Warning.'
        else if ( player.tier == 2 )
            msg += '\n**RESULT:** 1 day suspension.'
        else if ( player.tier == 3 )
            msg += '\n**RESULT:** 2 day suspension.'
        else if ( player.tier == 4 )
            msg += '\n**RESULT:** 3 day suspension.'
        else if ( player.tier == 5 )
            msg += '\n**RESULT:** 5 day suspension.'
        else if ( player.tier >= 6 )
            msg += '\n**RESULT:** 7 day suspension.'
        if ( !leftServer && target.roles.has( suspendedId ) && player.tier > 1 )
            msg += ' This is in addition to your current suspension.'
        if ( player.tier > 1 )
            msg += '\n**ENDS:** ' + player.ends + '.'
        message.channel.send( target + msg ).then( ( msg ) => { 
            if ( player.tier > 1 ) {
                if ( !leftServer ) {
                    target.user.send( 'You\'ve been suspended in the CPL Discord server\n' + msg.url )
                    if ( !target.roles.has( suspendedId ) )
                        target.addRole( suspendedId )
                }
                else mongo.suspensionDue( id )
            }
            else {
                if ( !leftServer )
                    target.user.send( 'You\'ve been given a warning in the CPL Discord server\n' + msg.url )
            }
        })
    }
    else if ( content.startsWith( '.moderate' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        let id = target ? target.id : null
        if ( !target ) {
            if ( content.split( ' ' ).length > 1 ) {
                target = content.split(' ')[1]
                id  = target.replace( /\D*/g, '' )
                var leftServer = true
            }
        }
        if ( !target || !id ) {
            message.channel.send( moderate ).then( msg => { msg.delete( 30000 ) } )
            return
        }
        let reason = content.split(' ').slice(2).join(' ')

        let player = await mongo.moderate( id )
        let msg = '\n**[ TIER ' + player.tier + ' MODERATE INFRACTION ]**'
        if ( reason.length > 0 )
            msg += '\n**REASON:** ' + reason + '.'
        if ( player.tier == 1 )
            msg += '\n**RESULT:** 3 day suspension.'
        else if ( player.tier == 2 )
            msg += '\n**RESULT:** 5 day suspension.'
        else if ( player.tier == 3 )
            msg += '\n**RESULT:** 7 day suspension.'
        else if ( player.tier == 4 )
            msg += '\n**RESULT:** 10 day suspension.'
        else if ( player.tier == 5 )
            msg += '\n**RESULT:** 14 day suspension.'
        else if ( player.tier >= 6 )
            msg += '\n**RESULT:** 21 day suspension.'

        if ( !leftServer ) {
            if ( target.roles.has( suspendedId ) )
                msg += ' This is in addition to your current suspension.'
            else target.addRole( suspendedId )
            msg += '\n**ENDS:** ' + player.ends + '.'
            message.channel.send( target + msg ).then( ( msg ) => {
                target.user.send( 'You\'ve been suspended in the CPL Discord server\n' + msg.url )
            })
        }
        else {
            msg += '\n**ENDS:** ' + player.ends + '.'
            message.channel.send( target + msg )
            mongo.suspensionDue( id )
        }
    }
    else if ( content.startsWith( '.major' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        let id = target ? target.id : null
        if ( !target ) {
            if ( content.split( ' ' ).length > 1 ) {
                target = content.split(' ')[1]
                id  = target.replace( /\D*/g, '' )
                var leftServer = true
            }
        }
        if ( !target || !id ) {
            message.channel.send( major ).then( msg => { msg.delete( 30000 ) } )
            return
        }
        let reason = content.split(' ').slice(2).join(' ')

        let player = await mongo.major( id )
        let msg = '\n**[ TIER ' + player.tier + ' MAJOR INFRACTION ]**'
        if ( reason.length > 0 )
            msg += '\n**REASON:** ' + reason + '.'
        if ( player.tier == 1 )
            msg += '\n**RESULT:** 7 day suspension.'
        else if ( player.tier == 2 )
            msg += '\n**RESULT:** 14 day suspension.'
        else if ( player.tier == 3 )
            msg += '\n**RESULT:** 30 day suspension.'
        else if ( player.tier == 4 )
            msg += '\n**RESULT:** 60 day suspension.'
        else if ( player.tier == 5 )
            msg += '\n**RESULT:** 90 day suspension.'
        else if ( player.tier >= 6 )
            msg += '\n**RESULT:** ' + target.displayName + ' banned from server. '
        if ( !leftServer && target.roles.has( suspendedId ) && player.tier < 6 )
            msg += ' This is in addition to your current suspension.'
        if ( player.tier < 6 )
            msg += '\n**ENDS:** ' + player.ends + '.'

        message.channel.send( target + msg ).then( ( msg ) => {
            if ( player.tier < 6 ) {
                if ( !leftServer ) {
                    target.user.send( 'You\'ve been suspended in the CPL Discord server\n' + msg.url )
                    if ( !target.roles.has( suspendedId ) )
                        target.addRole( suspendedId )
                }
                else mongo.suspensionDue( id )
            }
            else {
                if ( !leftServer ) {
                    target.user.send( 'You\'ve been banned in the CPL Discord server. If you believe this to be an error, please send an email to civplayersleagues@gmail.com' )
                    target.ban( 'Tier 6 major' )
                }
                else mongo.banDue( id )
            }
        })
    }
    else if ( content.startsWith( '.adddays' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        if ( !target ) {
            message.channel.send( adddays ).then( msg => { msg.delete( 30000 ) } )
            return
        }
        let reason = message.content.split(' ').slice(3).join(' ')
        let num = message.content.split(' ')[2]
        if ( isNaN( num ) ) {
            message.channel.send( adddays ).then( msg => { msg.delete( 30000 ) } )
            return
        }
        let ends = await mongo.addDays( target.id, num )
        let msg = '\n' + num + ' days have been added to your suspension.'
        if ( reason.length > 0 )
            msg += '\n**REASON:** ' + reason + '.'
        msg += '\n**ENDS:** ' + ends + '.'
        message.channel.send( target + msg ).then( async ( msg ) => {
            await target.user.send( 'Your CPL suspension has been modified\n' + msg.url )
            if ( !target.roles.has( suspendedId ) )
                await target.addRole( suspendedId )
        })
    }
    else if ( content.startsWith( '.rmdays' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        if ( !target ) {
            message.channel.send( adddays ).then( msg => { msg.delete( 30000 ) } )
            return
        }
        let reason = message.content.split(' ').slice(3).join(' ')
        let num = message.content.split(' ')[2]
        if ( isNaN( num ) ) {
            message.channel.send( adddays ).then( msg => { msg.delete( 30000 ) } )
            return
        }
        let ends = await mongo.rmDays( target.id, num )
        let msg = '\n' + num + ' days have been removed from your suspension.'
        if ( reason.length > 0 )
            msg += '\n**REASON:** ' + reason + '.'
        msg += '\n**ENDS:** ' + ends + '.'
        message.channel.send( target + msg ).then( ( msg ) => {
            target.user.send( 'Your CPL suspension has been modified\n' + msg.url )
        })
    }
    else if ( content.startsWith( '.oversub' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        let id = target ? target.id : null
        if ( !target ) {
            if ( content.split( ' ' ).length == 2 ) {
                target = content.split(' ').pop()
                id  = target.replace( /\D*/g, '' )
                var leftServer = true
            }
        }
        if ( !target || !id ) {
            message.channel.send( oversub ).then( msg => { msg.delete( 30000 ) } )
            return
        }
        let ends = await mongo.subSuspension( id )
        let msg = '\n**[ EXCESSIVE SUB INFRACTION ]**'
        msg += '\n**RESULT:** Each sub after the 2nd in a month is a 3 day suspension.'
        if ( !leftServer ) {
            if ( target.roles.has( suspendedId ) )
                msg += ' This is in addition to your current suspension.'
            else
                target.addRole( suspendedId )
        }
        msg += '\n**ENDS:** ' + ends + '.'
        message.channel.send( target + msg ).then( ( msg ) => {
            if ( !leftServer )
                target.user.send( 'You\'ve been suspended in the CPL discord server\n' + msg.url )
            else mongo.suspensionDue( id )
        })
    }
    else if ( content.startsWith( '.smurf' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        let id = target ? target.id : null
        if ( !target ) {
            if ( content.split( ' ' ).length == 2 ) {
                target = content.split(' ').pop()
                id  = target.replace( /\D*/g, '' )
                var leftServer = true
            }
        }
        if ( !target || !id ) {
            message.channel.send( smurf ).then( msg => { msg.delete( 30000 ) } )
            return
        }
        let ends = await mongo.smurfSuspension( id )
        let msg = '\n**[ ATTEMPTED SMURF INFRACTION ]**'
        msg += '\n**RESULT:** 30 day suspension.'
        if ( !leftServer ) {
            if ( target.roles.has( suspendedId ) )
                msg += ' This is in addition to your current suspension.'
            else
                target.addRole( suspendedId )
        }
        msg += '\n**ENDS:** ' + ends + '.'
        message.channel.send( target + msg ).then( ( msg ) => {
            if ( !leftServer )
                target.user.send( 'You\'ve been suspended in the CPL discord server\n' + msg.url )
            else mongo.suspensionDue( id )
        })
    }
    else if ( content.startsWith( '.unsuspend' ) ) {
        message.delete()
        let target = message.mentions.members.array().shift()
        if ( !target ) {
            message.channel.send( unsuspend ).then( msg => { msg.delete( 30000 ) } )
            return
        }
        let reason = message.content.split(' ').slice(2).join(' ')
        mongo.unsuspend( target.id )
        if ( target.roles.has( suspendedId ) ) {
            target.removeRole( suspendedId )
            let msg = '\nYou have been unsuspended.'
            if ( reason.length > 0 )
                msg += '\n**REASON:** ' + reason + '.'
            message.channel.send( target + msg ).then( ( msg ) => {
                target.user.send( 'Your CPL suspension has been lifted\n' + msg.url )
            })
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
