const Discord = require( 'discord.js' )
const bot = new Discord.Client()
const fs = require( 'fs' ) 
require('log-timestamp')

const general_chat = '291751672106188800'
const lobby_links  = '743870766642233354'
const unified_link = new RegExp("^[a-z0-9]{3}-[a-z0-9]{4}$", "i")

function isGeneralChatChannel( channel ) {
    return channel.id == general_chat
}

function isLobbyLinksChannel( channel ) {
    return channel.id == lobby_links
}

bot.once('ready', async() => {
    console.log( 'Link Bot ready' )
})

bot.on('message', async ( message ) => {
    let inGenChat = isGeneralChatChannel( message.channel )
    let inLobbyLinks = isLobbyLinksChannel( message.channel )
    if ( !inGenChat && !inLobbyLinks ) return
    if ( message.author.bot ) return

    let content = message.content
    let words = content.split(' ')

    if ( inGenChat ) {
        for ( const word of words ) {
            if ( word.startsWith( 'steam://joinlobby' ) || word.match( unified_link ) ) {
                bot.channels.get(lobby_links).send('From ' + message.author + ':\n> ' + content)
                message.delete()
                return
            }
        }
    }
    else if ( inLobbyLinks ) {
        for ( const word of words ) {
            if ( word.startsWith( 'steam://joinlobby' ) || word.match( unified_link ) ) {
                return
            }
        }
        message.delete()
    }
})

fs.readFile( '/home/codenaugh/bots/data/tokens.json', ( err, data ) => { 
    if ( err ) throw err; 

    const tokens = JSON.parse( data );
    bot.login( tokens.link );
})

bot.on( "error", ( err ) => {
    console.error( err )
})

process.on( "uncaughtException", ( err ) => {
    console.error( err )
})
