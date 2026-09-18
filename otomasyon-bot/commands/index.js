/**
 * Commands Modülü - Tüm komutların merkezi export noktası
 */

const otomasyon = require("./otomasyon");
const yardim = require("./yardim");
const ping = require("./ping");

module.exports = {
  otomasyon,
  yardim,
  ping
};