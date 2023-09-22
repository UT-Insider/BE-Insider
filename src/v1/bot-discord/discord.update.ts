import { Injectable, Logger } from '@nestjs/common';
import { Context, On, Once, ContextOf } from 'necord';
import { Client, VoiceState, MessageReaction, User } from 'discord.js';
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
    axios.post(process.env.URL_SIA_BE, {
      query: `mutation addInsiderPointFromDiscord($secret: String, $content: String, $discordUsername: String, $type:String) {
        addInsiderPointFromDiscord(secret: $secret, content: $content, discordUsername: $discordUsername, type: $type)
      }
      `,
      variables: {
        secret: process.env.SECRET_AUTH,
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
    axios.post(process.env.URL_SIA_BE, {
      query: `mutation addInsiderPointFromDiscord($secret: String, $content: String, $discordUsername: String, $type:String) {
        addInsiderPointFromDiscord(secret: $secret, content: $content, discordUsername: $discordUsername, type: $type)
      }
      `,
      variables: {
        secret: process.env.SECRET_AUTH,
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

    const member = message.guild.members.cache.get(message.author.id);

    const role = {
      connected: message.guild.roles.cache.find(
        (role) => role.name === 'Connected',
      ),
      notConnected: message.guild.roles.cache.find(
        (role) => role.name === 'Not Connected',
      ),
      internal: message.guild.roles.cache.find(
        (role) => role.name === 'Internal',
      ),
    };

    await axios
      .post(process.env.URL_SIA_BE, {
        query: `mutation addInsiderPointFromDiscord($secret: String, $content: String, $discordUsername: String) {
        addInsiderPointFromDiscord(secret: $secret, content: $content, discordUsername: $discordUsername)
      }
      `,
        variables: {
          secret: process.env.SECRET_AUTH,
          content: message.content,
          discordUsername: message.author.tag,
        },
      })
      .then(async (res) => {
        if (res.data.errors) {
          throw 'Error Graphql';
        }

        await member.roles.add(role.connected);
        await member.roles.remove(role.notConnected);
        this.logger.log(`Added role "Connected" to ${message.author.tag}`);
      })
      .catch(async () => {
        if (!role.internal) {
          await member.roles.add(role.notConnected);
          await member.roles.remove(role.connected);
          this.logger.log(`Remove role "Connected" to ${message.author.tag}`);
        }
      });
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  // pantai member left/join voice chanenl
  @On('voiceStateUpdate')
  public async onVoiceStateUpdate(
    @Context() [before, after]: ContextOf<'voiceStateUpdate'>,
  ) {
    const member = after.member || before.member; // Njumuk objek member sing join/left voice
    const userId = member.id;
    if (before.channel && !after.channel) {
      //left
      this.logger.log(`User ${userId} left a voice channel`);
    } else if (!before.channel && after.channel) {
      //join
      this.logger.log(`User ${userId} joined a voice channel`);
    }
  }
}
