// Functions

let func = {
    randomStatus: function() {
        // Randomizes the bot status from the list
        let rStatus = [
            "Leakers | Use "+spc+"help",
            " Guilds",
            "Cheaters | Use "+spc+"help",
            "discord.gg/jeFeDRasfs"
        ];
        let newStatus = util.selectRandom(rStatus)
        if (newStatus.charAt(0) == " ") {
            // Add the number of guilds to the status that shows it
            // Would have done it above, but then it wouldn't update dynamically
            // Templating might be an option, needs testing
            newStatus = bot.guilds.size + newStatus;
        }
        bot.editStatus(
            "online",
            {
                name:(newStatus),
                type:3
            }
        );
    },

    chanLog: function(chan, author, mess, color) {
        // Simple Channel Log Wrapper
        bot.createMessage(
            chan,
            {
                embed: {
                    description: mess,
                    author: {
                        name: author.username+"#"+author.discriminator+" / "+author.id,
                        icon_url: author.avatarURL
                    },
                    color: color,
                }
            }
        ).catch(err => {
            logMaster(err);
        });
    },

    combineRoles: function(oldRoles, newRoles) {
        // Takes a delimited role string and combines it, removing dupes
        let wipOldArr = oldRoles.split(";");
        let wipNewArr = newRoles.split(";")
        let combArr = wipOldArr.concat(wipNewArr.filter((item) => wipOldArr.indexOf(item) < 0))

        return combArr;
    },

    getUserFromDB: function(userID, callback) {
        // Calls the database to get the row about the specified user.
        //logMaster("GetUserFromDB: "+userID+"")
        pool.query('SELECT EXISTS(SELECT 1 FROM users WHERE userid='+pool.escape(userID)+')', function (error, results, fields) {
            //logMaster("GetUserFromDB: "+Object.values(results[0])[0]+" and "+pool.escape(userID))
            if (error) throw error;
            if (Object.values(results[0])[0] == 0) {
                // Doesn't exist
                //logMaster("GetUserFromDB: NoRes")
                return callback("nores");
            } else {
                // Found in DB
                pool.query('SELECT * FROM users WHERE userid='+pool.escape(userID)+'', function (error, results, fields) {
                    if (error) throw error;
                    //logMaster("GetUserFromDB: ReturningRes")
                    return callback(results[0]);
                });
            }
        });
    },

    addUserToDB: function(userID, avatar, status, usertype, lastuser, server, roles, filtertype, callback) {
        // Adds the user to the database. Expected to be used by the automated system primarily

        // First check the database for the user
        func.getUserFromDB(userID, function (oldUser) {
            if (oldUser == "nores") {
                // Add New User
                pool.query('INSERT INTO users (userid, avatar, user_type, last_username, servers, roles, added_date) VALUES('+pool.escape(userID)+','+pool.escape(avatar)+','+pool.escape(usertype)+','+pool.escape(lastuser)+','+pool.escape(server)+','+pool.escape(roles)+',"'+(new Date())+'")', function(err, results, fields) {
                    if (err) throw err;
                });
                return callback(":x: Auto Added "+usertype+" "+lastuser+" <@"+userID+"> into database from "+badservers[server]+"");
            } else {
                // Update Existing User
                let newRoles = func.combineRoles(oldUser.roles, roles).join(';');
                let spServers = oldUser.servers.split(";");
                if (spServers.includes(server)) {
                    // Already know they are in that server
                    // No real need to update it. Maybe update roles?
                    if (oldUser.status == "appealed") {
                        // User WAS appealed, now permblacklisted
                        pool.query('UPDATE users SET last_username='+pool.escape(lastuser)+', status='+pool.escape("permblacklisted")+' WHERE userid='+pool.escape(userID)+'', function(err, results, fields) {
                            if (err) throw err;
                        });
                        return callback(":x: Auto Updated "+usertype+" "+lastuser+" <@"+userID+"> in database from "+badservers[server]+" to **PERMANENT BLACKLIST**");
                    }
                } else {
                    // New Server
                    spServers.push(server);
                    if (oldUser.status == "appealed") {
                        // User WAS appealed, now permblacklisted
                        pool.query('UPDATE users SET last_username='+pool.escape(lastuser)+', servers='+pool.escape(spServers.join(';'))+', roles='+pool.escape(newRoles)+', status='+pool.escape("permblacklisted")+' WHERE userid='+pool.escape(userID)+'', function(err, results, fields) {
                            if (err) throw err;
                        });
                        return callback(":x: Auto Updated "+usertype+" "+lastuser+" <@"+userID+"> in database from "+badservers[server]+" to **PERMANENT BLACKLIST**");
                    } else {
                        pool.query('UPDATE users SET last_username='+pool.escape(lastuser)+', servers='+pool.escape(spServers.join(';'))+', roles='+pool.escape(newRoles)+' WHERE userid='+pool.escape(userID)+'', function(err, results, fields) {
                            if (err) throw err;
                        });
                        return callback(":x: Auto Updated "+usertype+" "+lastuser+" <@"+userID+"> in database from "+badservers[server]+"");
                    }
                }
            }
        });
    },

    addUserToDBMan: function(userID, status, usertype, server, reason, callback) {
        // Function for an admin to manually add a user to the database

        func.getUserFromDB(userID, function (oldUser) {
            if (oldUser == "nores") {
                // User Does not exist, so add user
                bot.getRESTUser(userID).then(rUser => {
                    // Good REST
                    pool.query('INSERT INTO users (avatar, last_username, userid, status, user_type, servers, reason, filter_type, added_date) VALUES('+pool.escape(rUser.avatarURL)+','+pool.escape(rUser.username+'#'+rUser.discriminator)+','+pool.escape(userID)+','+pool.escape(status)+','+pool.escape(usertype)+','+pool.escape(server)+','+pool.escape(reason)+','+pool.escape("Manual")+',"'+(new Date())+'")', function(err, results, fields) {
                        if (err) throw err;
                    });
                    return callback("Added <@"+userID+"> / "+userID+" to database as "+status+" with REST");
                }).catch(err => {
                    // Bad REST
                    pool.query('INSERT INTO users (userid, status, user_type, servers, reason, filter_type, added_date) VALUES('+pool.escape(userID)+','+pool.escape(status)+','+pool.escape(usertype)+','+pool.escape(server)+','+pool.escape(reason)+','+pool.escape("Manual")+',"'+(new Date())+'")', function(err, results, fields) {
                        if (err) throw err;
                    });
                    return callback("Added <@"+userID+"> / "+userID+" to database as "+status+"");
                });
            } else {
                // User Already in Database
                return callback(":x: User is already in database.\nChange status if necessary using "+spc+"upstatus");
            }
        });
    },

    updateUserStatus: function(userID, newStatus, newType, newReason, callback) {
        // Update the status of a user in the database

        // First check the database for the user
        func.getUserFromDB(userID, function (oldUser) {
            if (oldUser == "nores") {
                // Return Nothing
                return callback(":x: User not found in database");
            } else {
                // Existing User
                pool.query('UPDATE users SET status='+pool.escape(newStatus)+', user_type='+pool.escape(newType)+', reason='+pool.escape(newReason)+' WHERE userid='+pool.escape(userID)+'', function(err, results, fields) {
                    if (err) throw err;
                });
                return callback("Updated "+oldUser.last_username+" <@"+userID+"> to status `"+newStatus+"`, type `"+newType+"` and `"+newReason+"`");
            }
        });
    },

    CSVtoArray: function(text) {
        let re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
        let re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;

        // Return NULL if input string is not well formed CSV string.
        if (!re_valid.test(text)) return null;

        let a = []; // Initialize array to receive values.
        text.replace(re_value, // "Walk" the string using replace with callback.
            function(m0, m1, m2, m3) {

                // Remove backslash from \' in single quoted values.
                if (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));

                // Remove backslash from \" in double quoted values.
                else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
                else if (m3 !== undefined) a.push(m3);
                return ''; // Return empty string.
            });

        // Handle special case of empty last value.
        if (/,\s*$/.test(text)) a.push('');
        return a;
    },

    processCSVImport: async function(filename, serverid, utype, callback) {
        const fileStream = fs.createReadStream(filename+'.csv');
        //let add = 0;
        //let upd = 0;

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        // Note: we use the crlfDelay option to recognize all instances of CR LF
        // ('\r\n') in input.txt as a single line break.

        for await (const line of rl) {
            // Each line in input.txt will be successively available here as `line`.
            let lineArr = func.CSVtoArray(line)
            if (lineArr != null) {
                if (lineArr[0] != "username") {
                    func.addUserToDB(
                        lineArr[7], // UserID
                        lineArr[2], // Avatar
                        "blacklisted", // Status
                        utype, // User Type
                        lineArr[0]+"#"+lineArr[1], // Username
                        serverid, // Server ID
                        lineArr[3], // Roles
                        "Semi-Auto", // Filter Type
                        function (ret) {
                            bot.createMessage(
                                config.addUsersChan,
                                {
                                    embed: {
                                        description: ret,
                                        color: 0x800000,
                                    }
                                }
                            );
                        }
                    );
                }
            }
        }

        //logMaster("Added "+add+" users and updated "+upd+" users for the database from "+filename+".csv")
        updateServerIDList(serverid)
        return callback(true);
    },

    updateServerIDList: function(serverID) {
        // Get the Message in the bad-discords channel
        bot.channels.cache.get('CHANNEL_ID:HERE').messages.fetch("MSG_ID_HERE")
            .then(message =>{
                //Open the message, Remove ending String
                var oldMSG = message.content.replace(" ```", "")
                //Add new Server & close the message
                var endMSG = oldMSG + "\n" + serverID + " ```";
                // Edit the existing message
                message.edit(endMSG)
            })
            .catch(console.error);
    },

    getGuildSettings: function(guildID, callback) {
        // Gets the guild settings from the database
        pool.query('SELECT EXISTS(SELECT 1 FROM guilds WHERE guildid='+pool.escape(guildID)+')', function (error, results, fields) {
            if (error) throw error;
            if (Object.values(results[0])[0] == 0) {
                // Doesn't exist
                return callback("nores");
            } else {
                // Found in DB
                pool.query('SELECT * FROM guilds WHERE guildid='+pool.escape(guildID)+'', function (error, results, fields) {
                    if (error) throw error;
                    return callback(results[0]);
                });
            }
        });
    },

    addGuildToDB: function(guildID, guildName, logChannel) {
        // Adds a guild row to the database
        pool.query('INSERT INTO guilds (guildid, guildname, logchan) VALUES ('+pool.escape(guildID)+','+pool.escape(guildName)+','+pool.escape(logChannel)+') ON DUPLICATE KEY UPDATE guildname='+pool.escape(guildName), function (error, results, fields) {
            if (error) throw error;
        });
    },

    removeGuildFromDB: function(guildID) {
        // Removes a guild row from the database
        pool.query('DELETE FROM guilds WHERE guildid='+pool.escape(guildID)+'', function (error, results, fields) {
            if (error) throw error;
        });
    },

    changeGuildSetting: function(guildID, guildOpt, guildVal, callback) {
        // Changes a guild setting
        let guildOptions = {
            "punown": ["kick","ban"],
            "punsupp": ["kick","ban"],
            "punleak": ["warn","kick","ban"],
            "puncheat": ["warn","kick","ban"]
        }
        if (guildOpt === "logchan") {
            func.getGuildSettings(guildID, function (guildInfo) {
                if (guildInfo == "nores") {
                    return callback(":x: Guild settings not found!\nPlease let the bot developer know.");
                } else {
                    pool.query('UPDATE guilds SET logchan='+pool.escape(guildVal)+' WHERE guildid='+pool.escape(guildID)+'', function (error, results, fields) {
                        if (error) throw error;
                        return callback("Changed setting "+pool.escape(guildOpt)+" to "+pool.escape(guildVal)+"");
                    });
                }
            });
        } else if (guildOpt === "prefix") {
            func.getGuildSettings(guildID, function (guildInfo) {
                if (guildInfo == "nores") {
                    return callback(":x: Guild settings not found!\nPlease let the bot developer know.");
                } else {
                    pool.query('UPDATE guilds SET prefix='+pool.escape(guildVal)+' WHERE guildid='+pool.escape(guildID)+'', function (error, results, fields) {
                        if (error) throw error;
                        return callback("Changed setting "+pool.escape(guildOpt)+" to "+pool.escape(guildVal)+"");
                    });
                }
            });
        } else if (guildOptions[guildOpt] != null) {
            if (guildOptions[guildOpt].includes(guildVal)) {
                func.getGuildSettings(guildID, function (guildInfo) {
                    if (guildInfo == "nores") {
                        return callback(":x: Guild settings not found!\nPlease let the bot developer know.");
                    } else {
                        pool.query('UPDATE guilds SET '+guildOpt+'='+pool.escape(guildVal)+' WHERE guildid='+pool.escape(guildID)+'', function (error, results, fields) {
                            if (error) throw error;
                            return callback("Changed setting "+pool.escape(guildOpt)+" to "+pool.escape(guildVal)+"");
                        });
                    }
                });
            } else {
                return callback(":x: You cannot set that option to that value.\nSetting not applied.\nPlease review `"+spc+"config` again for the allowed values per setting");
            }
        } else {
            return callback(":x: You cannot set that option to that value.\nSetting not applied.\nPlease review `"+spc+"config` again for the allowed values per setting");
        }
    },

    punishUser: function(member, guildInfo, type, toDM) {
        // Process a Bad User
        let types = {
            owner: "punown",
            supporter: "punsupp",
            cheater: "puncheat",
            leaker: "punleak"
        };

        if (guildInfo[types[type]] == "ban" || guildInfo[types[type]] == "kick") {
            // Punishing User
            if (!member.bot) {
                if (toDM) {
                    bot.getDMChannel(member.id)
                        .then(channel => channel.createMessage(":shield: Warden\nYou are being automodded by "+guildInfo.guildname+" for being associated with Leaking or Cheating Discord Servers.\nYou may attempt to appeal this via the Official Warden Discord:\nhttps://discord.gg/jeFeDRasfs"))
                        .catch(err => {
                            bot.createMessage(
                                guildInfo.logchan,
                                {
                                    embed: {
                                        description: ":warning: Unable to Direct Message User <@"+member.id+">",
                                        author: {
                                            name: member.username+"#"+member.discriminator+" / "+member.id,
                                            icon_url: member.avatarURL
                                        },
                                        color: 0xFFFF00,
                                    }
                                }
                            );
                        }).finally(any => {
                            let action = guildInfo[types[type]] == "ban" ? member[guildInfo[types[type]]](0, "Warden - User Type "+type) : member[guildInfo[types[type]]]("Warden - User Type "+type);
                            action.then(any => {
                                bot.createMessage(
                                    guildInfo.logchan,
                                    {
                                        embed: {
                                            description: ":shield: User <@"+member.id+"> has been punished with a "+guildInfo[types[type]]+", type "+type+".\nUse checkuser for more information.",
                                            author: {
                                                name: member.username+"#"+member.discriminator+" / "+member.id,
                                                icon_url: member.avatarURL
                                            },
                                            color: 0x008000,
                                        }
                                    }
                                );
                            }).catch(err => {
                                bot.createMessage(
                                    guildInfo.logchan,
                                    {
                                        embed: {
                                            description: ":warning: I tried to "+guildInfo[types[type]]+" <@"+member.id+"> but something errored!\nPlease verify I have this permission, and am a higher role than this user!",
                                            author: {
                                                name: member.username+"#"+member.discriminator+" / "+member.id,
                                                icon_url: member.avatarURL
                                            },
                                            color: 0x008000,
                                        }
                                    }
                                );
                            });
                        });
                } else {
                    let action = guildInfo[types[type]] == "ban" ? member[guildInfo[types[type]]](0, "Warden - User Type "+type) : member[guildInfo[types[type]]]("Warden - User Type "+type);
                    action.then(any => {
                        bot.createMessage(
                            guildInfo.logchan,
                            {
                                embed: {
                                    description: ":shield: User <@"+member.id+"> has been punished with a "+guildInfo[types[type]]+", type "+type+".\nUse checkuser for more information.",
                                    author: {
                                        name: member.username+"#"+member.discriminator+" / "+member.id,
                                        icon_url: member.avatarURL
                                    },
                                    color: 0x008000,
                                }
                            }
                        );
                    }).catch(err => {
                        bot.createMessage(
                            guildInfo.logchan,
                            {
                                embed: {
                                    description: ":warning: I tried to "+guildInfo[types[type]]+" <@"+member.id+"> but something errored!\nPlease verify I have this permission, and am a higher role than this user!",
                                    author: {
                                        name: member.username+"#"+member.discriminator+" / "+member.id,
                                        icon_url: member.avatarURL
                                    },
                                    color: 0x008000,
                                }
                            }
                        );
                    });
                }
            }
        } else if (guildInfo[types[type]] == "warn") {
            // Warn Discord
            if (!member.bot) {
                bot.createMessage(
                    guildInfo.logchan,
                    {
                        embed: {
                            description: ":warning: User <@"+member.id+"> is blacklisted as "+type+".\nUse checkuser for more information.",
                            author: {
                                name: member.username+"#"+member.discriminator+" / "+member.id,
                                icon_url: member.avatarURL
                            },
                            color: 0x008000,
                        }
                    }
                );
            }
        }
    }

};

module.exports = func;
