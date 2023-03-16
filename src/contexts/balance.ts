import { ApplicationCommandType, ButtonBuilder, Colors, ContextMenuCommandBuilder, EmbedBuilder } from "discord.js";
import { Context } from "../classes/context";
import { ContextContext } from "../classes/contextContext";

const command_data = new ContextMenuCommandBuilder()
    .setType(ApplicationCommandType.User)
    .setName("Balance")
    .setDMPermission(false)

export default class extends Context {
    constructor() {
        super({
            name: "Balance",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: ContextContext<ApplicationCommandType.User>): Promise<any> {
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})
        let token = await ctx.client.getUserToken(ctx.interaction.targetId, ctx.database)
        if(!token && ctx.interaction.targetId !== ctx.interaction.user.id) return ctx.error({error: "The user has not added their token"})
        const add_token_button = new ButtonBuilder({
            custom_id: "save_token",
            label: "Save Token",
            style: 1
        })
        const delete_btn = new ButtonBuilder({
            label: "Delete this message",
            custom_id: `delete_${ctx.interaction.user.id}`,
            style: 4
        })
        if(!token) return ctx.interaction.reply({
            content: `Please add your token before your user details can be shown.\nThis is needed to perform actions on your behalf\n\nBy entering your token you agree to the ${await ctx.client.getSlashCommandTag("terms")}\n\n\nDon't know what the token is?\nCreate an ai horde account here: https://aihorde.net/register`,
            components: [{type: 1, components: [add_token_button.toJSON()]}],
            ephemeral: true
        })

        const user_data = await ctx.ai_horde_manager.findUser({token}).catch(() => null)

        if(!user_data) return ctx.interaction.reply({
            content: "Unable to find user for saved token.",
            components: [{type: 1, components: [add_token_button.toJSON()]}],
            ephemeral: true
        })
        const props = []
        if(user_data.moderator) props.push("⚔️ Moderator")
        if(user_data.trusted) props.push("🤝 Trusted")
        if(user_data.flagged) props.push(`🚩 Flagged`)
        const embed = new EmbedBuilder({
            color: Colors.Blue,
            footer: {text: `${props.join(" | ")}`},
            title: `${user_data.username}`,
            description: `**Total Kudos:** ${(user_data.kudos).toLocaleString('en-us', {minimumFractionDigits: 0})}`,
        })

        ctx.interaction.reply({
            embeds: [embed.toJSON()],
            components: [{
                type: 1,
                components: [delete_btn.toJSON()]
            }]
        })
    }
}