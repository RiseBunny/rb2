/**
 * Handlers Modülü - Tüm handler'ların merkezi export noktası
 */

const SetupHandler = require("./setup");
const TrainingHandler = require("./training");
const TicketHandler = require("./ticket");
const CommunityHandler = require("./community");
const RiseHandler = require("./riseHandler");

module.exports = {
  SetupHandler,
  TrainingHandler,
  TicketHandler,
  CommunityHandler,
  RiseHandler
};