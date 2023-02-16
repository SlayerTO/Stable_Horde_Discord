import StableHorde from "@zeldafan0225/stable_horde";
import { AutocompleteInteraction } from "discord.js";
import { AutocompleteContext } from "../classes/autocompleteContext";
import { StableHordeClient } from "../classes/client";
import mariadb from "mariadb";

export async function handleAutocomplete(interaction: AutocompleteInteraction, client: StableHordeClient, database: mariadb.Pool | undefined, stable_horde_manager: StableHorde) {
    const command = await client.commands.getCommand(interaction).catch(() => null)
    if(!command) return;
    const context = new AutocompleteContext({interaction, client, database, stable_horde_manager})
    if(!interaction.inGuild())
        return await context.error()
    if(!interaction.channel)
        return await context.error()
    return await command.autocomplete(context).catch(console.error)
}