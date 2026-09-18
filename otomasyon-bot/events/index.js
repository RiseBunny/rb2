/**
 * Events Modülü - Tüm event'lerin merkezi export noktası
 */

const messageCreate = require("./messageCreate");
const interactionCreate = require("./interactionCreate");
const guildMemberAdd = require("./guildMemberAdd");

module.exports = {
  messageCreate,
  interactionCreate,
  guildMemberAdd
};