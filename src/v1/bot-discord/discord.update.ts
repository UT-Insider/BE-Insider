import { Injectable, Logger } from '@nestjs/common';
import { Context, On, Once, ContextOf } from 'necord';
import {
  Client,
  GuildBasedChannel,
  MessageReaction,
  MessageType,
  User,
} from 'discord.js';
import axios from 'axios';

@Injectable()
export class AppUpdate {
  public constructor(private readonly client: Client) {}

  private readonly logger = new Logger(AppUpdate.name);

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

  @On('threadCreate')
  public async createThread(@Context() [thread]: ContextOf<'threadCreate'>) {
    /**
     * 👉 Point kontribusi tambahan jika create forum diskusi
     */
    const channelPoints = {
      '💡︱sharing-idea': 500,
      '😥︱laporan': 400,
      '📚︱sharing-materi': 400,
      '📅︱sharing-event': 320,
    };
    const parentId = thread.parentId; // Ini ID dari channel parent

    if (parentId) {
      const channel = this.client.channels.cache.get(
        parentId,
      ) as GuildBasedChannel;

      if (channel) {
        this.logger.log(`Thread baru dibuat di channel ${channel.name}`);
      }

      const ownerId = thread.ownerId;
      const messages = await thread.messages.fetch({ limit: 1 });
      const title = thread.name;
      const content = messages.first();

      // Dapatkan user dari cache
      const owner = this.client.users.cache.get(ownerId);

      console.log('author', owner.tag);

      const isAllowedForum = [
        '💡︱sharing-idea',
        '😥︱laporan',
        '📚︱sharing-materi',
        '📅︱sharing-event',
      ].includes(channel.name);

      if (isAllowedForum) {
        this.logger.log(
          `Ada post baru di forum dari user ${owner.tag}: ${thread.name}`,
        );
        this.addPointsToInsider({
          content: `##${title}\n${content}`,
          guildId: thread.guildId,
          point: channelPoints[channel.name],
          userTag: owner.tag,
        }).catch((err) => {
          console.log(err);
        });
      }
    }
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
        try {
          await member.roles.add(role.connected);
          await member.roles.remove(role.notConnected);
          this.logger.log(`Added role "Connected" to ${message.author.tag}`);
        } catch (error) {
          this.logger.error('The Role need to be predefined!');
        }
      })
      .catch(async () => {
        try {
          if (!role.internal) {
            await member.roles.add(role.notConnected);
            await member.roles.remove(role.connected);
            this.logger.log(`Remove role "Connected" to ${message.author.tag}`);
          }
        } catch (error) {
          this.logger.error('The Role need to be predefined!');
        }
      });
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  // pantau member left/join voice channel
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

  async addPointsToInsider({
    guildId,
    userTag,
    point,
    content,
  }: {
    guildId: string;
    userTag: string;
    point: number;
    content: string;
  }) {
    const guild = this.client.guilds.cache.get(guildId);
    const member = guild.members.cache.find((m) => m.user.tag === userTag);

    const role = {
      connected: guild.roles.cache.find((role) => role.name === 'Connected'),
      notConnected: guild.roles.cache.find(
        (role) => role.name === 'Not Connected',
      ),
      internal: guild.roles.cache.find((role) => role.name === 'Internal'),
    };

    await axios
      .post(process.env.URL_SIA_BE, {
        query: `
          mutation addInsiderPointFromDiscord(
            $secret: String
            $content: String
            $discordUsername: String
            $additionalPoint: Int!
            $type: String
          ) {
            addInsiderPointFromDiscord(
              secret: $secret
              content: $content
              discordUsername: $discordUsername
              additionalPoint: $additionalPoint
              type: $type
            )
          }
        `,
        variables: {
          secret: process.env.SECRET_AUTH,
          content: content,
          additionalPoint: point,
          discordUsername: userTag,
          type: 'threadAdd',
        },
      })
      .then(async (res) => {
        if (res.data.errors) {
          throw 'Error Graphql';
        }
        try {
          await member.roles.add(role.connected);
          await member.roles.remove(role.notConnected);
          this.logger.log(`Added role "Connected" to ${userTag}`);
        } catch (error) {
          this.logger.error('The Role need to be predefined!');
        }
      })
      .catch(async () => {
        try {
          if (!member.roles.cache.some((role) => role.name === 'Internal')) {
            await member.roles.add(role.notConnected);
            await member.roles.remove(role.connected);
            this.logger.log(`Remove role "Connected" to ${userTag}`);
          }
        } catch (error) {
          this.logger.error('The Role need to be predefined!');
        }
      });
  }
}
