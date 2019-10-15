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
                    db = 'main';
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
                else if ( message.channel == util.getChannel(628114954477764618) ) {
                    this.glickoLb = await mongoUtil.getCivsLeaderboard();
                    channel = util.getChannel(628114954477764618);
                    messages = [
                        '628117031794769950',
                        '628117032432566273',
                        '628117033443262464',
                        '628117034173202435',
                        '628117034948886529'
                    ];

                    let msg = '```js\n'
                    let j = 0;
                    for ( var i = 0; i < this.glickoLb.length ; i++ ) {
                        if ( i < 9 ) msg += '#0' + (i+1) + '   ';
                        else msg += '#' + (i+1) + '   ';

                        let name = this.glickoLb[i].name;
                        let avgP = this.glickoLb[i].avgPlace.toFixed(2);
                        let avgS = Math.round(this.glickoLb[i].avgSkill);
                        let games = this.glickoLb[i].games;

                        msg += name;
                        let spaces = 14 - name.length;
                        for ( let k = 0; k < spaces; k++ ) {
                            msg += ' ';
                        }
                        msg += 'Avg Place: ' + avgP + '\tAvg Skill: ' + avgS + '\tGames: ' + games + '\n';

                        if ( ((i+1) % 10) == 0 ) {
                            var m = await channel.fetchMessage(messages[j]);
                            m.edit(msg + '```');
                            msg = '```js\n';
                            j++;
                        }
                    }

                    for ( let x = this.glickoLb.length; x < 50; x++ ) {
                        msg += '#' + (x+1) + '\n';
                        if ( ((x+1) % 10) == 0 ) {
                            var m = await channel.fetchMessage(messages[j]);
                            m.edit(msg + '```');
                            msg = '```js\n';
                            j++;
                        }
                    }

                    if (msg != '```js\n') {
                        m = await channel.fetchMessage(messages[j]);
                        m.edit(msg + '```');
                    }

                    return;
                }
                else {
                    console.log("unknown db: " + db);
                    return;
                }

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
            //glicko2
            await this.publishGlickoLeaderboard(db);

            //civs
            await this.publishCivsLeaderboard();
		}
		catch(err)
		{
			console.log('[leaderboard_err] ' + err);
		}
	}

    async publishCivsLeaderboard() {
        this.glickoLb = await mongoUtil.getCivsLeaderboard();
        var channel = null;
        var messages = null;
        channel = util.getChannel(628114954477764618);
        messages = [
            '628117031794769950',
            '628117032432566273',
            '628117033443262464',
            '628117034173202435',
            '628117034948886529'
        ];

        //actual leaderboard message
        let msg = '```js\n'
        let j = 0;
        for ( var i = 0; i < this.glickoLb.length ; i++ ) {
            if ( i < 9 ) msg += '#0' + (i+1) + '   ';
            else msg += '#' + (i+1) + '   ';

            let name = this.glickoLb[i].name;
            let avgP = this.glickoLb[i].avgPlace.toFixed(2);
            let avgS = Math.round(this.glickoLb[i].avgSkill);
            let games = this.glickoLb[i].games;

            msg += name;
            let spaces = 12 - name.length;
            for ( let k = 0; k < spaces; k++ ) {
                msg += ' ';
            }
            msg += 'Avg Place: ' + avgP + '\tAvg Skill: ' + avgS + '\tGames: ' + games + '\n';

            if ( ((i+1) % 10) == 0 ) {
                var m = await channel.fetchMessage(messages[j]);
                m.edit(msg + '```');
                msg = '```js\n';
                j++;
            }
        }
        for ( let x = this.glickoLb.length; x < 50; x++ ) {
            msg += '#' + (x+1) + '\n';
            if ( ((x+1) % 10) == 0 ) {
                var m = await channel.fetchMessage(messages[j]);
                m.edit(msg + '```');
                msg = '```js\n';
                j++;
            }
        }
        if (msg != '```js\n') {
            m = await channel.fetchMessage(messages[j]);
            m.edit(msg + '```');
        }
    }
    async publishGlickoLeaderboard(db)
    {
        this.glickoLb = await mongoUtil.getLeaderboard(db);
        var channel = null;
        var messages = null;
        if ( db === 'main' ) {
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
            console.log("unknown db: " + db);
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
                await mongoUtil.changeSkill( this.glickoLb[i]._id, -150, db );
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
}

module.exports = new C6Leaderboard();
