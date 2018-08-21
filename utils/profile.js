const fs = require('fs');

const saveAvatar = (avatar, id, onSucess, onError) => {
    if(avatar && avatar.startsWith('data:image')){
      const data = avatar.replace(/^data:image\/\w+;base64,/, '');
      const buffer = new Buffer(data, 'base64');
      const ext = avatar.split(';')[0].split('/')[1];
      const saveDir = `public/avatar/${id}`;
      const completePath = `${saveDir}/${Date.now()}.${ext}`;
  
      if(!fs.existsSync(saveDir)){
        fs.mkdirSync(saveDir); 
      }
  
      try{
        fs.writeFileSync(completePath, buffer);
        onSucess(completePath)
      } catch(err) {
        fs.unlinkSync(completePath);
        onError(err);
      }
    }
  }

  module.exports = {saveAvatar}