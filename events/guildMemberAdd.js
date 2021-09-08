const {func} = require("../functions.js");

// Triggers when a user joins a guild the bot is in
const guildMemberAdd = function(guild, member) {
    // Member Joined Guild, process blacklist
    // First get Guild Settings
    func.getGuildSettings(guild.id, function (guildInfo) {
        if (guildInfo == "nores") {
            logMaster("Bot is in unknown guild???\n"+guild.id+" / "+guild.name+"\n\nSave me Vampire!!!");
        } else {
            // Now Get Member Info
            func.getUserFromDB(member.id, function (oldUser) {
                if (oldUser == "nores") {
                    // User Does not exist, so do nothing I guess?
                    // Maybe in the future give a clean log
                } else {
                    // User Exists, Process
                    let block = ["blacklisted","permblacklisted"];
                    if (block.includes(oldUser.status)) {
                        func.punishUser(member, guildInfo, oldUser.user_type, true);
                    }
                }
            });
        }
    });
};

module.exports = guildMemberAdd;
