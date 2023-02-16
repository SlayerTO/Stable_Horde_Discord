import {readFileSync} from "fs"
import {ActivityType, ApplicationCommandType, InteractionType, PartialMessageReaction, Partials, PartialUser, PresenceUpdateStatus} from "discord.js";
import { StableHordeClient } from "./classes/client";
import { handleCommands } from "./handlers/commandHandler";
import { handleComponents } from "./handlers/componentHandler";
import { handleModals } from "./handlers/modalHandler";
import { handleAutocomplete } from "./handlers/autocompleteHandler";
import StableHorde from "@zeldafan0225/stable_horde";
import { handleContexts } from "./handlers/contextHandler";
import {existsSync, mkdirSync} from "fs"
import { handleMessageReact } from "./handlers/messageReact";
import mariadb from "mariadb";

const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/
for (const line of readFileSync(`${process.cwd()}/.env`, 'utf8').split(/[\r\n]/)) {
    const [, key, value] = line.match(RE_INI_KEY_VAL) || []
    if (!key) continue

    process.env[key] = value?.trim() || ""
}

let connection: mariadb.Pool | undefined


const client = new StableHordeClient({
    intents: ["Guilds", "GuildMessageReactions"],
    partials: [Partials.Reaction, Partials.Message]
})

if(client.config.advanced?.encrypt_token && !process.env["ENCRYPTION_KEY"]?.length)
    throw new Error("Either give a valid encryption key (you can generate one with 'npm run generate-key') or disable token encryption in your config.json file.")

if(client.config.use_database !== false) {
    
    connection = mariadb.createPool({
        host: process.env["DB_IP"],
        database: process.env["DB_NAME"],
        user: process.env["DB_USERNAME"], 
        password: process.env["DB_PASSWORD"], 
        port: Number(process.env["DB_PORT"]), 
        rowsAsArray: true 
    });
    
    connection.execute("CREATE TABLE IF NOT EXISTS `user_tokens` ( `index` bigint(20) unsigned NOT NULL AUTO_INCREMENT, `id` varchar(100) NOT NULL, `token` varchar(100) NOT NULL, PRIMARY KEY (`id`), UNIQUE KEY `index` (`index`)) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    connection.execute("CREATE TABLE IF NOT EXISTS `parties` ( `index` bigint(20) unsigned NOT NULL AUTO_INCREMENT, `channel_id` varchar(100) NOT NULL, `guild_id` varchar(100) NOT NULL, `creator_id` varchar(100) NOT NULL, `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `ends_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `style` varchar(1000) NOT NULL, `award` int(11) NOT NULL DEFAULT '1', `recurring` tinyint(1) NOT NULL DEFAULT '0', `users` varchar(100) NOT NULL DEFAULT '{}', PRIMARY KEY (`channel_id`), UNIQUE KEY `index` (`index`)) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    connection.execute("CREATE TABLE IF NOT EXISTS `pending_kudos` ( `index` bigint(20) unsigned NOT NULL AUTO_INCREMENT, `unique_id` varchar(200) NOT NULL, `target_id` varchar(100) NOT NULL, `from_id` varchar(100) NOT NULL, `amount` int(11) NOT NULL, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY `index` (`index`)) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    setInterval(async () => {
        await connection?.execute("DELETE FROM pending_kudos WHERE updated_at <= CURRENT_TIMESTAMP - interval '1 week'").catch(console.error)
    }, 1000 * 60 * 60 * 24)
}

const stable_horde_manager = new StableHorde({
    default_token: client.config.default_token,
    cache_interval: 1000,
    cache: {
        models: 1000 * 10,
        performance: 1000 * 10,
        teams: 1000 * 10
    },
    client_agent: `ZeldaFan-Discord-Bot:${client.bot_version}:https://github.com/ZeldaFan0225/Stable_Horde_Discord`
})

client.login(process.env["DISCORD_TOKEN"])

if(client.config.logs?.enabled) {
    client.initLogDir()
}

if(!existsSync(`${process.cwd()}/node_modules/webp-converter/temp`)) {
    mkdirSync("./node_modules/webp-converter/temp")
}


client.on("ready", async () => {
    client.commands.loadClasses().catch(console.error)
    client.components.loadClasses().catch(console.error)
    client.contexts.loadClasses().catch(console.error)
    client.modals.loadClasses().catch(console.error)
    client.user?.setPresence({activities: [{type: ActivityType.Listening, name: "to your generation requests | https://stablehorde.net"}], status: PresenceUpdateStatus.DoNotDisturb, })
    if(client.config.generate?.enabled) await client.loadHordeStyles()
    console.log(`Ready`)
    await client.application?.commands.set([...client.commands.createPostBody(), ...client.contexts.createPostBody()]).catch(console.error)
    if((client.config.advanced_generate?.user_restrictions?.amount?.max ?? 4) > 10) throw new Error("More than 10 images are not supported in the bot")
    if(client.config.filter_actions?.guilds?.length && (client.config.filter_actions?.mode !== "whitelist" && client.config.filter_actions?.mode !== "blacklist")) throw new Error("The actions filter mode must be set to either whitelist, blacklist.")
    if(client.config.advanced?.pre_check_prompts_for_suspicion?.enabled && !process.env["OPERATOR_API_KEY"]) throw new Error("The OPERATOR_API_KEY in the .env is required when pre checking prompts for being suspicious")
    if(client.config.party?.enabled && !client.config.generate?.enabled) throw new Error("When party is enabled the /generate command also needs to be enabled")

    if(client.config.party?.enabled && connection) {
        await client.cleanUpParties(connection)
        setInterval(async () => await client.cleanUpParties(connection), 1000 * 60 * 5)
    }
})

if(client.config.react_to_transfer?.enabled) client.on("messageReactionAdd", async (r, u) => await handleMessageReact(r as PartialMessageReaction, u as PartialUser, client, connection, stable_horde_manager).catch(console.error))

client.on("interactionCreate", async (interaction) => {
    switch(interaction.type) {
        case InteractionType.ApplicationCommand: {
            switch(interaction.commandType) {
                case ApplicationCommandType.ChatInput: {
                    return await handleCommands(interaction, client, connection, stable_horde_manager).catch(console.error);
                }
                case ApplicationCommandType.User:
                case ApplicationCommandType.Message: {
                    return await handleContexts(interaction, client, connection, stable_horde_manager).catch(console.error);
                }
            }
        };
        case InteractionType.MessageComponent: {
			return await handleComponents(interaction, client, connection, stable_horde_manager).catch(console.error);
        };
        case InteractionType.ApplicationCommandAutocomplete: {
			return await handleAutocomplete(interaction, client, connection, stable_horde_manager).catch(console.error);
        };
        case InteractionType.ModalSubmit: {
			return await handleModals(interaction, client, connection, stable_horde_manager).catch(console.error);
        };
    }
})