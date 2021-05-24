require("dotenv").config();
const mongoose = require("mongoose");
const dayjs = require("dayjs");
const { Client, MessageEmbed } = require("discord.js");

const{ hourlyTask,dailyTask} = require('./Cron')
const {fetchState,fetchDistricts,fetchSlots} = require("./state")
const User = require("./user")
const welcome = require("./welcome")

const client = new Client();

const PREFIX = "$";
//to store states
var stateData = []
var districtData =[]
var slotData = []

//Database connection
mongoose.connect(process.env.DATABASE,{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false})
  .then(() => console.log("DB Connected"))
  .catch((error) => console.log("Error connecting DB",error));

mongoose.connection.on('error', err => console.log(err));

/*function search(nameKey, myArray){
    for (var i=0; i < myArray.length; i++) {
        if ((myArray[i].state_name ).toUpperCase()=== (nameKey).toUpperCase()) {
            return myArray[i].state_id;
        }
    }
}*/
//var resultObject = search("string 1", array);

client.on("ready", () => {
 // const state = await fetchState();
 
 (async() => {
  const state = await fetchState();
  stateData = state.states
  //console.log(stateData)
  })();

  hourlyTask.start()
  dailyTask.start()
  welcome(client)
});

const createUser = (tag,user_id, state_id, districtid) => {
  const options = {
    new: true,
    upsert: true,
  }
  if(state_id){
    User.findOneAndUpdate({tag: tag},{user_id,state_id, district_id: ""}, options, (err,user) => {
      if(err || !user){
        console.log("DB error while creating user")
      }else{
        console.log(user)
      }
    })
  }else{
    User.findOneAndUpdate({tag: tag},{district_id: districtid},options, (err,user) => {
      if(err || !user){
        console.log("DB error while adding district")
      }else{
        console.log(user)
      }
    })
  }
}
const addData = (tag,notify,notify_district_id,notify_age,date,daily_notify) => {
  notify_date = date ? date : dayjs().format("DD-MM-YYYY")
  User.findOneAndUpdate({tag},{notify,notify_district_id,notify_age,notify_date,daily_notify},{new: true},(err,user) => {
    if(err){
      console.log("DB error while adding date")
    }
    else{
      console.log(user)
    }
  })
}
const findData = (tag , field) => {
  return new Promise((resolve,reject)=>{
    User.findOne({tag},(err,user) => {
      if(err || !user){
        resolve(0);
      }else {
        if(field === "state")
          resolve(user.state_id) 
        else if(field === "district"){
          resolve(user.district_id)
        }
        else if(field === "date"){
          resolve(user.date)
        }
        else if(field === "age"){
          resolve(user.age)
        }
        else{
          resolve(user)
        }
      }
    })
    ,(error)=> reject(error);
  })
}




client.on("message",async(message) => {
  if(message.author.bot)
    return;
  if(message.content === "hello"){
    message.reply("Hello there")
  }
  if(message.content.startsWith(PREFIX)){
    const [CMD_NAME,arguments] = message.content
    .trim()
    .substring(PREFIX.length)
    .split(/\s(.+)?/,2);
    if(CMD_NAME === "startz"){
       /* stateData.map(items=>{
            message.channel.send(items.state_name)
        })*/
        //console.log(client.users)
        //message.author.send("Your message here.")
      message.channel.send("Enter your state name in format '$state statename'")
      
    }
    else if(CMD_NAME === "state"){
      //resultObject = search(arguments, stateData);
      result = stateData.find(({state_name}) => state_name.toUpperCase() === arguments.toUpperCase());
      
      if(!result){
        const embed_error = new MessageEmbed()
        .setColor('#FB2A2A')
        .setFooter(`Invalid state name.Please try again.`)
        message.channel.send(`${message.member}`, {
          embed: embed_error,
         })
        return
      }
      createUser(message.author.tag,message.author.id,result.state_id,null);

      const district = await fetchDistricts(result.state_id);
      districtData= district.districts
      var districtsMessage = "" 
      districtData.map(items=>{
        districtsMessage+=" |`"+items.district_name+"`|"
      })
      districtsMessage+="\nEnter your district name in format '$district districtname'"
      const embed = new MessageEmbed()
        .setColor('#DAF7A6')
        .addField(`${arguments}`,`${districtsMessage}`)
        message.channel.send(`${message.member}`, {
          embed: embed,
         });
      
    }
    else if(CMD_NAME === "district"){
      state_id = await findData(message.author.tag ,"state")
      if(!state_id){
        const embed_error = new MessageEmbed()
        .setColor('#FB2A2A')
        .setFooter(`Enter your state first`)
        message.channel.send(`${message.member}`, {
          embed: embed_error,
         })
        return
      }
      const district = await fetchDistricts(state_id);
      districtData= district.districts
      result = districtData.find(x => (x.district_name).toUpperCase() === arguments.toUpperCase());
      if(!result){
        const embed_error = new MessageEmbed()
        .setColor('#FB2A2A')
        .setFooter(`Invalid district name`)
        message.channel.send(`${message.member}`, {
          embed: embed_error,
         })
        return;
      }
      createUser(message.author.tag,"",false,result.district_id)
      const embed = new MessageEmbed()
        .setColor('#DAF7A6')
        .setFooter(`Enter your age in format '$age your_age'`)
        message.channel.send(`${message.member}`, {
          embed: embed,
         })
    }
    else if(CMD_NAME === "age") {
      district_id = await findData(message.author.tag,"district")
      //console.log(arguments)
      if(!district_id){
        const embed_error = new MessageEmbed()
        .setColor('#FB2A2A')
        .setFooter(`Enter your district first`)
        message.channel.send(`${message.member}`, {
          embed: embed_error,
         })
        //message.reply("Enter your preferred date first")
        return
      }
      User.findOneAndUpdate({tag: message.author.tag},{age: arguments},{new: true},(err,user) => {
        if(err){
          console.log("Error saving age")
        } 
        else{
          console.log(user)
        }
      });
      const embed = new MessageEmbed()
      .setColor('#DAF7A6')
      .setFooter(`Enter your preferred date in format '$date 09-03-2021'`)
      message.channel.send(`${message.member}`, {
        embed: embed,
       })
    }
    else if(CMD_NAME === "date"){
      var {district_id,user_id,age} = await findData(message.author.tag,"user")
      
      if(!age){
        const embed_error = new MessageEmbed()
        .setColor('#FB2A2A')
        .setFooter(`Enter your age first`)
        message.channel.send(`${message.member}`, {
          embed: embed_error,
         })
        //message.reply("Enter your district first")
        return
      }
      const slot = await fetchSlots(district_id,arguments);
      slotMessage = ""
      slotData = slot.sessions.filter((item) => (item.min_age_limit<=age && item.available_capacity!=0))
      //console.log(slotData) 
      flag =false
      if(slotData.length){
        slotData.map((items)=>{
          var fee = "free"
          if(items.fee !="0") fee = `paid(Rs.${items.fee})`
          slotMessage +=" 🔸" +items.name +" ▶ " +items.vaccine +" ▶ "+fee+" ▶"+" Slots Available->" +items.available_capacity +"\n";
          
        })
        flag =true
      }
      else{
        slotMessage = "No slot available"
      } 
      notify_Message = "\nEnter '$notify' for daily update or '$notify dd-mm-yyyy' to get slot availability notifications for a particular date"  
      //message.reply(slotMessage) 
      var fieldTitle = "😕"
      //console.log(slotMessage.length)
      const chunk = (arr, size) => arr.reduce((acc, e, i) => (i % size ? acc[acc.length - 1].push(e) : acc.push([e]), acc), []);
      if(flag){
        fieldTitle=`Available Slots  - 📅${arguments}`
        var footer_message = "" 
        var slotMessage1 = chunk(slotMessage.split("\n"),8)

        slotMessage1.map((items,i)=>{
          var slotMessage2 ="```"
          slotMessage2+= items.join("\n") +"```"
          if(slotMessage1.length === i+1){
            slotMessage2+="\nBook vaccine https://selfregistration.cowin.gov.in/"
            footer_message =notify_Message
          }
          if( i ===1){
            fieldTitle="⏬"
          }
          const embed = new MessageEmbed() 
          .setColor('#DAF7A6')
          .addField(`${fieldTitle}`,`${slotMessage2}`)
          .setFooter(`${footer_message}`)
        //console.log((embed))
           message.channel.send(`<@${user_id}>`,{embed:embed});
        })
      }
      else{
        const embed = new MessageEmbed()
        .setColor('#FFC83D')
        .addField(`${fieldTitle}`,`${slotMessage}`)
        .setFooter(`${notify_Message}`)
        //console.log((embed))
        message.channel.send(`<@${user_id}>`,{embed:embed});
      }
      /*if(slotMessage.length/2 > 1000){
          var slotMessage1 = slotMessage.split("\n")
          console.log(slotMessage1)
          const split_index =slotMessage1.length
          if(split_index % 2 !=0){
            slotMessage1.push("")
            split_index+=1
          }
          var  slotMessage2= slotMessage1.slice(split_index/2,split_index) ;
          slotMessage1= slotMessage1.slice(0,split_index/2) ;
          slotMessage1_text = slotMessage1.join("\n") + "```"
          slotMessage2_text ="```" + slotMessage2.join("\n")
        const embed1 = new MessageEmbed()
        .setColor('#DAF7A6')
        .addField(`${fieldTitle}`,`${slotMessage1_text}`)
        const embed2 = new MessageEmbed()
        .setColor('#DAF7A6')
        .addField(`${fieldTitle}`,`${slotMessage2_text}`)
        .setFooter(`${notify_Message}`)
        //console.log((embed))
        message.channel.send( embed1);
        message.channel.send( embed2);

      }*/
      
    }else if(CMD_NAME === "notify"){
      
      var {district_id,state_id,user_id,age} = await findData(message.author.tag,"user")
      //console.log(district_id,state_id,age,date)
      if(!district_id || !state_id || !age){
        var alert = "You haven't given all the required details yet. Begin by entering your statename in the format '$state statename' "
        const embed = new MessageEmbed()
        .setColor('#F03A17')
        .addField("❗❗❗",`${alert}`)
        //console.log((embed))
        message.channel.send(`<@${message.author.id}>`,{embed:embed});
        //message.reply("")
        return;
      }
      /*if(!date || date===undefined){
          if(!age){
            if(!district_id){
              if(!state_id){
                const embed_error = new MessageEmbed()
                .setColor('#FB2A2A')
                .setTitle(`Enter state first in the format '$state state_name`) 
                message.channel.send(`${message.member}`, {
                  embed: embed_error,
                })
                return
              }
              else{
                const embed_error = new MessageEmbed()
                .setColor('#FB2A2A')
                .setTitle(`Enter district first in the format '$district district_name'`)
                message.channel.send(`${message.member}`, {
                  embed: embed_error,
                })
                return
              }
            }
            else{
              const embed_error = new MessageEmbed()
              .setColor('#FB2A2A')
              .setTitle(`Enter date first in the format '$date 09-03-2021'`)
              message.channel.send(`${message.member}`, {
                embed: embed_error,
              })
              return
            }
          }
          else{
            const embed_error = new MessageEmbed()
            .setColor('#FB2A2A')
            .setTitle(`Enter yor age first in the format '$age your_age'`)
            message.channel.send(`${message.member}`, {
              embed: embed_error,
            })
           return
          }
          console.log("no date")
        
      }
      else{
        //console.log("date added already")
        console.log("adding date......")
        
      }*/
      
      addData(message.author.tag,true,district_id,age,arguments,!arguments);
        /*User.findOneAndUpdate({tag: message.author.tag},{notify: true,notify_district_id:district_id,notify_age:age},(err,user) => {
          if(err){
            console.log("Error notify")
          }
        });*/
        check = await findData(message.author.tag,"notify")
        const embed = new MessageEmbed()
        .setColor('#DAF7A6')
        .setTitle(`We'll check for slots every hour and notify you if available :raised_hands: \nEnter $unsubscribe anytime to stop updates`)
        message.channel.send(`${message.member}`, {
          embed: embed,
         })
      
    }else if(CMD_NAME === "unsubscribe"){
      User.findOneAndUpdate({tag: message.author.tag},{notify:false,daily_notify: false},(err,user) => {
        if(err){
          console.log("Error while unsubscribing")
        }
      });
      //to stop cron job
      //hourlyTask.stop();
      const embed = new MessageEmbed()
      .setColor('#DAF7A6')
      .setTitle(`Unsubscribed :thumbsup:`)
      message.channel.send(`${message.member}`, {
        embed: embed,
       })
      //message.reply("Unsubscribed :thumbsup:")
    }else{
      message.reply("Invalid command.")
    }
  }
})

client.login(process.env.DISCORD_BOT_TOKEN);

global.client = client;
global.findData = findData;
