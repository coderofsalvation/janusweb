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

      if( room.url.match(this.extension) && this.isXRF(this.hideSystemFolder) ){
        this.loadSound()  // https://xrfragment.org/#sidecar%20files
        this.loadWebVTT() // https://xrfragment.org/#sidecar%20files
        this.initStartButton()
        this.initSubtitle()
      }
    }

    hideSystemFolder(o){
      // https://xrfragment.org/#system%20folders
      if(o.name[0] == '_') o.visible = false
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

    loadSound(){ // https://xrfragment.org/#sidecar%20files
      const audio     = room.url.replace(this.extension,'.ogg') 
      room.loadNewAsset("sound", {id:"xrf_audio", src:audio})
      this.sound = room.createObject('sound',{ id: "xrf_audio", js_id: 'xrf_audio' })
    }

    loadWebVTT(){ // https://xrfragment.org/#sidecar%20files
      const webvtt = room.url.replace(this.extension,'.vtt') 
      fetch( webvtt )
      .then( (res)  => res.text() ) 
      .then( (webvtt) => {
        this.webvtt = this.parseWEBVTT(webvtt) 
      })
      .catch( () => false ) // no biggy (optional)
    }

    initStartButton(){
      this.btn = room.createObject('object',{
        id: 'cube',
        js_id: 'btnstart',
        pos: '0.09 3.3 4',
        scale: '2 0.5 0.2',
        col: '0.33 0.33 0.33',
        sync: true,
        billboard: 'y',
        collision_id: 'cube'
      })
      const label = this.btn.createObject('text',{
        text: 'Start experience',
        col: '1 1 1',
        pos: '0 -0.15 0.5',
        scale: '1.2 5 1.2',
      })
      this.btn.addEventListener('click', () => this.start() )
    }

    initSubtitle(){
      this.subtitle = room.createObject('paragraph',{
        js_id: 'subtitle',
        pos: '0 0.5 0',
        test: 'Lorem ipsum dolor sit amet',
        css: `.paragraphcontainer{ 
          background: transparent;
          height:100%; 
          width:100%; 
          padding:50px; 
          font-size:50px; 
          display:block;  
          color:black; 
        }`,
        text_col: '0.5 0.5 0.5',
        back_col: '1 1 1'
      })
    }

    start(){
      this.sound.pos = '0 0 0'
      this.sound.play()
      this.btn.visible = false
    }

    update(){
      if( this.sound?.playStarted && this.sound.audio?.context ){
        let time = this.audio.context.currentTime
      }
    }

    // naive webvtt parser
    parseWEBVTT(text) {
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
            start: {str:timeMatch[1], ts: this.vttToSeconds(timeMatch[1]) },
            stop:  {str:timeMatch[2], ts: this.vttToSeconds(timeMatch[2]) },
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

    vttToSeconds(vttString){
      const parts = vttString.split(':');
      let hours = 0, minutes = 0, secondsWithMs;
      if (parts.length === 3) { [hours, minutes, secondsWithMs] = parts; }
      else { [minutes, secondsWithMs] = parts; } // Format is MM:SS.mmm
      const [seconds, milliseconds] = secondsWithMs.split('.');
      return (
        (parseInt(hours) * 3600) +
        (parseInt(minutes) * 60) +
        (parseInt(seconds) * 1) +
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
elation.events.add(null, 'janusweb_script_frame', function(){
  if( room?.sidecarfile ) room.sidecarfile.update()
})
xrf_install_sidecarfiles()
