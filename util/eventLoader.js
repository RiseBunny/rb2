const reqEvent = (event) => require(`../events/${event}`);
module.exports = client => {
  client.once('clientReady', () => {
    try {
      reqEvent('ready')(client);
    } catch (error) {
      console.error('Ready event hatası:', error);
    }
  });
  client.on('messageCreate', message => {
    Promise.resolve(reqEvent('message')(message)).catch(error => {
      console.error('Mesaj/komut hatası:', error);
    });
  });
  client.on('interactionCreate', interaction => {
    Promise.resolve(reqEvent('interactionCreate')(interaction)).catch(error => {
      console.error('Interaction hatası:', error);
    });
  });
};
