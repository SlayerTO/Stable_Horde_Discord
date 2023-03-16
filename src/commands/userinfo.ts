import { ButtonBuilder, Colors, EmbedBuilder, SlashCommandBuilder, SlashCommandUserOption } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("userinfo")
    .setDMPermission(false)
    .setDescription(`Shows information on your ai horde account`)
    .addUserOption(
        new SlashCommandUserOption()
        .setName("user")
        .setDescription("The user to view")
        .setRequired(false)
    )

export default class extends Command {
    constructor() {
        super({
            name: "userinfo",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})
        const user = ctx.interaction.options.getUser("user")?.id ?? ctx.interaction.user.id
        let token = await ctx.client.getUserToken(user, ctx.database)
        if(!token && ctx.interaction.options.getUser("user")?.id) return ctx.error({error: "The user has not added their token"})
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
            content: `Please add your token before your user details can be shown.\nThis is needed to perform actions on your behalf\n\nBy entering your token you agree to the ${await ctx.client.getSlashCommandTag("terms")}\n**You agree to not upload or generate any illegal content**${!ctx.client.config.advanced?.encrypt_token ? "\n\n**The bot is configured not to save your token in an encrypted form!**" : ""}\n\n\nDon't know what the token is?\nCreate an ai horde account here: https://aihorde.net/register`,
            components: [{type: 1, components: [add_token_button.toJSON()]}],
            ephemeral: true
        })

        await ctx.interaction.deferReply()

        const user_data = await ctx.ai_horde_manager.findUser({token}).catch(() => null)
        
        const member = await ctx.interaction.guild?.members.fetch(user).catch(console.error)
        if(member) {
            let apply_roles = []
            if (ctx.client.checkGuildPermissions(ctx.interaction.guildId, "apply_roles_to_worker_owners") && user_data?.worker_ids?.length && ctx.client.config.apply_roles_to_worker_owners?.length) apply_roles.push(...ctx.client.config.apply_roles_to_worker_owners)
            if (ctx.client.checkGuildPermissions(ctx.interaction.guildId, "apply_roles_to_trusted_users") && user_data?.trusted && ctx.client.config.apply_roles_to_trusted_users?.length) apply_roles.push(...ctx.client.config.apply_roles_to_trusted_users)
    
            apply_roles = apply_roles.filter(r => !member?.roles.cache.has(r))
            if(apply_roles.length) await member?.roles.add(apply_roles).catch(console.error)
        }


        if(!user_data) return ctx.error({
            error: `Unable to find user for saved token.\nUpdate your token with ${await ctx.client.getSlashCommandTag("updatetoken")}`,
            codeblock: false
        })
        const props = []
        if(user_data.moderator) props.push("⚔️ Moderator")
        if(user_data.trusted) props.push("🤝 Trusted")
        if(user_data.flagged) props.push(`🚩 Flagged`)
        const embed = new EmbedBuilder({
            color: Colors.Blue,
            footer: {text: `${props.join(" | ")}`},
            title: `${user_data.username}`,
            description: `Images Requested \`${(user_data.records?.request?.image || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\` (\`${(user_data.records?.usage?.megapixelsteps || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\` Megapixelsteps)
Images Generated \`${(user_data.records?.fulfillment?.image || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\` (\`${(user_data.records?.contribution?.megapixelsteps || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\` Megapixelsteps)
Interrogation Requested \`${(user_data.records?.request?.interrogation || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\`
Interrogation Generated \`${(user_data.records?.fulfillment?.interrogation || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\`
Text Requested \`${(user_data.records?.request?.text || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\`
Text Generated \`${(user_data.records?.fulfillment?.text || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\`

**Kudos**
Total \`${(user_data.kudos || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\`
Accumulated \`${(user_data.kudos_details?.accumulated || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\`
Gifted \`${(user_data.kudos_details?.gifted || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\`
Admin \`${(user_data.kudos_details?.admin || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\`
Received \`${(user_data.kudos_details?.received || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\`
Recurring \`${(user_data.kudos_details?.recurring || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\`

**Workers**
Invited \`${(user_data.worker_invited || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\`
Contributing \`${(user_data.worker_count || 0).toLocaleString('en-us', {minimumFractionDigits: 0})}\``,
        })

        ctx.interaction.editReply({
            embeds: [embed.toJSON()],
            components: [{
                type: 1,
                components: [delete_btn.toJSON()]
            }]
        })
    }
}