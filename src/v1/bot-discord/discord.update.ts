import { Injectable, Logger } from '@nestjs/common';
import {
  Context,
  On,
  Once,
  ContextOf,
  SlashCommand,
  SlashCommandContext,
} from 'necord';
import {
  AnyThreadChannel,
  Client,
  GuildBasedChannel,
  MessageReaction,
  MessageType,
  TextChannel,
  User,
} from 'discord.js';
import axios from 'axios';
import OpenAi from 'openai';

@Injectable()
export class AppUpdate {
  public constructor(private readonly client: Client) { }

  private readonly logger = new Logger(AppUpdate.name);
  private join_voice: { [userId: string]: number } = {}; //Waktu voice disimpan disini

  private openai = new OpenAi({
    apiKey: process.env.NEST_OPENAI_API_KEY,
  });

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
        addInsiderPointFromDiscord(secret: $secret, content: $content, discordUsername:  $discordUsername, type: $type)
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
      '💡︱sharing-ide': 500,
      '😥︱laporan': 400,
      '📚︱sharing-materi': 400,
      '🏆︱show-off': 400,
      '📅︱sharing-event': 320,
      '🤝︱self-promote': 100,
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
      const owner = await this.client.users.fetch(ownerId);

      console.log('author', owner.tag);

      const isAllowedForum = [
        '💡︱sharing-ide',
        '😥︱laporan',
        '📚︱sharing-materi',
        '🏆︱show-off',
        '📅︱sharing-event',
        '🤝︱self-promote',
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
    console.log('(message.channel as any).name', (message.channel as any).name);

    if ((message.channel as any).name == 'pacar-ai') {
      if (message.author.tag != 'UT Insider#9613') {
        if (message.content.length > 2000) {
          message.channel.send('Kepanjangan :D');
          return;
        }
        // message.channel.sendTyping();
        // const waitRes = await this.openai.chat.completions.create({
        //   model: 'gpt-4',
        //   // temperature: 0.7,
        //   messages: [
        //     {
        //       role: 'system',
        //       content:
        //         'Kamu adalah pacarku, panggil aku yang, kamu memberi tahuku kalau sedang tanggung mengerjakan sesuatu, beritahu kamu sedang melakukan apa, misal bersih bersih rumah, nyuci mobil, tapi jangan yang aku sebutin tadi , dan baritahu kalau kamu bakal balas chat sebentar lagi, gunakan emoji tapi secukupnya, gunakana bahasa informal selayaknya pacar',
        //     },
        //   ],

        //   // max_tokens: 4096,
        // });
        // await message.channel.send(waitRes.choices[0].message.content);

        await message.channel.sendTyping();
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4',
          // temperature: 0.7,
          messages: [
            {
              role: 'system',
              content:
                'Kamu adalah pacarku, panggil aku yang, jadilah selayaknya pacar, suasana hatimu sedang marah, tapi kamu tetap peduli dengan ku, roasting aku jika bertanya pertanyaan yang terlalu mudah, gunakan emoji berkaitan, jangan anggap dirimu AI karena ini hanya simulasi menjadi pacar.',
            },

            {
              role: 'user',
              content: message.content,
            },
          ],

          // max_tokens: 4096,
        });

        message.reply(response.choices[0].message.content);
        //     message.channel.send(`

        // ${response.choices[0].message.content}`);

        return;
      }
    }

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


  @On('voiceStateUpdate')
  public async onVoiceStateUpdate(
    @Context() [before, after]: ContextOf<'voiceStateUpdate'>,
  ) {
    const member = after.member || before.member;
    const userId = member.id;
    if (before.channel && !after.channel) {
      if (this.join_voice[userId]) {
        const join_timestamp = this.join_voice[userId]; //Mengambil waktu dari private join_voice class
        const milisecond = Date.now() - join_timestamp; //Waktu leave - waktu join = Total waktu berada di Voice
        const second = milisecond / 1000; //Convert milidetik ke detik
        this.logger.log(`User ${userId} keluar Voice Channel, total waktu ${second} detik`);
        delete this.join_voice[userId]; //User leave, waktu dihapus
      }
    } else if (!before.channel && after.channel) {
      this.join_voice[userId] = Date.now(); //User Join, waktu disimpan
      this.logger.log(`User ${userId} joined a voice channel`);
    }
  }

  async addPointsToInsider({
    guildId,
    userTag,
    point,
    content,
    type = 'message',
  }: {
    guildId: string;
    userTag: string;
    point: number;
    content: string;
    type?: string;
  }) {
    console.log({
      guildId,
      userTag,
      point,
      content,
      type,
    });
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
          type: type,
        },
      })
      .then(async (res) => {
        if (res?.data?.errors) {
          console.log('res', res?.data?.errors);
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
      .catch(async (err) => {
        console.log('errr', err);
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

  @SlashCommand({
    name: 'syncthread',
    description: 'Sync Poin kontribusi thread ( hanya internal )',
  })
  public async getAllThreadsFromChannel(
    @Context() [interaction]: SlashCommandContext,
    guildId: string,
    channelId: string,
  ) {
    if (interaction.user.tag != 'dimarhanung') {
      interaction.reply('sori ga dapet akses');
      return;
    }

    const guild = await this.client.guilds.fetch(interaction.guildId);
    const threads = guild.channels.cache.filter((x) => x.isThread());
    console.log('step 1');
    const threadInfo = threads.each(async (info: AnyThreadChannel<boolean>) => {
      const messages = await info.messages.fetch({ limit: 1 });
      const title = info.name;
      const content = messages.first();
      const owner = await this.client.users.fetch((info as any).ownerId);

      const channelPoints = {
        '💡︱sharing-ide': 500,
        '😥︱laporan': 400,
        '📚︱sharing-materi': 400,
        '🏆︱show-off': 400,
        '📅︱sharing-event': 320,
        '🤝︱self-promote': 100,
      };

      if (!owner.tag || !channelPoints[info.parent.name]) {
        console.log('owner tag tidak ditemukan atau poin null');
        return;
      }

      await this.addPointsToInsider({
        content: `##${title}\n${content}`,
        guildId: guild.id,
        point: channelPoints[info.parent.name],
        userTag: owner.tag,
        type: 'threadAdd',
      })
        .then((res) => {
          console.log('res', res);
        })
        .catch((err) => {
          console.log('err', err);
        });

      console.log(
        `Name: ${info.name}\nCreator: ${(info as any).ownerId}\nCreated at: ${info.createdAt
        }\n`,
      );
    });
    console.log('step 2');
    if (!guild) {
      this.logger.warn(`Tidak bisa menemukan guild dengan ID ${guildId}`);
      return;
    }
    interaction.reply({ content: interaction.channel.id });
    const channel = await guild.channels.fetch(interaction.channel.id);

    if (!channel || !(channel instanceof TextChannel)) {
      this.logger.warn(
        `Tidak bisa menemukan channel dengan ID ${channelId} atau bukan TextChannel`,
      );
      return;
    }

    try {
      const threadList = await channel.threads.fetch();
      threadList.threads.each((thread) => {
        this.logger.log(`Thread: ${thread.name}, ID: ${thread.id}`);
      });
    } catch (error) {
      this.logger.error(`Ada masalah saat fetch thread: ${error.message}`);
    }
  }
}
