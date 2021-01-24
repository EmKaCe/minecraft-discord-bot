import { Client, Message, TextChannel } from "discord.js";
import { readFileSync, writeFileSync } from "fs";
const Query: any = require("mcquery");
import { Rcon } from "rcon-client/lib";
const client = new Client();

const config = JSON.parse(readFileSync("./config.json", "utf-8"));
const rcon = JSON.parse(readFileSync("./rcon.json", "utf-8"));

const hostname = config.hostname;
const port = config.port;

const whitelistQueue: Array<whitelistRequest> = [];
let errors = 0;

const whitelistUser = (username: string) => {
    return new Promise(async (res) => {
        const session = await Rcon.connect({
            host: rcon.hostname,
            port: rcon.port,
            password: rcon.password
        });
        await session.send("whitelist add " + username);
        await session.end();
        res(true);
    });
};

client.on("ready", async () => {
    const channel = <TextChannel>client.channels.cache.get(config.channel);
    let message: Message;
    if (config.message) {
        message = await channel.messages.fetch(config.message);
    }
    const query = new Query(hostname, port);

    const checkMcServer = () => {
        query.connect((err: String) => {
            if (err) {
                queryErrorHandler(err);
            } else {
                query.full_stat(fullStatHandler);
            }
        });
    };

    const fullStatHandler = (err: String, stat) => {
        if (err) {
            queryErrorHandler(err);
        } else {
            errors = 0;
            const embed = {
                title: "[Belastend] Minecraft-Server",
                description: "🟢 Server ist aktuell online!",
                color: 3460101,
                timestamp: Date.now(),
                fields: [
                    {
                        name: "Aktuelle Spieler (" + stat.numplayers + ")",
                        value: stat.numplayers == 0 ? "Aktuell ist niemand auf dem Server!" : stat.player_.join("\n")
                    }
                ]
            };
            sendMessage(embed, true);
        }
    };

    const queryErrorHandler = (err: String) => {
        errors++;
        console.error("ERROR: TRY " + errors + "\n" + err);
        if (errors == 3) {
            const embed = {
                title: "[Belastend] Minecraft-Server",
                description: "🔴 Server ist aktuell offline!\nDer Server konnte aktuell nicht erreicht werden, Status unbekannt.\n<@155626429629857792> bitte nicht pingen, der wurde schon von mir gepingt :)",
                color: 13632027,
                timestamp: Date.now()
            };
            sendMessage(embed, false, err);
        }
    };

    const sendMessage = async (embed, success: Boolean, reason?: String) => {
        if (message) {
            message.edit({ embed: embed });
        } else {
            message = await channel.send({ embed: embed });
            config.message = message.id;
            writeFileSync("./config.json", JSON.stringify(config, null, 4));
        }
        if (!success) {
            const guild = await message.guild.fetch();
            const dmChannel = await guild.owner.createDM();
            await dmChannel.send("Server offline!\n\nReason:\n```\n" + reason + "\n```");
        }
    };

    setInterval(() => {
        checkMcServer();
    }, 10000);

    console.log("Logged in!");
});

client.on("message", async (message) => {
    if (!message.author.bot) {
        if (message.channel.id == config.whitelist) {
            if (message.content.startsWith("?whitelist ")) {
                const username = message.content.substr(11).trim();
                message.delete();
                if (username) {
                    let isDuplicate = false;

                    whitelistQueue.forEach(request => {
                        if (request.username == username) {
                            isDuplicate = true;
                        }
                    });

                    if (!isDuplicate) {
                        const embed = {
                            title: "Whitelist-Anfrage",
                            color: 5301186,
                            timestamp: Date.now(),
                            author: {
                                name: message.member.nickname || message.author.username,
                                icon_url: message.author.displayAvatarURL()
                            },
                            fields: [
                                {
                                    name: "Minecraft Username",
                                    value: username
                                },
                                {
                                    name: "Status",
                                    value: "Ausstehend"
                                }
                            ]
                        };
                        const sent = await message.channel.send({ embed: embed });
                        whitelistQueue.push({ id: sent.id, username: username });
                        await sent.react("✅");
                        await sent.react("❌");
                    }
                }
            }
        } else {
            if (message.content.toLowerCase() == "ente") {
                if (Math.random() < 0.05) {
                    message.reply("Gans!");
                }
            }
        }
    }
});

client.on("messageReactionAdd", (reaction, user) => {
    if (!user.bot) {
        if (reaction.message.channel.isText()) {
            if (reaction.message.guild.owner.user == user) {
                whitelistQueue.forEach((request, index) => {
                    if (request.id == reaction.message.id) {
                        if (reaction.message.embeds.length > 0) {
                            const embed = reaction.message.embeds[0];
                            if (embed.fields.length > 1) {
                                if (reaction.emoji.toString() == "✅") {
                                    whitelistUser(request.username).then(() => {
                                        embed.color = 3460101;
                                        embed.fields[1].value = "Zugelassen";
                                        reaction.message.edit({ embed: embed });
                                        reaction.message.reactions.removeAll();
                                        whitelistQueue.splice(index, 1);
                                    });
                                } else {
                                    if (reaction.emoji.toString() == "❌") {
                                        embed.color = 13632027;
                                        embed.fields[1].value = "Abgelehnt";
                                        reaction.message.edit({ embed: embed });
                                        reaction.message.reactions.removeAll();
                                        whitelistQueue.splice(index, 1);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
    }
});

client.login(config.secret);