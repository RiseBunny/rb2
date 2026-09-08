const { getLangSync, t } = require("../dil");
exports.run = async (client, msg, args) => {
  const lang = getLangSync(msg.author.id);
  const EN = lang === "en";
  const kapakTR = [
      "Yalanım yok ki benim, aklımdasın hala. Ne yapayım güzelim gereksiz şeyleri kafa hep takıyorum.",
      "A101'de satılan 25 kuruşluk çikolatanın tadını bile veremeyen insanlar var. Öyle gereksizler... ",
      "Bazı insanların da aynı televizyon gibi tepesine vurulduğunda düzelmesi en büyük temennimdir.",
      "Kimine göre kral, kimine göre yalanım... Unutmayın beyler adamına göre adamım... ",
      "Bazı kişiler dümen çevirmek olunca kaptan olmak için sıraya giriyor.",
      "Içinden geldiği için bizimle olanları, işinden geldiği için bizimle olanlara değiştik. Yanlış ettik.",
      "Canımı yakacak kadar güçlü olanın sonuçlarına katlanacak kadar gücü olmalı.",
      "Eğer ben güneş isem sen aysın. Benim doğduğum yerde sen batarsın.",
      "Bana laf cambazlığı yapma kızım, bir laf sokarım kürtajla bile aldıramazsın.",
      "Terk etmek kolaysa senin için, el sallamakta hiç zor olmaz benim için.",
      "Insanlığa davet etsek yol tarifi isteyecek insanlar var.",
      "Senin etiketinin olduğu yer fiyatı ben koyarım.",
      "Balonlar, içi boş şeylerin de bazen yükselebileceğini hatırlatır.",
      "Bazı insanları sarımsaklasak da mı saklasak, yoksa boğup da rahatlasak mı?",
      "Laf sokma, kapak olursun. Yalvarma, köpek olursun. Delikanlı ol, belki yanımda yer bulursun.",
      "Laf Sokarim Derinden Gotun Oynar Yerinden",
      "Her gün resmine bakmadan duramıyorum. –İlla TÜKÜRECEĞİM!",
      "Kapak Olana Kapak Laf Sokamam :(",
      "Top Topu Çeker Dediğinde İnanmamıştım .. Doğruymuş Ama",
       "Laf dedi oldu kapak, söz söyledi oldu tencereye kapak.",
       "Çok talibim var diyenler; Sevinmeyin! Ucuz malın alıcısı çoktur.",
       "Etme sırtını duvardan başkasına emanet. En kralının bile içinde vardır bir nebze ihanet.",
       "İnsanlar da fotoğraf gibi; ne kadar büyütürsen, o  düşüyor kalitesi.",
       "Sana biraz adam ol diyeceğim seni de zor durumda bırakmak istemiyorum.",
       "Uzak dur çek elini benden, senin gibi seviyesizleri çok geride bıraktım ben.",
       "Bana şiir yaz diyorsun hoş güzel de, peki sen kaç harf edersin.",
       "2 dakika adam ol desem kaç dakikam kaldı diye soracak insansın",
       "Laf sokarım derinden aklın oynar yerinden.",
       "Ben sana ilaç olurum da, sen benim yan etkilerime dayanamazsın.",
       "Karabiber Ayran Koyumda Yaylan",
       "Senden Bir Kaşık Cacık Bile Olmazki Adam Olucaksın",
       "Sana Laf Sokmucam Şanslısın :) ",
       "Senin zirven benim zeminim! ",
       "Sen vurursun bela okurlar. Biz vururuz sala okurlar.",
       "Sen Vurursun Dikiş Atarlar Ben Vururum ** Toprak Atarlar **",
       "Yaklaşma toz olursun geçme pişman olursun.",
       "Uzaktan kusursuz, yakından lüzumsuz insanlar tanıdım.",
       "Senin artistlik yaptığın yerde bana yönetmenlik düşer.",
       "bir şey bilmene gerek yok haddini bil yeter.",
       "Beni eleştireceğine, git beynini geliştir!",
       "Tipinizin gideri var ama karakterinizin ederi yok.",
       "Matematikte bir konu olsan “Boş Küme” olursun. Havan kime ?",
       "52 ekran televizyon kadar kafan var ama küçük düğmesi kadar beynin yok.",
       "Konu adamlığa geldi, sen git istersen!",
    ];
    const kapakEN = [
       "I'd roast you, but my mom said I'm not allowed to burn trash.",
       "You're the reason shampoo has instructions.",
       "If I wanted to hear from you, I'd read the comments section.",
       "You're proof that even mistakes can be consistent.",
       "I'd agree with you, but then we'd both be wrong.",
       "Your secrets are safe with me. I never even listen when you talk.",
       "You're like a cloud — when you leave, the day gets better.",
       "I'd call you a tool, but tools are actually useful.",
       "You have something on your chin... no wait, that's just your third one.",
       "If brains were dynamite, you wouldn't have enough to blow your nose.",
       "You're the human version of a participation trophy.",
       "I would roast you harder, but I'm afraid the Wi-Fi can't handle that much burn.",
       "You're so slow, you could lose a race against a calendar.",
       "Mirrors can't talk — lucky for you, they can't laugh either.",
       "You bring everyone joy... when you leave the room.",
       "I'd explain it to you, but I left my crayons at home.",
    ];
    const kapak = EN ? kapakEN : kapakTR;
       let member = msg.mentions.members.first()
     if(!member)return msg.channel.send({embed: {
   color: Math.floor(Math.random() * (0xFFFFFF + 1)),
   description: ((lang === "en" ? ' Who Am I Supposed To Roast?' : ' Ya Kime Kapak Laf Soyluyecem?'))
  }});
    else{
    msg.channel.send({embed: {
   color: Math.floor(Math.random() * (0xFFFFFF + 1)),
    description: (`${kapak[Math.floor(Math.random() * kapak.length)]}.`)
     }})
    }
    
  }
  
  exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
   };
   
  exports.help = {
    name: 'lafat',
    description: 'Etiketlediniz Kisiye Kapak Laflar Soler.',
    usage: 'lafat'
  }