import Discord, {Client, IntentsBitField, Partials, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import mongoose, { set } from 'mongoose';
import cron from 'node-cron';


import env from 'dotenv'
env.config();
const token = process.env.TOKEN;
const channelId = process.env.CHANNEL_ID;;
const guildId = process.env.GUILD_ID;
const mongo = process.env.MONGO;
const freeBotChannels = ["1108904580357566534", "1108904631800713216", "1108904754580561950"]
const vipApi = process.env.VIP_API;
const vipRoleId = "1108904580357566534"


const client = new Client( {
    intents: [IntentsBitField.Flags.Guilds, 
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.DirectMessages,

    ],
    partials: [
      Partials.Channel,
      Partials.Message
    ]
 });


// Connect to MongoDB
const mongoconnect = mongoose.connect(mongo, {

  useNewUrlParser: true,
  useUnifiedTopology: true,
  });
  
  mongoconnect.then(() => {
  console.log('Connected to MongoDB.');
  }).catch((err) => {
  console.log('Error connecting to MongoDB: ', err);
  });
  

  const userUsageSchema = new mongoose.Schema({
    userName: String,
    userId: String,
    freeUses: Number,
    isVip: Boolean,
    vipExpiration: Date,
    botUses: Number,
  });

  const apiURLs = new mongoose.Schema({
    freeApiURL: String,
    freeApiLive: Boolean,
    vipApiURL: String,
    vipApiLive: Boolean,
    date: Date,
    
  });




  const apiURLsModel = mongoose.model('apiURLs', apiURLs);


  const preSetApiURLs = await apiURLsModel.findOne({}).sort({ _id: -1 }).limit(1).exec();
  if (!preSetApiURLs) {

  const newApiUrls = new apiURLsModel({
    freeApiURL: "https://d1bf-34-80-70-142.ngrok-free.app/process_audio",
    freeApiLive: false,
    vipApiURL: vipApi,
    vipApiLive: true,
    date: Date.now(),
  });
await newApiUrls.save();
  }

  const userUsage = mongoose.model('userUsage', userUsageSchema);

  async function freeBot(model, audioUrl, audioName, interaction, user, userOnDatabase, apiURL) {
    
    // decrease free uses by 1
    userOnDatabase.botUses += 1
    userOnDatabase.freeUses -= 1
    const f0Method = "crepe-tiny"
    const hopLength = 256
    const pitch = interaction.options.getNumber('pitch') || 0;
    await interaction.deferReply();   
    try {
      const audioFile = await axios.get(audioUrl, { responseType: 'arraybuffer' });

      const config = { 
        command: model,
        f0Method: f0Method,
        hopLength: hopLength,
        pitch: pitch
      }
      const formData = new FormData();
      formData.append('inputAudio', audioFile.data, audioName);
      formData.append('config', JSON.stringify(config));

      const processingEmbed = new EmbedBuilder()
        .setTitle('Processing')
        .setDescription(`Please wait.... :hourglass: ${user}`)
        .setTimestamp()
        .setColor('#0099ff')
        .addFields( { name: 'model', value: `${model}`, inline: true },
                    { name: 'Audio', value: `${audioName}`, inline: true },
                    

        );
        await interaction.editReply({ embeds: [processingEmbed] });
  
      const response = await axios.post(apiURL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'arraybuffer'
      });
  
      const audioBuffer = await Buffer.from(response.data);
      const processingDone = new EmbedBuilder()
      .setTitle(`Done`)
      .setDescription(`Process Done ${user}`)
      .setTimestamp()
      .setColor('#0099ff')
      .addFields( { name: 'Model', value: `${model}`, inline: true },
                    { name: 'Audio', value: `${audioName}`, inline: true },
                    
      
      )
      .addFields( { name: 'Free Uses Left', value: `${userOnDatabase.freeUses}` }, );
      
      const doneMsg = await interaction.editReply({ embeds: [processingDone], 
        

    });
       doneMsg.reply({ content: `${user} Your audio is ready`, files: [{ attachment: audioBuffer, name: `${model}-${audioName}` }]})
    userOnDatabase.save()
    return true
    } catch (error) {
        const errorEmbed = new EmbedBuilder()
        .setTitle(`Error`)
        .setDescription(`${error.code}`)
        .setTimestamp()

      console.error(error.code);
      interaction.editReply({ embeds: [errorEmbed] });
      return false
    }
  }


    async function vipBot(model, audioUrl, audioName, interaction, user, userOnDatabase, apiURL) {
     userOnDatabase.botUses += 1
     const f0Method = "crepe"
     const hopLength = 128
      const pitch = interaction.options.getNumber('pitch') || 0;
     await interaction.deferReply( { ephemeral: true });   
     try {
       const audioFile = await axios.get(audioUrl, { responseType: 'arraybuffer' });
 
       const config = { 
         command: model,
         f0Method: f0Method,
         hopLength: hopLength,
          pitch: pitch
       }
       const formData = new FormData();
       formData.append('inputAudio', audioFile.data, audioName);
       formData.append('config', JSON.stringify(config));
 
       const processingEmbed = new EmbedBuilder()
         .setTitle('Processing')
         .setDescription(`Please wait.... :hourglass: ${user}`)
         .setTimestamp()
         .setColor('#0099ff')
         .addFields( { name: 'model', value: `${model}`, inline: true },
                     { name: 'Audio', value: `${audioName}`, inline: true },
                     
 
         );
         await interaction.editReply({ embeds: [processingEmbed], ephemeral: true });  
   
       const response = await axios.post(apiURL, formData, {
         headers: {
           'Content-Type': 'multipart/form-data'
         },
         responseType: 'arraybuffer'
       });
   
       const audioBuffer = await Buffer.from(response.data);
       const processingDone = new EmbedBuilder()
       .setTitle(`Done`)
       .setDescription(`Process Done ${user}`)
       .setTimestamp()
       .setColor('#0099ff')
       .addFields( { name: 'Model', value: `${model}`, inline: true },
                     { name: 'Audio', value: `${audioName}`, inline: true },
                     
       
       )
       
       await interaction.editReply({ embeds: [processingDone], ephemeral: true});
       
     interaction.followUp({ content: `${user} Your audio is ready`, files: [{ attachment: audioBuffer, name: `${model}-${audioName}` }], ephemeral: true})
     userOnDatabase.save()
     return true
     } catch (error) {
         const errorEmbed = new EmbedBuilder()
         .setTitle(`Error`)
         .setDescription(`${error.code}`)
         .setTimestamp()
 
       console.error(error.code);
       interaction.editReply({ embeds: [errorEmbed], ephemeral: true});
       return false
     }
  }



  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;


// check if user is in database, if not add user to database, and set count to 0
    const getUserOnDataabase = await userUsage.findOne({ userId: interaction.user.id });
    if (!getUserOnDataabase) {
      const newUser = new userUsage({
        userName: interaction.user.username,
        userId: interaction.user.id,
        freeUses: 10,
        isVip: false,
        vipExpiration: null,
        botUses: 0,

      });
      await newUser.save();
    }
  
    const userOnDatabase = await userUsage.findOne({ userId: interaction.user.id });
    const isVip = userOnDatabase.isVip
    if (interaction.commandName === 'ai') {
       // check if the command is in on the channels array
      if (!freeBotChannels.includes(interaction.channelId) && !isVip) {
        const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`This command is not allowed in this channel`)
        .addFields( { name: 'Allowed Channels', value: `<#${freeBotChannels[0]}> | <#${freeBotChannels[1]}> | <#${freeBotChannels[2]}>` }, )
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      // check if user has reached daily limit
      if (userOnDatabase.freeUses <= 0 && !isVip) {
       const embed = new EmbedBuilder()
        .setTitle('Daily Limit')
        .setDescription('You have reached your daily limit, please buy VIP or try again tomorrow')
        .setTimestamp()
        .setColor('#0099ff')
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      // get the latest api url from the database
      const GetApiURLs = await apiURLsModel.findOne({}).sort({ _id: -1 }).limit(1).exec();

      if (!GetApiURLs.freeApiLive && !isVip) {
        const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`The free bot is currently down, please buy VIP or try again later`)
        .setTimestamp()
        .setColor('#0099ff')

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      if (!GetApiURLs.vipApiLive && isVip) {
        const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`The vip bot is currently down, please try again later`)
        .setTimestamp()
        .setColor('#0099ff')

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
// if the free bot is dlive both vip and free users can use the free api, if the vip bot is live only vip users can use the vip api

      const apiURL = (GetApiURLs.freeApiLive) ? `${GetApiURLs.freeApiURL}/process_audio` : GetApiURLs.vipApiURL;

       console.log(`using ${apiURL} for ${interaction.user.username} `)
      const model = interaction.options.getString('model');
      const audio = interaction.options.get('audio');
      const audioUrl = audio.attachment.url;
      const audioName = audio.attachment.name
      const user = interaction.user;
  
      // check if the attachment is audio
      if (!audioName.endsWith('.mp3') && !audioName.endsWith('.wav')) {
        return interaction.reply('Please upload a valid audio file mp3/wav.', { ephemeral: true });
      }

     
      
      if (isVip) {
        return await vipBot(model, audioUrl, audioName, interaction, user, userOnDatabase, apiURL);
      } else {
        return await freeBot(model, audioUrl, audioName, interaction, user, userOnDatabase, apiURL);

      }


    } 

    // a slash command for admins to activate a vip subscription for a user, it takes a user mention and a number of days as arguments
    if (interaction.commandName === 'vip') {
      if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({ content: 'You do not have permission to use this command', ephemeral: true });
      }
 

      const user = interaction.options.getUser('user');
      const days = interaction.options.getNumber('days');
      const vipRole = interaction.guild.roles.cache.find(role => role.name === 'VIP');
      const member = interaction.guild.members.cache.get(user.id);
      await member.roles.add(vipRole);
      const checkUser = await userUsage.findOne({ userId: user.id });

      if (!checkUser) {
        const newUser = new userUsage({
          userName: user.username,
          userId: user.id,
          freeUses: 10,
          isVip: true,
          vipExpiration: Date.now() + days * 86400000,
          botUses: 0,
        });
        await newUser.save();
        await interaction.reply({ content: `${user} is added to the database as a VIP for ${days} days`, ephemeral: true });
        const vipChannel = interaction.guild.channels.cache.get('1110297639049773116');
        return  vipChannel.send({ content: `Welcome ${user} to VIP!` });
      } else if (checkUser.isVip) {
        const newExpiration = new Date(checkUser.vipExpiration);
        newExpiration.setDate(newExpiration.getDate() + days);
        checkUser.vipExpiration = newExpiration;
        await checkUser.save();
        const totalDays = Math.round((checkUser.vipExpiration - Date.now()) / 86400000);
        await interaction.reply({ content: `${user} was already a VIP, their new expiration date is ${totalDays} days from now`, ephemeral: true });
      } else {
        checkUser.isVip = true;
        checkUser.vipExpiration = Date.now() + days * 86400000;
        await checkUser.save();
        await interaction.reply({ content: `${user} is now a VIP for ${days} days`, ephemeral: true });
        const vipChannel = interaction.guild.channels.cache.get('1110297639049773116');
        return  vipChannel.send({ content: `Welcome ${user} to VIP!` });
      }
      // add a vip role to the user, and send a welcom message in the vip channel 1110297639049773116


    }

    // a slash command for admins to to update the api urls
    if (interaction.commandName === 'updatefreeapi') {
      if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({ content: 'You do not have permission to use this command', ephemeral: true });
      }
      
      const freeApiLive = interaction.options.getBoolean('islive');
      if (freeApiLive) {
        const freeApiURL = interaction.options.getString('url');
        const GetApiURLs = await apiURLsModel.findOne({}).sort({ _id: -1 }).limit(1).exec();
        const newApiURLs = new apiURLsModel({
          freeApiURL: (freeApiURL || GetApiURLs.freeApiURL),
          freeApiLive: freeApiLive,
          vipApiURL: GetApiURLs.vipApiURL,
          vipApiLive: GetApiURLs.vipApiLive,
        });
        await newApiURLs.save();
        return interaction.reply({ content: `Free API is now live, the new url is ${freeApiURL}`, ephemeral: true });
      } else {
        const GetApiURLs = await apiURLsModel.findOne({}).sort({ _id: -1 }).limit(1).exec();
        const newApiURLs = new apiURLsModel({
          freeApiURL: GetApiURLs.freeApiURL,
          freeApiLive: freeApiLive,
          vipApiURL: GetApiURLs.vipApiURL,
          vipApiLive: GetApiURLs.vipApiLive,
        });
        await newApiURLs.save();
        return interaction.reply({ content: `Free API is now down`, ephemeral: true });
      }

      
    }
  });
     


  client.on('messageCreate', async message => {
    if (message.author.bot) return;
    // delete messages in the bot channels that are not commands
    if (freeBotChannels.includes(message.channelId) && !message.content.startsWith('/')) {
      return message.delete();
    }
  });




  // verify subscriptions every midnight, and remove expired subscriptions
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Checking for expired subscriptions');
    
    const currentTime = Date.now();
    
    // Find users with expired subscriptions
    const expiredUsers = await userUsage.find({ isVip: true, vipExpiration: { $lt: currentTime } });
    
    // Process each expired user
    for (const user of expiredUsers) {
      user.isVip = false;
      user.vipExpiration = null;
      await user.save();
      console.log(`Removed VIP from ${user.userName}`);
      // remove vip role from user, by finding the role named vip and removing it from the user
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(user.userId);
      const vipRole = member.guild.roles.cache.find((r) => r.name === 'VIP');
      member.roles.remove(vipRole);
      console.log(`Removed VIP role from ${user.userName}`);

    }
    
  } catch (error) {
    console.error(error);
  }
  });




// Schedule the reset task to reset the users free uses every midnight

cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Resetting free uses');
      // Update the freeUses to 0 for all documents in the userUsage collection
      await userUsage.updateMany({} , { $set: { freeUses: 10 } });
      console.log('Reset free uses for all users');
    } catch (error) {
      console.error(error);
    }
  });


  /// every minute check if the free api is live or not by sending a request to /health, if not live, change the freeApiLive to false
cron.schedule('* * * * *', async () => {

    const GetApiURLs = await apiURLsModel.findOne({}).sort({ _id: -1 }).limit(1).exec();
      const freeApiURL = GetApiURLs.freeApiURL;
      const mfrender = await axios.get(`https://rvcdsicordbot2x.onrender.com`);
      console.log(`mfrender is live, it responded with ${mfrender.status} status code`);
      if (GetApiURLs.freeApiLive) {
    try {
      
      const response = await axios.get(`${freeApiURL}/health`);
      
      if (response.status === 200) {
        console.log(`${freeApiURL} is live, it responded with ${response.status} status code`);
      } else {
        GetApiURLs.freeApiLive = false;
        await GetApiURLs.save();
        console.log('not responding, Free API is down');
      }
    } catch (error) {
      console.log('error message, Free API is down');
      GetApiURLs.freeApiLive = false;
      await GetApiURLs.save();
      
    }
} else {
  console.log('Free API is down, please update the url');
}

});

  

 
client.login(token);