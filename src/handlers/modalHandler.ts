import StableHorde from "@zeldafan0225/stable_horde";
import { ModalSubmitInteraction } from "discord.js";
import mariadb from "mariadb";
import { StableHordeClient } from "../classes/client";
import { ModalContext } from "../classes/modalContext";

export async function handleModals(interaction: ModalSubmitInteraction, client: StableHordeClient, database: mariadb.Pool | undefined, stable_horde_manager: StableHorde) {
    const command = await client.modals.getModal(interaction).catch(() => null)
    if(!command) return;
    let context = new ModalContext({interaction, client, database, stable_horde_manager})

    return await command.run(context).catch(console.error)
}