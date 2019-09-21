const util = require('../util/util');
const mongoUtil = require('../util/mongo');

const max_per_leaderboard_message = 10;

class C6Leaderboard
{
	constructor() {
		util.client.on('ready', () =>
        {
            //this.update('overall');
        });

        util.client.on('message', async (message) => {
            if (message.content == '.reloadlb') {
                message.delete();

                var channel = null;
                var messages = null;
                var db = null;
                if ( message.channel == util.getChannel(587158329877331969) ) {
                    db = 'ffa';
                    channel = util.getChannel(587158329877331969);
                    messages = [
                        '587469644269617162',
                        '587469644911083570',
                        '587469645632634885',
                        '587469646215643137',
                        '587469647113355274',
                        '587469670819299328',
                        '587469671754629121',
                        '587469672522186752',
                        '587469672853536776',
                        '587469673797517322'
                    ];
                }
                else if ( message.channel == util.getChannel(587158165309751300) ) {
                    db = 'team';
                    channel = util.getChannel(587158165309751300);
                    messages = [
                        '587469576137080863',
                        '587469577131130880',
                        '587469577810870278',
                        '587469578599137290',
                        '587469579136139285',
                        '587469603261775903',
                        '587469603689594912',
                        '587469604851286044',
                        '587469605656592384',
                        '587469606311034913'
                    ];
                }
                else return;

                for ( var j = 0; j < 10 ; j++ ) {
                    let m = await channel.fetchMessage(messages[j]);
                    let msg = '';
                    for ( var i = 1; i < 10 ; i++ ) {
                        if (j == 0 && i == 0) continue;
                        msg += '`#' + j.toString() + i.toString() + '`\n';
                        if (j == 9 && i == 9) msg += '`#100`\n';
                        else if (j == 0 && i == 9) msg += '`#10`\n';
                        else if (i == 9) msg += '`#' + (j+1).toString() +'0`\n';
                    }
                    await m.edit(msg);
                }
                this.publishGlickoLeaderboard(db);
            }
        });
	}

	getWinPercentage(wins, losses)
	{
		return (wins == 0 ? 0 : (losses == 0 ? 100 : Math.round(100 * wins / (wins+losses))));
	}
	
	async update( db )
	{
		try
		{
			// Grab data
			this.leaderboard = await util.makeRGRequest('leaderboard.php', {});
			
			// Publish new Leaderboard
			await this.publishLeaderboard();

            //glicko2
            await this.publishGlickoLeaderboard(db);
		}
		catch(err)
		{
			console.log('[leaderboard_err] ' + err);
		}
	}
	
    async publishGlickoLeaderboard(db)
    {
        this.glickoLb = await mongoUtil.getLeaderboard(db);
        var channel = null;
        var messages = null;
        if ( db === 'ffa' ) {
            channel = util.getChannel(587158329877331969);
		    messages = [
		    	'587469644269617162',
                '587469644911083570',
                '587469645632634885',
                '587469646215643137',
                '587469647113355274',
		    	'587469670819299328',
                '587469671754629121',
                '587469672522186752',
                '587469672853536776',
                '587469673797517322'
		    ];
        }
        else if ( db === 'team' ) {
            channel = util.getChannel(587158165309751300);
		    messages = [
		    	'587469576137080863',
                '587469577131130880',
                '587469577810870278',
                '587469578599137290',
                '587469579136139285',
		    	'587469603261775903',
                '587469603689594912',
                '587469604851286044',
                '587469605656592384',
                '587469606311034913'
		    ];
        }
        else {
            return;
        }

        const max = this.glickoLb.length < 100 ? this.glickoLb.length : 100;

        //score decay
        let currDate = new Date();
        for ( var i = 0; i < max ; i++ ) {
            let lastDate = new Date( this.glickoLb[i].lastModified );
            if ( currDate - lastDate > 2628000000 ) {
                console.log(this.glickoLb[i]._id + " decaying 150 points.");
                console.log("old:\t" + this.glickoLb[i].rating);
                await mongoUtil.setSkill( this.glickoLb[i]._id, this.glickoLb[i].rating - 150 );
                let p = await mongoUtil.getPlayer( this.glickoLb[i]._id );
                console.log("new:\t" + p.rating);
            }
        }

        //actual leaderboard message
        let msg = ''
        let j = 0;
        for ( var i = 0; i < max ; i++ ) {
            if ( i < 9 ) msg += '`#0' + (i+1) + '`     `';
            else if ( i < 99 ) msg += '`#' + (i+1) + '`     `';
            else msg += '`#' + (i+1) + '`   `';
            msg += Math.round(this.glickoLb[i].rating) + '`';
            let wins = this.glickoLb[i].wins;
            if (wins < 10) {
                msg += '\t`[   ' + wins;
            }
            else if (wins < 100) {
                msg += '\t`[  ' + wins;
            }
            else {
                msg += '\t`[ ' + wins;
            }

            let losses = this.glickoLb[i].losses;
            if (losses < 10) {
                msg += ' - ' + losses + '   ]';
            }
            else if (losses < 100) {
                msg += ' - ' + losses + '  ]';
            }
            else {
                msg += ' - ' + losses + ' ]';
            }

            let winPercent = Math.round(wins*100/this.glickoLb[i].games);
            if (winPercent < 10) {
                msg += '    ' + winPercent + '%`';
            }
            else if (winPercent < 100) {
                msg += '   ' + winPercent + '%`';
            }
            else {
                msg += '  ' + winPercent + '%`';
            }

            msg += '\t<@' + this.glickoLb[i]._id + '>\t' + '`rd: ' +  Math.round(this.glickoLb[i].rd) + '`\n';

            if ( ((i+1) % 10) == 0 ) {
                var m = await channel.fetchMessage(messages[j]);
                m.edit(msg);
                msg = '';
                j++;
            }
        }
        //blanks in case not enough players on leaderboard
        if (msg != '') {
            m = await channel.fetchMessage(messages[j]);
            while ( ((i+1) % 10) != 1 ) {
                if ( i < 9 ) msg += '`#0' + (i+1) + '`\n';
                else msg += '`#' + (i+1) + '`\n';
                i++;
            }
            m.edit(msg);
        }
    }

	async publishLeaderboard()
	{
        const channel = util.getChannel(483346000233365526);
		const messages = [
			'544328293927878666',
            '544328296918155264',
            '544328298084433922',
            '544328300127059988',
            '544328301657849866',
			'544328321853554733',
            '544328323795386398',
            '544328325372575744',
            '544328326744113162',
            '544328328379760650'
		];

		let i = 0;
		const max_top = this.leaderboard.length < 100 ? this.leaderboard.length : 100;		
		for(const m of messages)
		{
			const msg = await channel.fetchMessage(m);
			const content_new = this.createLeaderboard(i, max_top);

			if( msg.content != content_new) msg.edit( content_new );
			i += max_per_leaderboard_message;
		}
	}
	
	createLeaderboard(i, max_top)
	{	
		let msg = '**Top ' + (i+max_per_leaderboard_message) + '**';
		const max_i = i + (max_top - i < max_per_leaderboard_message ? max_top - i : max_per_leaderboard_message);
		for(; i < max_i; ++i)
		{
			let n = (i+1);
			if(n >= 10 && n <= 20) n += 'th';
			else if(n % 10 == 1) n += 'st';
			else if(n % 10 == 2) n += 'nd';
			else if(n % 10 == 3) n += 'rd';
			else n += 'th';
			
			// Construct win_percentage
			const s = this.leaderboard[i];
			let win_percentage = this.getWinPercentage(s.wins, s.losses).toString() + '%'; while(win_percentage.length < 4) win_percentage = ' ' + win_percentage;
			let wins = s.wins.toString(); while(wins.length < 4) wins = ' ' + wins;
			//let losses = s.losses.toString(); while(losses.length < 4) losses = ' ' + losses;
			let losses = s.losses.toString(); while(losses.length < 4) losses += ' ';
			
			// split columns
			//msg += '\n`' + s.rating + ' ' + win_percentage + ' `'; //len: 12 (12)
			//msg += ' `W ' + wins + '` `L ' + losses + '`'; //len: 18 (30)
			
			// W-L one column
			//msg += '\n`' + s.rating + ' ' + win_percentage + ' ';
			//msg += ' ' + wins + 'W ' + losses + 'L`';
			
			msg += '\n`' + s.rating + ' ' + win_percentage + '  ';
			msg += '[' + wins + '-' + losses + ']`';
			// len 25 (25)
			
			// Best' Civ
			if(s.civ != null) msg += ' ' + util.getCivEmojiByDBID(s.civ); //len: 21 (51) + maxcivemoji
			
			msg += ' <@' + s.id + '> **(' + n + ')**'; //len: 35 (86) + maxcivemoji
		}
		
		//[length_per_line] 86 + maxcivemoji ( scotland: 28) => 118
		//console.log('[msg_total]' + msg.length);
		return msg;
	}
}

module.exports = new C6Leaderboard();
