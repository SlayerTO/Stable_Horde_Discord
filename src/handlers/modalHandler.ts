import AIHorde from "@zeldafan0225/ai_horde";
import { ModalSubmitInteraction } from "discord.js";
import mariadb from "mariadb";
import { AIHordeClient } from "../classes/client";
import { ModalContext } from "../classes/modalContext";

export async function handleModals(interaction: ModalSubmitInteraction, client: AIHordeClient, database: mariadb.Pool | undefined, stable_horde_manager: AIHorde) {
    const command = await client.modals.getModal(interaction).catch(() => null)
    if(!command) return;
    let context = new ModalContext({interaction, client, database, ai_horde_manager})

    return await command.run(context).catch(console.error)
}