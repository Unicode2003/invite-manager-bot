import { Client, Command, GuildStorage, Message, Logger, logger } from 'yamdbf';
import { RichEmbed } from 'discord.js';
import { createEmbed, getMembersByInviteCodes } from '../utils/util';
import { inviteCodes, joins, members, sequelize } from '../sequelize';

export default class extends Command<Client> {
  @logger('Command')
  private readonly _logger: Logger;

  public constructor() {
    super({
      name: 'fake',
      aliases: ['fakes', 'cheaters', 'cheater', 'invalid'],
      desc: 'Show which person joined this server multiple times and by whom he was invited',
      usage: '<prefix>fake',
      callerPermissions: ['ADMINISTRATOR', 'MANAGE_CHANNELS', 'MANAGE_ROLES'],
      clientPermissions: ['MANAGE_GUILD'],
      guildOnly: true
    });
  }

  public async action(message: Message, args: string[]): Promise<any> {
    this._logger.log(`${message.guild.name} (${message.author.username}): ${message.content}`);

    const js = await joins.findAll({
      where: {
        guildId: message.guild.id
      },
      include: [
        members,
        {
          model: inviteCodes,
          as: 'exactMatch',
          include: [{ model: members, as: 'inviter' }]
        }
      ]
    });

    if (js.length > 0) {
      const suspiciousJoins = js
        .filter(j => j.totalJoins > 1)
        .sort((a, b) => a.totalJoins - b.totalJoins);

      const embed = new RichEmbed();
      embed.setTitle('Fake invites:');
      let description = '';

      for (let join of suspiciousJoins) {
        const invs: { [x: string]: number } = {};
        join.inviterIds.split(',').forEach((id: string) => {
          if (invs[id]) {
            invs[id]++;
          } else {
            invs[id] = 1;
          }
        });
        const invText = Object.keys(invs).map(id => `<@${id}> (**${invs[id]} times**)`).join(', ');
        description += `<@${join.memberId}> joined **${join.totalJoins} times**, invited by: ${invText}\n`;
      }
      if (suspiciousJoins.length === 0) {
        description = 'There have been no fake invites since the bot has been added to this server.';
      }
      embed.setDescription(description);
      createEmbed(message.client, embed);
      message.channel.send({ embed });
    } else {
      message.channel.send(`No fake invites detected so far.`);
    }
  }
}