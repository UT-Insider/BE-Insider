import { Injectable, Logger } from '@nestjs/common';
import { Context, On, Once, ContextOf } from 'necord';
import { Client, MessageReaction, User } from 'discord.js';
import axios from 'axios';

@Injectable()
export class AppUpdate {
  private readonly logger = new Logger(AppUpdate.name);

  public constructor(private readonly client: Client) {}

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  @On('messageReactionAdd')
  public async onReactionAdd(
    @Context() [reaction, user]: [MessageReaction, User],
  ) {
    this.logger.log(`Reaction added: ${reaction.emoji.name} by ${user.tag}`);
    axios.post(process.env.SIA_BE, {
      query: `mutation addInsiderPointFromDiscord($secret: String, $content: String, $discordUsername: String, $type:String) {
        addInsiderPointFromDiscord(secret: $secret, content: $content, discordUsername: $discordUsername, type: $type)
      }
      `,
      variables: {
        secret: '342234',
        type: 'reactionAdd',
        discordUsername: user.tag,
      },
    });
  }

  @On('messageReactionRemove')
  public async onReactionRemove(
    @Context() [reaction, user]: [MessageReaction, User],
  ) {
    this.logger.log(`Reaction removed: ${reaction.emoji.name} by ${user.tag}`);
    axios.post(process.env.SIA_BE, {
      query: `mutation addInsiderPointFromDiscord($secret: String, $content: String, $discordUsername: String, $type:String) {
        addInsiderPointFromDiscord(secret: $secret, content: $content, discordUsername: $discordUsername, type: $type)
      }
      `,
      variables: {
        secret: '342234',
        type: 'reactionRemove',
        discordUsername: user.tag,
      },
    });
  }

  @On('messageCreate')
  public async createMessage(@Context() [message]: ContextOf<'messageCreate'>) {
    // Kamu bisa akses properti dari message di sini
    this.logger.log(
      `Received message: ${message.content} from ${message.author.tag} | ${message.channelId}`,
    );

    if (message.guild) {
      // Dapatkan member dari message
      const member = message.guild.members.cache.get(message.author.id);
      console.log(member.roles.cache.map((item) => item.name));
      // Cek apakah member punya role "verified"
      if (
        member &&
        member.roles.cache.some((role) => role.name === 'Verified')
      ) {
        this.logger.log(`${message.author.tag} is verified!`);
      } else {
        this.logger.log(`${message.author.tag} is not verified!`);
      }
    }

    axios.post(process.env.SIA_BE, {
      query: `mutation addInsiderPointFromDiscord($secret: String, $content: String, $discordUsername: String) {
        addInsiderPointFromDiscord(secret: $secret, content: $content, discordUsername: $discordUsername)
      }
      `,
      variables: {
        secret: '342234',
        content: message.content,
        discordUsername: message.author.tag,
      },
    });

    // console.log(message);
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }
}
