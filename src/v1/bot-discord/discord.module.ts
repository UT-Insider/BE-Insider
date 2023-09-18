import { Module } from '@nestjs/common';
import { AppController } from './discord.controller';
import { AppService } from './discord.service';
import { ConfigModule } from '@nestjs/config';

// DISCORD BOT
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { AppCommands } from './discord.commands';
import { AppUpdate } from './discord.update';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    NecordModule.forRoot({
      token: process.env.DISCORD_TOKEN,
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.DirectMessages,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.DirectMessageReactions,
        IntentsBitField.Flags.GuildEmojisAndStickers,
      ],
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AppCommands, AppUpdate],
})
export class DiscordModule {}
