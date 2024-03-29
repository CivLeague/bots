const util = require('/home/codenaugh/bots/util/util');
const mongoUtil = require('/home/codenaugh/bots/util/mongo');

const max_per_leaderboard_message = 10;

const cplId = '291751672106188800'
const twoWeeksMS = 1209600000

class C6Leaderboard
{
	constructor() {
		util.client.once('ready', () =>
        {
            //this.update('overall');
        });

        util.client.on('message', async (message) => {
            if (message.content == '.reloadlb') {
                message.delete();

                var max_civs = 55
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
                else if ( message.channel == util.getChannel(697619298507554826) ) {
                    db = 'pbc';
                    channel = util.getChannel(697619298507554826);
                    messages = [
                        '697624540871917568'
                    ];
                    for ( var j = 0; j < 1 ; j++ ) {
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
                    return;
                }
                else if ( message.channel == util.getChannel(628114954477764618) ) {
                    this.glickoLb = await mongoUtil.getCivsLeaderboard();
                    channel = util.getChannel(628114954477764618);
                    messages = [
                        '628117031794769950',
                        '628117032432566273',
                        '628117033443262464',
                        '628117034173202435',
                        '628117034948886529',
                        '745894579227590656'
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

                    for ( let x = this.glickoLb.length; x < max_civs; x++ ) {
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
                else if ( message.channel == util.getChannel(702404158401282071) ) {
                    this.glickoLb = await mongoUtil.getBbgCivsLeaderboard();
                    channel = util.getChannel(702404158401282071);
                    messages = [
                        '702405043122470977',
                        '702405043848085564',
                        '702405044540276771',
                        '702405044951187507',
                        '702405045957951499',
                        '776589075809042453'
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

                    for ( let x = this.glickoLb.length; x < max_civs; x++ ) {
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
                else if ( message.channel == util.getChannel(745900185032589383) ) {
                    this.glickoLb = await mongoUtil.getTeamCivsBBGLeaderboard();
                    channel = util.getChannel(745900185032589383);
                    messages = [
                        '745905509411979294',
                        '745905510024478751',
                        '745905511227981914',
                        '745905512130019368',
                        '747893771525685370',
                        '747893772389449859'
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

                    for ( let x = this.glickoLb.length; x < max_civs; x++ ) {
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
                else if ( message.channel == util.getChannel(745907056015442000) ) {
                    this.glickoLb = await mongoUtil.getCivsPrinceLeaderboard();
                    channel = util.getChannel(745907056015442000);
                    messages = [
                        '745909457636294656',
                        '745909458458378300',
                        '745909459129335818',
                        '745909459787710474',
                        '745909460446216212',
                        '745909484257542144'
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

                    for ( let x = this.glickoLb.length; x < max_civs; x++ ) {
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
            if ( db === 'ffa' ) {
                await this.publishCivsLeaderboard( false );
                await this.publishCivsLeaderboard( true );
                await this.publishCivsPrinceLeaderboard()
            }
            else {
                await this.publishTeamCivsLeaderboard( false )
                await this.publishTeamCivsLeaderboard( true )
            }
		}
		catch(err)
		{
			console.log('[leaderboard_err] ' + err);
		}
	}

    async publishCivsLeaderboard( bbg ) {
        var channel = null;
        var messages = null;
        if ( bbg ) {
            this.glickoLb = await mongoUtil.getBbgCivsLeaderboard();
            channel = util.getChannel(702404158401282071);
            messages = [
                '702405043122470977',
                '702405043848085564',
                '702405044540276771',
                '702405044951187507',
                '702405045957951499',
                '776589075809042453'
            ];
        }
        else {
            this.glickoLb = await mongoUtil.getCivsLeaderboard();
            channel = util.getChannel(628114954477764618);
            messages = [
                '628117031794769950',
                '628117032432566273',
                '628117033443262464',
                '628117034173202435',
                '628117034948886529',
                '745894579227590656'
            ];
        }

        //actual leaderboard message
        let msg = '```js\n'
        let j = 0;
        for ( var i = 0; i < this.glickoLb.length; i++ ) {
            if ( i < 9 ) msg += '#0' + (i+1) + '   ';
            else msg += '#' + (i+1) + '   ';

            let name = this.glickoLb[i].name;
            if ( name == 'Catherine The Magnificent' ) name = 'Catherine M'
            else if ( name == 'Catherine Black Queen' ) name = 'Catherine BQ'
            else if ( name == 'Teddy Rough Rider' ) name = 'Teddy RR'
            else if ( name == 'Teddy Bull Moose' ) name = 'Teddy BM'
            let avgP = this.glickoLb[i].avgPlace.toFixed(2);
            let avgS = Math.round(this.glickoLb[i].avgSkill);
            let games = this.glickoLb[i].games;

            msg += name;
            let spaces = 16 - name.length;
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
        if (msg != '```js\n') {
            m = await channel.fetchMessage(messages[j]);
            m.edit(msg + '```');
            j++
        }
        while ( j < messages.length ) {
            m = await channel.fetchMessage(messages[j]);
            m.edit('_Placeholder_');
            j++
        }
    }

    async publishCivsPrinceLeaderboard() {
        var channel = null;
        var messages = null;
        this.glickoLb = await mongoUtil.getCivsPrinceLeaderboard();
        channel = util.getChannel(745907056015442000);
        messages = [
            '745909457636294656',
            '745909458458378300',
            '745909459129335818',
            '745909459787710474',
            '745909460446216212',
            '745909484257542144'
        ]

        //actual leaderboard message
        let msg = '```js\n'
        let j = 0;
        for ( var i = 0; i < this.glickoLb.length; i++ ) {
            if ( i < 9 ) msg += '#0' + (i+1) + '   ';
            else msg += '#' + (i+1) + '   ';

            let name = this.glickoLb[i].name;
            if ( name == 'Catherine The Magnificent' ) name = 'Catherine M'
            else if ( name == 'Catherine Black Queen' ) name = 'Catherine BQ'
            else if ( name == 'Teddy Rough Rider' ) name = 'Teddy RR'
            else if ( name == 'Teddy Bull Moose' ) name = 'Teddy BM'
            let avgP = this.glickoLb[i].avgPlace.toFixed(2);
            let avgS = Math.round(this.glickoLb[i].avgSkill);
            let games = this.glickoLb[i].games;

            msg += name;
            let spaces = 16 - name.length;
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
        if (msg != '```js\n') {
            m = await channel.fetchMessage(messages[j]);
            m.edit(msg + '```');
            j++
        }
        while ( j < messages.length ) {
            m = await channel.fetchMessage(messages[j]);
            m.edit('_Placeholder_');
            j++
        }
    }

    async publishTeamCivsLeaderboard( bbg ) {
        var channel = null;
        var messages = null;
        if ( !bbg ) {
            this.glickoLb = await mongoUtil.getTeamCivsLeaderboard();
            channel = util.getChannel(745897804362416189);
            messages = [
                '745900029751066686',
                '745900030476419092',
                '745900031541772378',
                '745900032506724372',
                '745900032909377547',
                '745900057043271710'
            ];
        }
        else {
            this.glickoLb = await mongoUtil.getTeamCivsBBGLeaderboard();
            channel = util.getChannel(745900185032589383);
            messages = [
                '745905509411979294',
                '745905510024478751',
                '745905511227981914',
                '745905512130019368',
                '747893771525685370',
                '747893772389449859'
            ]
        }

        //actual leaderboard message
        let msg = '```js\n'
        let j = 0;
        for ( var i = 0; i < this.glickoLb.length; i++ ) {
            if ( i < 9 ) msg += '#0' + (i+1) + '   ';
            else msg += '#' + (i+1) + '   ';

            let name = this.glickoLb[i].name;
            if ( name == 'Catherine The Magnificent' ) name = 'Catherine M'
            else if ( name == 'Catherine Black Queen' ) name = 'Catherine BQ'
            else if ( name == 'Teddy Rough Rider' ) name = 'Teddy RR'
            else if ( name == 'Teddy Bull Moose' ) name = 'Teddy BM'
            let avgP = this.glickoLb[i].avgPlace.toFixed(2);
            let avgS = Math.round(this.glickoLb[i].avgSkill);
            let games = this.glickoLb[i].games;

            msg += name;
            let spaces = 16 - name.length;
            for ( let k = 0; k < spaces; k++ ) {
                msg += ' ';
            }
            msg += 'Avg Place: ' + avgP + '\tAvg Skill: ' + avgS + '\tGames: ' + games + '\n';

            if ( ((i+1) % 10) == 0 ) {
                var m = await channel.fetchMessage(messages[j]);
                m.edit(msg + '```')
                msg = '```js\n';
                j++;
            }
        }
        if (msg != '```js\n') {
            m = await channel.fetchMessage(messages[j]);
            m.edit(msg + '```')
            j++
        }
        while ( j < messages.length ) {
            m = await channel.fetchMessage(messages[j]);
            m.edit('_Placeholder_');
            j++
        }
    }

    async publishGlickoLeaderboard(db)
    {
        await mongoUtil.useStatsColl(db);
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
        else if ( db === 'pbc' ) {
            channel = util.getChannel(697619298507554826);
            messages = [
                '697624540871917568'
            ];
        }
        else {
            console.log("unknown db: " + db);
            return;
        }

        const max = this.glickoLb.length

        /*
        if (db != 'pbc') {
            //score decay
            let currDate = new Date();
            for ( var i = 0; i < max ; i++ ) {
                if (this.glickoLb[i].rating > 150) {
                    let lastDate = new Date( this.glickoLb[i].lastModified );
                    if ( currDate - lastDate > 2628000000 ) {
                        console.log(this.glickoLb[i]._id + " decaying 150 points.");
                        console.log("old:\t" + this.glickoLb[i].rating);
                        await mongoUtil.changeSkill( this.glickoLb[i]._id, db, -150 );
                        await mongoUtil.changeRd( this.glickoLb[i]._id, db, 25 );
                        let p = await mongoUtil.getPlayer( this.glickoLb[i]._id );
                        console.log("new:\t" + p.rating);
                    }
                }
            }
        }
        */

        //actual leaderboard message
        let msg = ''
        let i = 0
        let j = 0
        let k = 0

        let maxDisp = db === 'pbc' ? 10 : 100

        while ( i < maxDisp && k < max ) {
            try {
                await util.client.guilds.get( cplId ).fetchMember( this.glickoLb[k]._id )
            }
            catch (err) {
                k++
                continue
            }
            let currDate = new Date()
            let lastDate = new Date( this.glickoLb[k].lastModified )
            if ( db != 'pbc' && currDate-lastDate > twoWeeksMS ) {
                k++
                continue
            }

            if ( i < 9 ) msg += '`#0' + (i+1) + '     ';
            else if ( i < 99 ) msg += '`#' + (i+1) + '     ';
            else msg += '`#' + (i+1) + '    ';
            msg += Math.round(this.glickoLb[k].rating);
            let wins = this.glickoLb[k].wins;
            if (wins < 10) {
                msg += '\t[   ' + wins;
            }
            else if (wins < 100) {
                msg += '\t[  ' + wins;
            }
            else {
                msg += '\t[ ' + wins;
            }

            let losses = this.glickoLb[k].losses;
            if (losses < 10) {
                msg += ' - ' + losses + '   ]';
            }
            else if (losses < 100) {
                msg += ' - ' + losses + '  ]';
            }
            else {
                msg += ' - ' + losses + ' ]';
            }

            let winPercent = Math.round(wins*100/this.glickoLb[k].games);
            if (winPercent < 10) {
                msg += '    ' + winPercent + '%';
            }
            else if (winPercent < 100) {
                msg += '   ' + winPercent + '%';
            }
            else {
                msg += '  ' + winPercent + '%';
            }

            let first = this.glickoLb[k].first;
            if ( first === undefined ) first = 0
            if (first < 10) {
                msg += '    ' + first + '`';
            }
            else if (losses < 100) {
                msg += '   ' + first + '`';
            }
            else {
                msg += '  ' + first + '`';
            }

            msg += '\t<@' + this.glickoLb[k]._id + '>\n';

            if ( ((i+1) % 10) == 0 ) {
                if ( j == 0 ) {
                    let legend = '`rank    skill   [wins - loss]  win%  1st`\n'
                    msg = legend + msg
                }
                var m = await channel.fetchMessage(messages[j]);
                m.edit(msg);
                msg = '';
                j++;
            }
            i++
            k++
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
