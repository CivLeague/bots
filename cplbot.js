const moduleRegister = require('/home/codenaugh/bots/modules/register');
const moduleReports = require('/home/codenaugh/bots/modules/glicko');
const moduleStats = require('/home/codenaugh/bots/modules/stats');
const moduleSubs = require('/home/codenaugh/bots/modules/subs');

//connect to mongoDB
const mongoUtil = require('/home/codenaugh/bots/util/mongo');
mongoUtil.connectToMongo();

// login with the bot
const util = require('/home/codenaugh/bots/util/util');
util.login_token('cpl');
