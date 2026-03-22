/* XR URI Fragments spec (https://xrfragment.org)
 *
 * level0 sidecar files as per the XR URI Fragments spec
 * https://xrfragment.org/#sidecar%20files
 * 
 */

elation.require([], function() {

  elation.extend('janusweb.sidecarfile', class {
    constructor(object) {
      this.scene     = elation.engine.instances.default.systems.world.scene['world-3d'] 
      this._object   = object
      this.extension = /\.(gltf|glb|dae)$/
      this.extensionXRF = /\.xrf\./ 
      // https://xrfragment.org/#system%20folders
      const hideSystemFolder = (o) => { if(o.name[0] == '_') o.visible = false }

      if( room.url.match(this.extension) && this.isXRF(hideSystemFolder) ){
        this.load()
      }
    }

    isXRF(cb){
      // for XRF heuristics see https://xrfragment.org/#%F0%9F%93%9C%20level0%3A%20File
      let heuristic = room.url.match(this.extensionXRF) 
      this.scene.traverse( (o) => {
        if( o.userData?.href )  heuristic = true // has XRF hyperlink
        if( o.name[0] == '_' )  heuristic = true // has XRF system folder 
      })
      return heuristic
    }

    load(){ // https://xrfragment.org/#sidecar%20files
      const audio     = room.url.replace(this.extension,'.ogg') 
      const subtitles = room.url.replace(this.extension,'.vtt') 
      room.loadNewAsset("sound", {id:"xrf_audio", src:audio})
      room.createObject('sound',{
        id: "xrf_audio",
        js_id: "xrf_audio",
        loop:true,
        autoplay: false,
        pos: '0 0 0',
        rect: "-100 -100 100 100"
      })
      fetch( subtitles )
      .then( (res)  => res.text() ) 
      .then( (webvtt) => {
        this.subtitles = this.parseVTT(webvtt) 
      })
      .catch( () => false ) // no biggy (optional)
    }

    // naive webvtt parser
    parseVTT(text) {
      const WEBVTT_HEADER = /^WEBVTT/i;
      const TIME_LINE     = /^([0-9:.]+)\s+-->\s+([0-9:.]+)(?:\s+(.+))?$/;
      const WHO  = /^<v ([^>]+)>/

      const lines = text.split(/\r?\n/)
                        .map( (line) => line.trim() )
      const result = { type: "WEBVTT", items: [] };
      let i = 0;

      // Skip the WEBVTT header line
      if (WEBVTT_HEADER.test(lines[i].trim())) i++
      while (i < lines.length) {
        if ( lines[i] === "") { i++; continue; } // Skip empty lines
        // Match cue timing line
        const timeMatch = lines[i].match(TIME_LINE);
        if (timeMatch) {
          const item = {
            start: {str:timeMatch[1], ts: this.vttToMilliseconds(timeMatch[1]) },
            stop:  {str:timeMatch[2], ts: this.vttToMilliseconds(timeMatch[2]) },
            who: false,
            text: ""
          };
          i++;
          const speakerMatch = lines[i]?.match(WHO);
          if (speakerMatch) { 
            item.who = speakerMatch[1]; 
            lines[i] = lines[i].replace(WHO,''); 
          }
          // Collect all text lines until next empty line
          while (i < lines.length && lines[i].trim() !== "") {
            item.text += (item.text ? "\n" : "") + lines[i].trim();
            i++;
          }

          result.items.push(item);
        } else { i++; }
      }
      return result;
    }

    vttToMilliseconds(vttString){
      const parts = vttString.split(':');
      let hours = 0, minutes = 0, secondsWithMs;
      if (parts.length === 3) { [hours, minutes, secondsWithMs] = parts; }
      else { [minutes, secondsWithMs] = parts; } // Format is MM:SS.mmm
      const [seconds, milliseconds] = secondsWithMs.split('.');
      return (
        (parseInt(hours) * 3600000) +
        (parseInt(minutes) * 60000) +
        (parseInt(seconds) * 1000) +
        parseInt(milliseconds || 0)
      );
    }

  })
});

xrf_install_sidecarfiles = function(){
 if( !room.sidecarfile ){ 
   room.sidecarfile = new elation.janusweb.sidecarfile(room);
 }
}

elation.events.add(null, 'room_load_complete', xrf_install_sidecarfiles )
elation.events.add(null, 'sound_enabled', function(){
  //room.objects.xrf_audio.play()
})
xrf_install_sidecarfiles()
